import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CheckoutFormData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  cep: string;
}

const Checkout = () => {
  const [formData, setFormData] = useState<CheckoutFormData>({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    cep: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{3})\d+?$/, "$1");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          customer: formData,
          value: 19.99, // Valor do serviço
          description: "Serviço Jurídico - Petição Inicial"
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Pagamento processado!",
          description: "Redirecionando para finalizar o pagamento...",
        });
        
        // Redirecionar para a URL de pagamento do ASAAS
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          navigate("/dashboard");
        }
      } else {
        throw new Error(data.message || "Erro ao processar pagamento");
      }
    } catch (error) {
      console.error("Erro no checkout:", error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
          <p className="text-muted-foreground mt-2">
            Finalize seu pedido para o serviço jurídico
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulário de Dados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Dados do Cliente
              </CardTitle>
              <CardDescription>
                Preencha seus dados para processar o pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      type="text"
                      required
                      maxLength={14}
                      value={formatCPF(formData.cpf)}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        cpf: e.target.value
                      }))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="text"
                      required
                      maxLength={15}
                      value={formatPhone(formData.phone)}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        phone: e.target.value
                      }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Rua, número, complemento"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Sua cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      required
                      maxLength={2}
                      value={formData.state.toUpperCase()}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        state: e.target.value
                      }))}
                      placeholder="UF"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      name="cep"
                      type="text"
                      required
                      maxLength={9}
                      value={formatCEP(formData.cep)}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        cep: e.target.value
                      }))}
                      placeholder="00000-000"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                  variant="hero"
                >
                  {isLoading ? "Processando..." : "Finalizar Pagamento - R$ 19,99"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Resumo do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
              <CardDescription>
                Detalhes do serviço contratado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Petição Inicial - Juizado Especial Cível</span>
                <span className="text-primary font-bold">R$ 19,99</span>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Elaboração completa da petição</p>
                <p>• Análise do caso personalizada</p>
                <p>• Documento pronto para protocolo</p>
                <p>• Suporte via email</p>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">R$ 19,99</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                Pagamento seguro processado via ASAAS
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Formas de Pagamento</h4>
                <ul className="text-sm space-y-1">
                  <li>• PIX (aprovação instantânea)</li>
                  <li>• Cartão de Crédito</li>
                  <li>• Boleto Bancário</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;