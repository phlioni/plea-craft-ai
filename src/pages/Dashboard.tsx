import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Scale, Plus, FileText, Calendar, Download, LogOut, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LegalCase {
  id: string;
  document_type: string;
  status: string;
  created_at: string;
  generated_document_url?: string;
  case_data?: any;
  facts_narrative?: string;
}

interface Profile {
  id: string;
  full_name: string;
}

const Dashboard = () => {
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      await loadProfile();
      await loadCases();
    };

    checkAuthAndLoadData();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      } else if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadCases = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('legal_cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar seus casos.",
          variant: "destructive",
        });
      } else {
        setCases(data || []);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleRegenerate = async (caseId: string) => {
    try {
      // Find the case
      const caseToRegenerate = cases.find(c => c.id === caseId);
      if (!caseToRegenerate) {
        toast({
          title: "Erro",
          description: "Caso não encontrado.",
          variant: "destructive",
        });
        return;
      }

      // Show loading toast
      toast({
        title: "Regenerando Documento",
        description: "Convertendo para formato Word... Isso pode levar alguns segundos.",
      });

      // Call the generate-document function again with existing data
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: {
          caseData: caseToRegenerate.case_data,
          factsNarrative: caseToRegenerate.facts_narrative,
          files: [],
          regenerate: true,
          caseId: caseId
        },
      });

      if (error) {
        console.error('Error regenerating document:', error);
        toast({
          title: "Erro na Regeneração",
          description: "Não foi possível regenerar o documento.",
          variant: "destructive",
        });
        return;
      }

      // Refresh the cases list
      await loadCases();

      toast({
        title: "Documento Regenerado!",
        description: "O documento foi convertido para formato Word com sucesso.",
      });

    } catch (error) {
      console.error('Error regenerating document:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao regenerar o documento.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (documentUrl: string, caseId: string) => {
    try {
      // Download the document from Supabase storage
      const { data, error } = await supabase.storage
        .from('generated-documents')
        .download(documentUrl);

      if (error) {
        toast({
          title: "Erro no Download",
          description: "Não foi possível baixar o documento.",
          variant: "destructive",
        });
        return;
      }

      // Determine file extension based on URL
      const isDocx = documentUrl.endsWith('.docx');
      const isRtf = documentUrl.endsWith('.rtf');
      let extension = '.html';
      if (isDocx) extension = '.docx';
      else if (isRtf) extension = '.rtf';
      
      const fileName = `peticao_inicial_${caseId}${extension}`;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show appropriate message based on file type
      if (isDocx) {
        toast({
          title: "Download Concluído",
          description: "Documento Word baixado com sucesso! Agora você pode editá-lo diretamente no Microsoft Word.",
        });
      } else if (!isRtf && !isDocx) {
        toast({
          title: "Download Concluído",
          description: "Arquivo HTML baixado. Para melhor compatibilidade, novos documentos são gerados em formato Word (.docx).",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao baixar o documento.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const },
      processing: { label: "Processando", variant: "outline" as const },
      completed: { label: "Concluído", variant: "default" as const },
      error: { label: "Erro", variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-white shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-primary hover:text-primary-glow transition-colors">
              <Scale className="h-8 w-8" />
              <span className="text-xl font-bold">PleaCraft AI</span>
            </Link>
            
            <div className="flex items-center gap-4">
              {profile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{profile.full_name}</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              Meus Documentos Jurídicos
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Gerencie seus documentos jurídicos de forma simples e eficiente. 
              Crie novas petições ou acompanhe o status dos documentos em andamento.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex justify-center">
            <Button 
              variant="hero" 
              size="lg" 
              onClick={() => navigate('/new-case')}
              className="shadow-medium hover:shadow-strong transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              Criar Novo Documento
            </Button>
          </div>

          {/* Cases List */}
          <Card className="shadow-medium border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Histórico de Documentos
              </CardTitle>
              <CardDescription>
                Visualize e gerencie todos os seus documentos jurídicos criados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando seus documentos...</p>
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Nenhum documento criado ainda</h3>
                    <p className="text-muted-foreground">
                      Comece criando seu primeiro documento jurídico
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/new-case')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Documento
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium">{caseItem.document_type}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(caseItem.created_at), "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getStatusBadge(caseItem.status)}
                        
                        {caseItem.status === 'completed' && caseItem.generated_document_url && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(caseItem.generated_document_url!, caseItem.id)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            {caseItem.generated_document_url.endsWith('.html') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegenerate(caseItem.id)}
                                className="ml-2"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Regenerar em Word
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;