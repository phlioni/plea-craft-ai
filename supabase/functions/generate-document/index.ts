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

// Helper function to create a simple DOCX file
function createDocxBuffer(content: string): Uint8Array {
  // Create a minimal DOCX structure with proper XML
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${content.split('\n').map(paragraph => {
      if (paragraph.trim() === '') return '';
      
      // Handle bold text marked with **
      let processedParagraph = paragraph
        .replace(/\*\*(.*?)\*\*/g, '<w:r><w:rPr><w:b/></w:rPr><w:t>$1</w:t></w:r>')
        .replace(/^(.*)$/, '<w:r><w:t>$1</w:t></w:r>');
      
      return `<w:p><w:pPr><w:spacing w:after="200"/></w:pPr>${processedParagraph}</w:p>`;
    }).join('')}
  </w:body>
</w:document>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/docPropsApp">
  <Application>PleaCraft AI</Application>
  <DocSecurity>0</DocSecurity>
</Properties>`;

  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties">
  <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Petição Inicial</dc:title>
  <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">PleaCraft AI</dc:creator>
  <cp:lastModifiedBy>PleaCraft AI</cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xmlns:dcterms="http://purl.org/dc/terms/" xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xmlns:dcterms="http://purl.org/dc/terms/" xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  // Create ZIP structure manually
  const files = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: 'docProps/app.xml', content: appXml },
    { name: 'docProps/core.xml', content: coreXml },
    { name: 'word/document.xml', content: documentXml },
    { name: 'word/_rels/document.xml.rels', content: wordRelsXml }
  ];

  // Simple ZIP creation (minimal implementation)
  const encoder = new TextEncoder();
  const zipData: number[] = [];
  
  // ZIP local file header signature
  const localFileHeader = [0x50, 0x4b, 0x03, 0x04];
  
  let centralDirectory: number[] = [];
  let offset = 0;
  
  for (const file of files) {
    const fileData = encoder.encode(file.content);
    const fileName = encoder.encode(file.name);
    
    // Local file header
    zipData.push(...localFileHeader);
    zipData.push(0x14, 0x00); // Version needed to extract
    zipData.push(0x00, 0x00); // General purpose bit flag
    zipData.push(0x00, 0x00); // Compression method (stored)
    zipData.push(0x00, 0x00, 0x00, 0x00); // File last modification time & date
    zipData.push(0x00, 0x00, 0x00, 0x00); // CRC-32
    
    // File sizes (little-endian)
    const size = fileData.length;
    zipData.push(size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff);
    zipData.push(size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff);
    
    // File name length
    zipData.push(fileName.length & 0xff, (fileName.length >> 8) & 0xff);
    zipData.push(0x00, 0x00); // Extra field length
    
    // File name
    zipData.push(...fileName);
    
    // File data
    zipData.push(...fileData);
    
    // Save info for central directory
    centralDirectory.push(...[0x50, 0x4b, 0x01, 0x02]); // Central directory signature
    centralDirectory.push(0x14, 0x00); // Version made by
    centralDirectory.push(0x14, 0x00); // Version needed to extract
    centralDirectory.push(0x00, 0x00); // General purpose bit flag
    centralDirectory.push(0x00, 0x00); // Compression method
    centralDirectory.push(0x00, 0x00, 0x00, 0x00); // File last modification time & date
    centralDirectory.push(0x00, 0x00, 0x00, 0x00); // CRC-32
    centralDirectory.push(size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff);
    centralDirectory.push(size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff);
    centralDirectory.push(fileName.length & 0xff, (fileName.length >> 8) & 0xff);
    centralDirectory.push(0x00, 0x00); // Extra field length
    centralDirectory.push(0x00, 0x00); // Comment length
    centralDirectory.push(0x00, 0x00); // Disk number start
    centralDirectory.push(0x00, 0x00); // Internal file attributes
    centralDirectory.push(0x00, 0x00, 0x00, 0x00); // External file attributes
    centralDirectory.push(offset & 0xff, (offset >> 8) & 0xff, (offset >> 16) & 0xff, (offset >> 24) & 0xff);
    centralDirectory.push(...fileName);
    
    offset = zipData.length;
  }
  
  const centralDirStart = zipData.length;
  zipData.push(...centralDirectory);
  const centralDirSize = centralDirectory.length;
  
  // End of central directory
  zipData.push(0x50, 0x4b, 0x05, 0x06); // End of central directory signature
  zipData.push(0x00, 0x00); // Number of this disk
  zipData.push(0x00, 0x00); // Disk where central directory starts
  zipData.push(files.length & 0xff, (files.length >> 8) & 0xff); // Number of central directory records on this disk
  zipData.push(files.length & 0xff, (files.length >> 8) & 0xff); // Total number of central directory records
  zipData.push(centralDirSize & 0xff, (centralDirSize >> 8) & 0xff, (centralDirSize >> 16) & 0xff, (centralDirSize >> 24) & 0xff);
  zipData.push(centralDirStart & 0xff, (centralDirStart >> 8) & 0xff, (centralDirStart >> 16) & 0xff, (centralDirStart >> 24) & 0xff);
  zipData.push(0x00, 0x00); // Comment length
  
  return new Uint8Array(zipData);
}

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

    // Create a proper DOCX file
    const docxBuffer = createDocxBuffer(generatedText);

    // Upload the document to Supabase Storage  
    const fileName = `${user.id}/${legalCase.id}/peticao_inicial.docx`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('generated-documents')
      .upload(fileName, docxBuffer, { 
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

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