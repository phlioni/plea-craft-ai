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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{caseItem.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-4 mt-2">
                <span>Processo: {caseItem.case_number}</span>
                <span>•</span>
                <span>Tipo: {caseItem.document_type}</span>
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {caseItem.generated_document_url && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Título do Processo</Label>
                <Input
                  id="title"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="Digite o título do processo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="party_names">Partes Envolvidas</Label>
                <Input
                  id="party_names"
                  value={editData.party_names}
                  onChange={(e) => setEditData({ ...editData, party_names: e.target.value })}
                  placeholder="Ex: João Silva vs. Empresa XYZ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Descreva brevemente o caso"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_content">Conteúdo do Documento</Label>
                <Textarea
                  id="document_content"
                  value={editData.document_content}
                  onChange={(e) => setEditData({ ...editData, document_content: e.target.value })}
                  placeholder="Conteúdo do documento jurídico"
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
            </>
          ) : (
            <>
              {caseItem.party_names && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Partes Envolvidas</h4>
                  <p className="text-sm">{caseItem.party_names}</p>
                </div>
              )}

              {caseItem.description && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Descrição</h4>
                  <p className="text-sm">{caseItem.description}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Conteúdo do Documento</h4>
                <div className="border rounded-lg p-4 bg-muted/50 max-h-96 overflow-y-auto">
                  {isLoadingContent ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm text-muted-foreground">Carregando conteúdo...</span>
                    </div>
                  ) : caseItem.document_content ? (
                    <pre className="text-sm whitespace-pre-wrap font-mono">{caseItem.document_content}</pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Conteúdo não disponível. Use o botão "Editar" para adicionar o conteúdo do documento.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentModal;