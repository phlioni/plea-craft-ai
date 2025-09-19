-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create legal_cases table
CREATE TABLE public.legal_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'Petição Inicial Juizado Especial Cível',
  case_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  facts_narrative TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  generated_document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on legal_cases
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;

-- Create policies for legal_cases
CREATE POLICY "Users can view their own cases" 
ON public.legal_cases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cases" 
ON public.legal_cases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cases" 
ON public.legal_cases 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create uploaded_files table
CREATE TABLE public.uploaded_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on uploaded_files
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Create policies for uploaded_files
CREATE POLICY "Users can view files for their own cases" 
ON public.uploaded_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.legal_cases lc 
    WHERE lc.id = uploaded_files.case_id 
    AND lc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files for their own cases" 
ON public.uploaded_files 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.legal_cases lc 
    WHERE lc.id = uploaded_files.case_id 
    AND lc.user_id = auth.uid()
  )
);

-- Create trigger function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets for case files and generated documents
INSERT INTO storage.buckets (id, name, public) VALUES ('case-files', 'case-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-documents', 'generated-documents', false);

-- Create storage policies for case-files bucket
CREATE POLICY "Users can upload their own case files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'case-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own case files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'case-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policies for generated-documents bucket
CREATE POLICY "Users can view their own generated documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'generated-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "System can upload generated documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'generated-documents'
);