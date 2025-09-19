import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Scale, Plus, FileText, Calendar, Download, LogOut, User, Search, Eye, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DocumentModal from "@/components/DocumentModal";

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

interface Profile {
  id: string;
  full_name: string;
}

const Dashboard = () => {
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<LegalCase[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
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
      const casesData = data || [];
      setCases(casesData);
      setFilteredCases(casesData);
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

  // Filtrar casos baseado no termo de pesquisa
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCases(cases);
    } else {
      const filtered = cases.filter(caseItem => 
        caseItem.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.document_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.party_names?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCases(filtered);
    }
  }, [searchTerm, cases]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleCaseClick = (caseItem: LegalCase) => {
    setSelectedCase(caseItem);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCase(null);
  };

  const handleCaseUpdate = () => {
    loadCases(); // Recarregar casos após atualização
  };

  const handleRegenerate = async (caseId: string) => {
    setRegeneratingIds(prev => new Set([...prev, caseId]));
    
    try {
      const { data: caseData } = await supabase
        .from('legal_cases')
        .select('case_data')
        .eq('id', caseId)
        .single();

      if (!caseData) throw new Error('Dados do caso não encontrados');

      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: { 
          caseId, 
          caseData: caseData.case_data,
          regenerate: true 
        }
      });

      if (error) throw error;

      toast({
        title: "Documento Regenerado",
        description: "Documento convertido para Word com sucesso!",
      });

      await loadCases();
    } catch (error) {
      console.error('Error regenerating document:', error);
      toast({
        title: "Erro na Regeneração",
        description: "Não foi possível regenerar o documento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRegeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(caseId);
        return newSet;
      });
    }
  };

  const handleDownload = async (documentUrl: string, caseId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('generated-documents')
        .download(documentUrl);

      if (error) throw error;

      // Buscar informações do caso para nome do arquivo
      const caseData = cases.find(c => c.id === caseId);
      const caseNumber = caseData?.case_number || caseId.substring(0, 8);
      const title = caseData?.title || 'Documento_Juridico';
      
      const fileExtension = documentUrl.includes('.docx') ? '.docx' : 
                          documentUrl.includes('.rtf') ? '.rtf' : '.html';
      
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

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="hero"
              size="lg"
              onClick={() => navigate('/new-case')}
              className="shadow-medium hover:shadow-strong transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              Criar Novo Documento
            </Button>
            
            {/* Campo de pesquisa */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Pesquisar processos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
              ) : filteredCases.length === 0 && cases.length === 0 ? (
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
              ) : filteredCases.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Nenhum processo encontrado</h3>
                    <p className="text-muted-foreground">Tente ajustar os termos da sua pesquisa</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4 cursor-pointer"
                      onClick={() => handleCaseClick(caseItem)}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-lg">{caseItem.title || caseItem.document_type}</h4>
                          <Badge variant="outline" className="text-xs">
                            {caseItem.case_number || `#${caseItem.id.substring(0, 8)}`}
                          </Badge>
                        </div>
                        
                        {caseItem.party_names && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Partes:</strong> {caseItem.party_names}
                          </p>
                        )}
                        
                        {caseItem.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {caseItem.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(new Date(caseItem.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <span>•</span>
                          <span>{caseItem.document_type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end lg:self-center" onClick={(e) => e.stopPropagation()}>
                        {getStatusBadge(caseItem.status)}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCaseClick(caseItem);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </Button>

                        {caseItem.status === 'completed' && caseItem.generated_document_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(caseItem.generated_document_url!, caseItem.id);
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}

                        {caseItem.generated_document_url && 
                         caseItem.generated_document_url.endsWith('.html') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegenerate(caseItem.id);
                            }}
                            disabled={regeneratingIds.has(caseItem.id)}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${regeneratingIds.has(caseItem.id) ? 'animate-spin' : ''}`} />
                            {regeneratingIds.has(caseItem.id) ? 'Regenerando...' : 'Regenerar em Word'}
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

      <DocumentModal
        case={selectedCase}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onUpdate={handleCaseUpdate}
      />
    </div>
  );
};

export default Dashboard;