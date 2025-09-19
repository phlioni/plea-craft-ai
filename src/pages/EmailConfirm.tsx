import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Scale, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const EmailConfirm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationStatus, setConfirmationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (token_hash && type) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });

          if (error) {
            console.error('Confirmation error:', error);
            setConfirmationStatus('error');
            setErrorMessage(error.message);
          } else if (data.user) {
            setConfirmationStatus('success');
            toast({
              title: "Email confirmado!",
              description: "Sua conta foi ativada com sucesso. Redirecionando...",
            });
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          }
        } else {
          // Check if user is already logged in
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            navigate('/dashboard');
          } else {
            setConfirmationStatus('error');
            setErrorMessage('Link de confirmação inválido');
          }
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setConfirmationStatus('error');
        setErrorMessage('Ocorreu um erro inesperado');
      } finally {
        setIsLoading(false);
      }
    };

    confirmEmail();
  }, [searchParams, navigate, toast]);

  const handleReturnToLogin = () => {
    navigate('/auth');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-primary">
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold">PleaCraft AI</span>
          </div>
        </div>

        <Card className="shadow-medium border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Confirmação de Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {confirmationStatus === 'loading' && (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <CardDescription>
                  Confirmando seu email...
                </CardDescription>
              </div>
            )}

            {confirmationStatus === 'success' && (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <div>
                  <CardTitle className="text-green-700">Email confirmado com sucesso!</CardTitle>
                  <CardDescription className="mt-2">
                    Sua conta foi ativada. Você será redirecionado para o dashboard em instantes.
                  </CardDescription>
                </div>
                <Button onClick={handleGoToDashboard} variant="hero" className="w-full">
                  Ir para Dashboard
                </Button>
              </div>
            )}

            {confirmationStatus === 'error' && (
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                <div>
                  <CardTitle className="text-red-700">Erro na confirmação</CardTitle>
                  <CardDescription className="mt-2">
                    {errorMessage || 'Não foi possível confirmar seu email. O link pode ter expirado ou ser inválido.'}
                  </CardDescription>
                </div>
                <Button onClick={handleReturnToLogin} variant="outline" className="w-full">
                  Voltar ao Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfirm;