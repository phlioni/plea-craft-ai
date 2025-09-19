import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Document, Packer, Paragraph, TextRun } from "https://esm.sh/docx@8.0.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
// 🔹 Corrige problemas de encoding UTF-8 → Latin1
function fixEncoding(str) {
  try {
    return new TextDecoder("utf-8").decode(new TextEncoder().encode(str));
  } catch {
    return str;
  }
}
/**
 * Cria um buffer de documento DOCX a partir do texto gerado.
 * @param content Texto do documento
 */ async function createDocxBuffer(content) {
  const safeContent = fixEncoding(content);
  const paragraphs = safeContent.split("\n").map((line) => new Paragraph({
    children: [
      new TextRun({
        text: line.trim(),
        font: "Arial",
        size: 24
      })
    ]
  }));
  const doc = new Document({
    sections: [
      {
        children: paragraphs
      }
    ]
  });
  return await Packer.toBuffer(doc);
}
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // autenticação
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) throw new Error("Cabeçalho de autorização não encontrado.");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error(`Autenticação falhou: ${authError?.message}`);
    }
    // entrada
    const { caseData, factsNarrative } = await req.json();
    // salva o case no banco
    const { data: newCase, error: caseError } = await supabase.from("legal_cases").insert({
      user_id: user.id,
      document_type: "Petição Inicial Juizado Especial Cível",
      case_data: caseData,
      facts_narrative: factsNarrative,
      status: "processing"
    }).select().single();
    if (caseError) throw caseError;
    // monta prompt para IA
    const caseInfo = newCase.case_data;
    const narrative = newCase.facts_narrative;
    const prompt = `Você é um assistente jurídico especializado em redigir petições iniciais para o Juizado Especial Cível brasileiro. 

Com base nas informações fornecidas abaixo, redija uma petição inicial profissional e bem estruturada:

**DADOS DO REQUERENTE (AUTOR):**
- Nome: ${caseInfo.authorName}
- CPF: ${caseInfo.authorCpf}
- Endereço: ${caseInfo.authorAddress}
- Email: ${caseInfo.authorEmail}
- Telefone: ${caseInfo.authorPhone}

**DADOS DO REQUERIDO (RÉU):**
- Nome/Razão Social: ${caseInfo.defendantName}
${caseInfo.defendantDocument ? `- CPF/CNPJ: ${caseInfo.defendantDocument}` : ""}
${caseInfo.defendantAddress ? `- Endereço: ${caseInfo.defendantAddress}` : ""}

**RELATO DOS FATOS:**
${narrative}

**INSTRUÇÕES PARA A REDAÇÃO:**
1. Utilize linguagem jurídica adequada mas acessível
2. Estruture a petição com: Excelentíssimo Juiz, Qualificação das partes, Dos Fatos, Do Direito, Dos Pedidos, Valor da causa, Das Provas, Termos em que pede e espera deferimento
3. Cite a legislação brasileira aplicável quando apropriado
4. Seja preciso nos pedidos e fundamentação
5. Mantenha o tom respeitoso e formal
6. Inclua pedidos de tutela adequados ao caso
7. O documento deve estar pronto para ser protocolado no Juizado Especial Cível

Redija a petição inicial completa e bem fundamentada:`;
    // chamada ao OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em direito brasileiro com foco em Juizados Especiais Cíveis. Redija documentos jurídicos profissionais e bem fundamentados."
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
    const generatedText = openaiData.choices[0].message.content;
    // gera o docx
    const docxBuffer = await createDocxBuffer(generatedText);
    // salva no storage
    const fileName = `${user.id}/${newCase.id}/peticao_inicial.docx`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from("generated-documents").upload(fileName, docxBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true
    });
    if (uploadError) throw uploadError;
    // atualiza status no banco
    const { error: updateError } = await supabase.from("legal_cases").update({
      status: "completed",
      generated_document_url: uploadData.path
    }).eq("id", newCase.id);
    if (updateError) throw updateError;
    return new Response(JSON.stringify({
      success: true,
      case_id: newCase.id,
      message: "Documento gerado com sucesso"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
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
        "Content-Type": "application/json"
      }
    });
  }
});
