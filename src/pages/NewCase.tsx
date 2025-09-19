import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Scale, Upload, FileText, ArrowLeft, User, Building2, FileCheck } from "lucide-react";

interface CaseData {
  // Autor (Plaintiff)
  authorName: string;
  authorCpf: string;
  authorAddress: string;
  authorEmail: string;
  authorPhone: string;
  
  // Réu (Defendant)
  defendantName: string;
  defendantDocument: string;
  defendantAddress: string;
  
  // Narrativa
  factsNarrative: string;
}

const NewCase = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [caseData, setCaseData] = useState<CaseData>({
    authorName: "",
    authorCpf: "",
    authorAddress: "",
    authorEmail: "",
    authorPhone: "",
    defendantName: "",
    defendantDocument: "",
    defendantAddress: "",
    factsNarrative: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleInputChange = (field: keyof CaseData, value: string) => {
    setCaseData(prev => ({ ...prev, [field]: value }));
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para criar um documento.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Invoke the generate-document edge function
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: {
          caseData,
          factsNarrative: caseData.factsNarrative,
          files: uploadedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        },
      });

      if (error) {
        console.error('Error generating document:', error);
        toast({
          title: "Erro na Geração",
          description: "Ocorreu um erro ao gerar o documento. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Documento em Processamento!",
        description: "Seu documento está sendo gerado. Você será redirecionado para o dashboard.",
      });

      // Redirect to dashboard after successful submission
      navigate('/dashboard');

    } catch (error) {
      console.error('Error submitting case:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-white shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Link to="/" className="flex items-center gap-2 text-primary hover:text-primary-glow transition-colors">
              <Scale className="h-8 w-8" />
              <span className="text-xl font-bold">PleaCraft AI</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Title */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              Gerador de Peça Judicial
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Preencha as informações abaixo com cuidado. Quanto mais detalhes você fornecer, 
              melhor será a qualidade do documento gerado.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Seção 1: Suas Informações */}
            <Card className="shadow-medium border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Suas Informações (Autor da Ação)
                </CardTitle>
                <CardDescription>
                  Insira seus dados pessoais como requerente da ação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authorName">Nome Completo *</Label>
                    <Input
                      id="authorName"
                      value={caseData.authorName}
                      onChange={(e) => handleInputChange('authorName', e.target.value)}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authorCpf">CPF *</Label>
                    <Input
                      id="authorCpf"
                      value={caseData.authorCpf}
                      onChange={(e) => handleInputChange('authorCpf', formatCpfCnpj(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="authorAddress">Endereço Completo *</Label>
                  <Input
                    id="authorAddress"
                    value={caseData.authorAddress}
                    onChange={(e) => handleInputChange('authorAddress', e.target.value)}
                    placeholder="Rua, número, bairro, cidade, CEP"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authorEmail">Email *</Label>
                    <Input
                      id="authorEmail"
                      type="email"
                      value={caseData.authorEmail}
                      onChange={(e) => handleInputChange('authorEmail', e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authorPhone">Telefone *</Label>
                    <Input
                      id="authorPhone"
                      value={caseData.authorPhone}
                      onChange={(e) => handleInputChange('authorPhone', formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção 2: Informações da Parte Contrária */}
            <Card className="shadow-medium border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informações da Parte Contrária (Réu)
                </CardTitle>
                <CardDescription>
                  Dados da pessoa física ou jurídica contra quem você está movendo a ação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defendantName">Nome Completo ou Razão Social *</Label>
                  <Input
                    id="defendantName"
                    value={caseData.defendantName}
                    onChange={(e) => handleInputChange('defendantName', e.target.value)}
                    placeholder="Nome da pessoa ou empresa"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defendantDocument">CPF ou CNPJ</Label>
                  <Input
                    id="defendantDocument"
                    value={caseData.defendantDocument}
                    onChange={(e) => handleInputChange('defendantDocument', formatCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defendantAddress">Endereço Conhecido</Label>
                  <Input
                    id="defendantAddress"
                    value={caseData.defendantAddress}
                    onChange={(e) => handleInputChange('defendantAddress', e.target.value)}
                    placeholder="Endereço da parte contrária (se conhecido)"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Seção 3: Descreva os Fatos */}
            <Card className="shadow-medium border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Descreva os Fatos
                </CardTitle>
                <CardDescription>
                  Relate com detalhes tudo o que aconteceu. Esta é a parte mais importante!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="factsNarrative">
                    Narrativa dos Fatos *
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Por favor, narre com o máximo de detalhes tudo o que aconteceu. 
                    Inclua datas, locais, pessoas envolvidas e qualquer outra informação que julgar importante.
                  </p>
                  <Textarea
                    id="factsNarrative"
                    value={caseData.factsNarrative}
                    onChange={(e) => handleInputChange('factsNarrative', e.target.value)}
                    placeholder="Descreva aqui tudo o que aconteceu, quando aconteceu, onde aconteceu, quem estava envolvido, quais foram os danos sofridos, tentativas de resolução, etc."
                    className="min-h-[200px]"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 100 caracteres. Atual: {caseData.factsNarrative.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Seção 4: Anexar Documentos */}
            <Card className="shadow-medium border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Anexar Documentos
                </CardTitle>
                <CardDescription>
                  Anexe todos os documentos que comprovam sua história
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fileUpload">Documentos Comprobatórios</Label>
                  <p className="text-sm text-muted-foreground">
                    Anexe contratos, e-mails, prints de conversas, notas fiscais, fotos, etc.
                  </p>
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Clique para selecionar arquivos</p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOC, DOCX, JPG, PNG (máx. 10MB por arquivo)
                      </p>
                    </div>
                    <Input
                      id="fileUpload"
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="mt-4"
                    />
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Arquivos Selecionados:</Label>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded-lg"
                        >
                          <span className="text-sm">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                variant="hero"
                size="lg"
                disabled={isLoading || caseData.factsNarrative.length < 100}
                className="shadow-medium hover:shadow-strong"
              >
                {isLoading ? "Gerando Documento..." : "Gerar Meu Documento"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default NewCase;