import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Document, Packer, Paragraph, TextRun } from "https://esm.sh/docx@8.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "", 
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// 🔹 Corrige problemas de encoding UTF-8
function fixEncoding(str: string): string {
  try {
    return new TextDecoder("utf-8").decode(new TextEncoder().encode(str));
  } catch {
    return str;
  }
}

/**
 * Cria um buffer de documento DOCX a partir do texto gerado.
 * @param content Texto do documento
 */
async function createDocxBuffer(content: string): Promise<ArrayBuffer> {
  const safeContent = fixEncoding(content);
  
  const paragraphs = safeContent.split("\n").map((line) => 
    new Paragraph({
      children: [
        new TextRun({
          text: line.trim(),
          font: "Times New Roman",
          size: 24 // 12pt
        })
      ]
    })
  );

  const doc = new Document({
    sections: [{
      children: paragraphs
    }]
  });

  return await Packer.toBuffer(doc);
}
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Autenticação
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) throw new Error("Cabeçalho de autorização não encontrado.");

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error(`Autenticação falhou: ${authError?.message}`);
    }

    // Entrada - suporta regeneração e criação
    const { caseData, factsNarrative, caseId, regenerate } = await req.json();

    let currentCase;

    if (regenerate && caseId) {
      // Modo regeneração - buscar caso existente
      const { data: existingCase, error: fetchError } = await supabase
        .from("legal_cases")
        .select("*")
        .eq("id", caseId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !existingCase) {
        throw new Error("Caso não encontrado ou sem permissão de acesso");
      }

      currentCase = existingCase;
      
      // Atualizar status para processando
      await supabase.from("legal_cases")
        .update({ status: "processing" })
        .eq("id", caseId);

    } else {
      // Modo criação - criar novo caso
      const { data: newCase, error: caseError } = await supabase
        .from("legal_cases")
        .insert({
          user_id: user.id,
          document_type: "Petição Inicial Juizado Especial Cível",
          case_data: caseData,
          facts_narrative: factsNarrative,
          status: "processing"
        })
        .select()
        .single();

      if (caseError) throw caseError;
      currentCase = newCase;
    }

    // Usar dados do caso (novo ou existente)
    const caseInfo = currentCase.case_data;
    const narrative = currentCase.facts_narrative;

    // Monta prompt para IA
    const prompt = `Você é um assistente jurídico especializado em redigir petições iniciais para o Juizado Especial Cível brasileiro. 

Com base nas informações fornecidas abaixo, redija uma petição inicial profissional e bem estruturada:

**DADOS DO REQUERENTE (AUTOR):**
- Nome: ${caseInfo.authorName || caseInfo.nomeCompleto}
- CPF: ${caseInfo.authorCpf || caseInfo.cpf}
- Endereço: ${caseInfo.authorAddress || caseInfo.endereco}
- Email: ${caseInfo.authorEmail || caseInfo.email}
- Telefone: ${caseInfo.authorPhone || caseInfo.telefone}

**DADOS DO REQUERIDO (RÉU):**
- Nome/Razão Social: ${caseInfo.defendantName || caseInfo.nomeReu}
${(caseInfo.defendantDocument || caseInfo.cpfReu) ? `- CPF/CNPJ: ${caseInfo.defendantDocument || caseInfo.cpfReu}` : ""}
${(caseInfo.defendantAddress || caseInfo.enderecoReu) ? `- Endereço: ${caseInfo.defendantAddress || caseInfo.enderecoReu}` : ""}

**RELATO DOS FATOS:**
${narrative || caseInfo.fatos}

**INSTRUÇÕES PARA A REDAÇÃO:**
1. Utilize linguagem jurídica adequada mas acessível
2. Estruture a petição com: Excelentíssimo Juiz, Qualificação das partes, Dos Fatos, Do Direito, Dos Pedidos, Valor da causa, Das Provas, Termos em que pede e espera deferimento
3. Cite a legislação brasileira aplicável quando apropriado
4. Seja preciso nos pedidos e fundamentação
5. Mantenha o tom respeitoso e formal
6. Inclua pedidos de tutela adequados ao caso
7. O documento deve estar pronto para ser protocolado no Juizado Especial Cível
8. Use acentuação correta e caracteres especiais brasileiros

Redija a petição inicial completa e bem fundamentada:`;

    // Chamada ao OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em direito brasileiro com foco em Juizados Especiais Cíveis. Redija documentos jurídicos profissionais e bem fundamentados usando acentuação correta e caracteres especiais do português brasileiro."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const openaiData = await response.json();
    const generatedContent = openaiData.choices[0].message.content;

    // Gera o documento DOCX com encoding correto
    const docxBuffer = await createDocxBuffer(generatedContent);

    // Salva no storage com UTF-8
    const fileName = `${user.id}/${currentCase.id}/peticao_inicial_${Date.now()}.docx`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(fileName, docxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=utf-8",
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Atualiza status e metadados no banco
    const { error: updateError } = await supabase
      .from("legal_cases")
      .update({
        status: "completed",
        generated_document_url: uploadData.path,
        document_content: generatedContent,
        title: caseInfo.tipoDocumento || currentCase.title || "Petição Inicial - Juizado Especial Cível",
        party_names: `${caseInfo.authorName || caseInfo.nomeCompleto} vs. ${caseInfo.defendantName || caseInfo.nomeReu || 'Parte Contrária'}`,
        description: (narrative || caseInfo.fatos)?.substring(0, 200) + "..." || "Documento jurídico gerado automaticamente"
      })
      .eq("id", currentCase.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      case_id: currentCase.id,
      message: regenerate ? "Documento regenerado com sucesso em formato Word" : "Documento gerado com sucesso"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8"
      }
    });

  } catch (error) {
    console.error("Error in generate-document function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erro interno do servidor"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8"
      }
    });
  }
});
