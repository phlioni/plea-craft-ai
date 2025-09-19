import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Customer {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  cep: string;
}

interface PaymentRequest {
  customer: Customer;
  value: number;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    
    if (!asaasApiKey) {
      throw new Error('ASAAS API key not configured');
    }

    const { customer, value, description }: PaymentRequest = await req.json();

    console.log('Processing payment request:', { customer: customer.email, value, description });

    // Primeiro, criar/buscar o cliente no ASAAS
    let customerId: string;
    
    // Buscar cliente existente
    const searchCustomerResponse = await fetch(
      `https://sandbox.asaas.com/api/v3/customers?email=${encodeURIComponent(customer.email)}`,
      {
        method: 'GET',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    const searchResult = await searchCustomerResponse.json();
    console.log('Customer search result:', searchResult);

    if (searchResult.data && searchResult.data.length > 0) {
      // Cliente já existe
      customerId = searchResult.data[0].id;
      console.log('Existing customer found:', customerId);
    } else {
      // Criar novo cliente
      const createCustomerResponse = await fetch('https://sandbox.asaas.com/api/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          phone: customer.phone.replace(/\D/g, ''), // Remove formatação
          mobilePhone: customer.phone.replace(/\D/g, ''),
          cpfCnpj: customer.cpf.replace(/\D/g, ''), // Remove formatação
          postalCode: customer.cep.replace(/\D/g, ''),
          address: customer.address,
          addressNumber: "S/N",
          complement: "",
          province: customer.city,
          city: customer.city,
          state: customer.state,
          country: "Brasil"
        }),
      });

      if (!createCustomerResponse.ok) {
        const errorText = await createCustomerResponse.text();
        console.error('Failed to create customer:', errorText);
        throw new Error(`Failed to create customer: ${errorText}`);
      }

      const newCustomer = await createCustomerResponse.json();
      customerId = newCustomer.id;
      console.log('New customer created:', customerId);
    }

    // Criar cobrança
    const paymentResponse = await fetch('https://sandbox.asaas.com/api/v3/payments', {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Permite escolher na hora do pagamento
        value: value,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
        description: description,
        externalReference: `legal-case-${Date.now()}`,
        installmentCount: 1,
        installmentValue: value,
      }),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Failed to create payment:', errorText);
      throw new Error(`Failed to create payment: ${errorText}`);
    }

    const payment = await paymentResponse.json();
    console.log('Payment created successfully:', payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixQrCode: payment.pixTransaction?.qrCode,
        message: 'Pagamento criado com sucesso! Verifique seu email para instruções de pagamento.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-payment function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});