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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setProfile(data);
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

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus casos.",
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

  const handleDownload = async (documentUrl: string, caseId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('generated-documents')
        .download(documentUrl);

      if (error) throw error;

      const fileName = `peticao_inicial_${caseId}.rtf`;

      const blob = new Blob([data], { type: 'application/rtf' });
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

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">Meus Documentos Jurídicos</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Gerencie seus documentos jurídicos de forma simples e eficiente. Crie novas petições ou acompanhe o status dos documentos em andamento.
            </p>
          </div>

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
                    <p className="text-muted-foreground">Comece criando seu primeiro documento jurídico</p>
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
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium">{caseItem.document_type}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(caseItem.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {getStatusBadge(caseItem.status)}

                        {caseItem.status === 'completed' && caseItem.generated_document_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(caseItem.generated_document_url!, caseItem.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
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