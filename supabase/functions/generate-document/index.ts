import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  console.log('Generate document function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!authHeader) {
      throw new Error('No authorization header found');
    }

    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Authentication failed');
    }

    console.log('User authenticated:', user.id);

    // Parse request body
    const { caseData, factsNarrative, files } = await req.json();
    
    console.log('Request data received:', {
      hasCase: !!caseData,
      hasFacts: !!factsNarrative,
      fileCount: files?.length || 0
    });

    // Create legal case record
    const { data: legalCase, error: caseError } = await supabase
      .from('legal_cases')
      .insert({
        user_id: user.id,
        document_type: 'Petição Inicial Juizado Especial Cível',
        case_data: caseData,
        facts_narrative: factsNarrative,
        status: 'processing'
      })
      .select()
      .single();

    if (caseError) {
      console.error('Error creating legal case:', caseError);
      throw new Error('Failed to create legal case record');
    }

    console.log('Legal case created:', legalCase.id);

    // Prepare the prompt for OpenAI
    const prompt = `Você é um assistente jurídico especializado em redigir petições iniciais para o Juizado Especial Cível brasileiro. 

Com base nas informações fornecidas abaixo, redija uma petição inicial profissional e bem estruturada:

**DADOS DO REQUERENTE (AUTOR):**
- Nome: ${caseData.authorName}
- CPF: ${caseData.authorCpf}
- Endereço: ${caseData.authorAddress}
- Email: ${caseData.authorEmail}
- Telefone: ${caseData.authorPhone}

**DADOS DO REQUERIDO (RÉU):**
- Nome/Razão Social: ${caseData.defendantName}
${caseData.defendantDocument ? `- CPF/CNPJ: ${caseData.defendantDocument}` : ''}
${caseData.defendantAddress ? `- Endereço: ${caseData.defendantAddress}` : ''}

**RELATO DOS FATOS:**
${factsNarrative}

**INSTRUÇÕES PARA A REDAÇÃO:**
1. Utilize linguagem jurídica adequada mas acessível
2. Estruture a petição com: Excelentíssimo Juiz, Qualificação das partes, Dos Fatos, Do Direito, Dos Pedidos, Valor da causa, Das Provas, Termos em que pede e espera deferimento
3. Cite a legislação brasileira aplicável quando apropriado
4. Seja preciso nos pedidos e fundamentação
5. Mantenha o tom respeitoso e formal
6. Inclua pedidos de tutela adequados ao caso
7. O documento deve estar pronto para ser protocolado no Juizado Especial Cível

Redija a petição inicial completa e bem fundamentada:`;

    console.log('Calling OpenAI API...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em direito brasileiro com foco em Juizados Especiais Cíveis. Redija documentos jurídicos profissionais e bem fundamentados.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const openaiData = await response.json();
    const generatedText = openaiData.choices[0].message.content;

    console.log('OpenAI response received, length:', generatedText.length);

    // Create a simple Word document content
    const wordContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Petição Inicial</title>
    <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 2cm; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .underline { text-decoration: underline; }
        p { margin-bottom: 12pt; text-align: justify; }
        h1, h2, h3 { text-align: center; }
    </style>
</head>
<body>
${generatedText.replace(/\n/g, '</p><p>')}
</body>
</html>`;

    // Upload the document to Supabase Storage
    const fileName = `${user.id}/${legalCase.id}/peticao_inicial.html`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-documents')
      .upload(fileName, new Blob([wordContent], { type: 'text/html' }));

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error('Failed to upload document');
    }

    console.log('Document uploaded:', uploadData.path);

    // Update the legal case with the document URL
    const { error: updateError } = await supabase
      .from('legal_cases')
      .update({
        status: 'completed',
        generated_document_url: uploadData.path
      })
      .eq('id', legalCase.id);

    if (updateError) {
      console.error('Error updating legal case:', updateError);
      throw new Error('Failed to update legal case status');
    }

    console.log('Legal case updated to completed status');

    return new Response(
      JSON.stringify({
        success: true,
        case_id: legalCase.id,
        message: 'Documento gerado com sucesso'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-document function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});