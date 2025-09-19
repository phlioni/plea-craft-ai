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
      `https://api-sandbox.asaas.com/v3/customers?email=${encodeURIComponent(customer.email)}`,
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
      // Criar novo cliente seguindo documentação ASAAS
      const createCustomerResponse = await fetch('https://api-sandbox.asaas.com/v3/customers', {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customer.name,
          cpfCnpj: customer.cpf.replace(/\D/g, ''), // Remove formatação
          mobilePhone: customer.phone.replace(/\D/g, ''), // Remove formatação
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

    // Criar checkout session para assinatura recorrente
    const checkoutResponse = await fetch('https://api-sandbox.asaas.com/v3/checkouts', {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billingTypes: ['CREDIT_CARD'],
        chargeTypes: ['RECURRENT'],
        minutesToExpire: 100,
        callback: {
          successUrl: "https://pialieyxsjpgaxzytpyn.lovableproject.com/dashboard",
          cancelUrl: "https://pialieyxsjpgaxzytpyn.lovableproject.com/checkout"
        },
        items: [
          {
            description: description,
            name: "Plano Mensal - Serviços Jurídicos",
            quantity: 1,
            value: value
          }
        ],
        customerData: {
          name: customer.name,
          cpfCnpj: customer.cpf.replace(/\D/g, ''),
          email: customer.email,
          phone: customer.phone.replace(/\D/g, ''),
          address: customer.address,
          addressNumber: "S/N",
          city: customer.city,
          province: customer.state,
          postalCode: customer.cep.replace(/\D/g, '')
        },
        subscription: {
          cycle: 'MONTHLY',
          nextDueDate: new Date().toISOString().split('T')[0]
        }
      }),
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error('Failed to create checkout session:', errorText);
      throw new Error(`Failed to create checkout session: ${errorText}`);
    }

    const checkoutSession = await checkoutResponse.json();
    console.log('Checkout session created successfully:', checkoutSession.id);

    // URL do checkout ASAAS
    const checkoutUrl = `https://asaas.com/checkoutSession/show?id=${checkoutSession.id}`;

    return new Response(
      JSON.stringify({
        success: true,
        checkoutId: checkoutSession.id,
        checkoutUrl: checkoutUrl,
        message: 'Checkout criado com sucesso! Redirecionando para o pagamento.',
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