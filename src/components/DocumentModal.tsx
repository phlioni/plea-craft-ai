import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Save, X, Download } from "lucide-react";

interface LegalCase {
  id: string;
  title: string;
  case_number: string;
  document_type: string;
  status: string;
  created_at: string;
  description?: string;
  party_names?: string;
  document_content?: string;
  generated_document_url?: string;
}

interface DocumentModalProps {
  case: LegalCase | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const DocumentModal = ({ case: caseItem, isOpen, onClose, onUpdate }: DocumentModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    party_names: "",
    document_content: ""
  });
  const { toast } = useToast();

  const initializeEditData = () => {
    if (caseItem) {
      setEditData({
        title: caseItem.title || "",
        description: caseItem.description || "",
        party_names: caseItem.party_names || "",
        document_content: caseItem.document_content || ""
      });
    }
  };

  // Função para carregar conteúdo do arquivo se não estiver no banco
  const loadDocumentContent = async () => {
    if (!caseItem?.generated_document_url || caseItem.document_content) return;

    setIsLoadingContent(true);
    try {
      const { data, error } = await supabase.storage
        .from('generated-documents')
        .download(caseItem.generated_document_url);

      if (error) throw error;

      let content = "";
      
      // Se for arquivo HTML, extrair texto
      if (caseItem.generated_document_url.includes('.html')) {
        content = await data.text();
        // Remover tags HTML básicas para exibição
        content = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      } else if (caseItem.generated_document_url.includes('.rtf') || caseItem.generated_document_url.includes('.docx')) {
        // Para arquivos RTF/DOCX, mostrar mensagem informativa
        content = "Este documento foi gerado em formato " + 
                 (caseItem.generated_document_url.includes('.docx') ? "Word (.docx)" : "RTF") + 
                 ". Para visualizar o conteúdo completo, faça o download do arquivo.";
      }

      // Atualizar no banco de dados
      if (content) {
        await supabase
          .from('legal_cases')
          .update({ document_content: content })
          .eq('id', caseItem.id);

        // Atualizar o estado local
        if (caseItem) {
          caseItem.document_content = content;
        }
      }

    } catch (error) {
      console.error('Error loading document content:', error);
      toast({
        title: "Aviso",
        description: "Não foi possível carregar o conteúdo do documento. Utilize o download para acessar o arquivo completo.",
        variant: "default",
      });
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Carregar conteúdo quando o modal abrir
  useEffect(() => {
    if (isOpen && caseItem && !caseItem.document_content && caseItem.generated_document_url) {
      loadDocumentContent();
    }
  }, [isOpen, caseItem]);

  const handleEdit = () => {
    initializeEditData();
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!caseItem) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('legal_cases')
        .update({
          title: editData.title,
          description: editData.description,
          party_names: editData.party_names,
          document_content: editData.document_content
        })
        .eq('id', caseItem.id);

      if (error) throw error;

      toast({
        title: "Documento atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!caseItem?.generated_document_url) return;

    try {
      const { data, error } = await supabase.storage
        .from('generated-documents')
        .download(caseItem.generated_document_url);

      if (error) throw error;

      const caseNumber = caseItem.case_number || caseItem.id.substring(0, 8);
      const title = caseItem.title || 'Documento_Juridico';
      
      const fileExtension = caseItem.generated_document_url.includes('.docx') ? '.docx' : 
                          caseItem.generated_document_url.includes('.rtf') ? '.rtf' : '.html';
      
      const fileName = `${caseNumber}_${title.replace(/[^a-zA-Z0-9\-_]/g, '_')}${fileExtension}`;

      const mimeType = fileExtension === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                      fileExtension === '.rtf' ? 'application/rtf' : 'text/html';

      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Concluído",
        description: "Documento baixado com sucesso!",
      });

    } catch (error) {
      toast({
        title: "Erro no Download",
        description: "Não foi possível baixar o documento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!caseItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="space-y-4">
            <div>
              <DialogTitle className="text-lg sm:text-xl pr-2">{caseItem.title}</DialogTitle>
              <DialogDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm">
                <span>Processo: {caseItem.case_number}</span>
                <span className="hidden sm:inline">•</span>
                <span>Tipo: {caseItem.document_type}</span>
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {caseItem.generated_document_url && (
                <Button variant="outline" size="sm" onClick={handleDownload} className="flex-1 sm:flex-none">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              )}
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1 sm:flex-none">
                  <Edit className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none">
                    <X className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Cancelar</span>
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none">
                    <Save className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{isSaving ? "Salvando..." : "Salvar"}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Título do Processo</Label>
                <Input
                  id="title"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="Digite o título do processo"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="party_names" className="text-sm font-medium">Partes Envolvidas</Label>
                <Input
                  id="party_names"
                  value={editData.party_names}
                  onChange={(e) => setEditData({ ...editData, party_names: e.target.value })}
                  placeholder="Ex: João Silva vs. Empresa XYZ"
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Descrição</Label>
                <Textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Descreva brevemente o caso"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_content" className="text-sm font-medium">Conteúdo do Documento</Label>
                <Textarea
                  id="document_content"
                  value={editData.document_content}
                  onChange={(e) => setEditData({ ...editData, document_content: e.target.value })}
                  placeholder="Conteúdo do documento jurídico"
                  rows={12}
                  className="font-mono text-xs sm:text-sm resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {caseItem.party_names && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Partes Envolvidas</h4>
                  <p className="text-sm break-words">{caseItem.party_names}</p>
                </div>
              )}

              {caseItem.description && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Descrição</h4>
                  <p className="text-sm break-words">{caseItem.description}</p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Conteúdo do Documento</h4>
                <div className="border rounded-lg p-3 sm:p-4 bg-muted/50 max-h-[50vh] sm:max-h-96 overflow-y-auto">
                  {isLoadingContent ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="text-xs sm:text-sm text-muted-foreground text-center">Carregando conteúdo...</span>
                    </div>
                  ) : caseItem.document_content ? (
                    <pre className="text-xs sm:text-sm whitespace-pre-wrap font-mono break-words overflow-wrap-anywhere">
                      {caseItem.document_content}
                    </pre>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground italic text-center py-4">
                      Conteúdo não disponível. Use o botão "Editar" para adicionar o conteúdo do documento.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentModal;