import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, FileText, Upload, Download, CheckCircle, ArrowRight, Shield, Clock, Zap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-white shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="text-lg sm:text-2xl font-bold text-primary">PleaCraft AI</span>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Entrar</Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero" size="sm" className="text-sm sm:text-base">Começar Agora</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="container mx-auto text-center space-y-6 sm:space-y-8">
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight">
              Crie seus documentos judiciais de forma{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                simples e rápida
              </span>
            </h1>
            
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Responda algumas perguntas, anexe seus arquivos e deixe nossa inteligência artificial 
              fazer o trabalho pesado para você.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 sm:pt-8">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button variant="hero" size="lg" className="shadow-strong w-full sm:w-auto">
                  Começar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Ver Como Funciona
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Como Funciona
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Em apenas 3 passos simples, você terá seu documento jurídico pronto para uso
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <Card className="text-center shadow-medium border-0 hover:shadow-strong transition-all">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">1. Preencher Formulário</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Informe seus dados pessoais, da parte contrária e descreva 
                  detalhadamente os fatos ocorridos.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="text-center shadow-medium border-0 hover:shadow-strong transition-all">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">2. Anexar Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Faça upload de contratos, e-mails, notas fiscais e qualquer 
                  outro documento que comprove sua situação.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="text-center shadow-medium border-0 hover:shadow-strong transition-all">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">3. Receber Peça Pronta</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Nossa IA analisa suas informações e gera um documento jurídico 
                  profissional em formato editável.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Por que escolher o PleaCraft AI?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tecnologia de ponta para democratizar o acesso à justiça
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Rápido e Eficiente</h3>
              <p className="text-muted-foreground">
                Gere documentos jurídicos em minutos, não em dias. Nossa IA trabalha 
                24/7 para você.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Seguro e Confiável</h3>
              <p className="text-muted-foreground">
                Seus dados são protegidos com criptografia de ponta e seguem as 
                melhores práticas de segurança.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Qualidade Profissional</h3>
              <p className="text-muted-foreground">
                Documentos gerados seguem padrões jurídicos brasileiros e podem 
                ser editados conforme necessário.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Disponível 24/7</h3>
              <p className="text-muted-foreground">
                Crie seus documentos a qualquer hora, de qualquer lugar. Sem horário 
                comercial ou agendamentos.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Fácil de Usar</h3>
              <p className="text-muted-foreground">
                Interface intuitiva pensada para pessoas sem conhecimento jurídico. 
                Qualquer pessoa pode usar.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Acesso Democratizado</h3>
              <p className="text-muted-foreground">
                Justiça ao alcance de todos. Não é preciso ser advogado para defender 
                seus direitos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-hero text-white">
        <div className="container mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Pronto para criar seu primeiro documento?
          </h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            Comece agora mesmo e tenha seu documento jurídico pronto em poucos minutos.
          </p>
          <Link to="/auth">
            <Button variant="secondary" size="lg" className="shadow-strong">
              Criar Meu Primeiro Documento
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Scale className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-primary">PleaCraft AI</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 PleaCraft AI. Democratizando o acesso à justiça através da tecnologia.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
