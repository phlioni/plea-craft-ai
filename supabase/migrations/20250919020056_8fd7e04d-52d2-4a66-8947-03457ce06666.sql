-- Adicionar novos campos para identificação e personalização dos processos
ALTER TABLE public.legal_cases 
ADD COLUMN title TEXT,
ADD COLUMN case_number TEXT,
ADD COLUMN description TEXT,
ADD COLUMN party_names TEXT,
ADD COLUMN document_content TEXT;

-- Atualizar casos existentes com dados padrão
UPDATE public.legal_cases 
SET 
  title = CASE 
    WHEN document_type = 'Petição Inicial' THEN 'Ação Judicial - Processo #' || SUBSTRING(id::text, 1, 8)
    ELSE document_type || ' - Processo #' || SUBSTRING(id::text, 1, 8)
  END,
  case_number = 'PROC-' || SUBSTRING(id::text, 1, 8) || '-' || EXTRACT(YEAR FROM created_at)::text,
  description = 'Documento jurídico gerado automaticamente'
WHERE title IS NULL;