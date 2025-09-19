import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { ConfirmationEmail } from './_templates/confirmation-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    console.log('🚀 Iniciando envio de email de confirmação...')
    
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    // Verificar se temos o hook secret configurado
    if (!hookSecret) {
      console.log('⚠️ SEND_EMAIL_HOOK_SECRET não configurado, processando sem verificação de webhook')
    }

    let emailData: any
    let user: any

    if (hookSecret) {
      // Verificar webhook se o secret estiver configurado
      const wh = new Webhook(hookSecret)
      const webhookData = wh.verify(payload, headers) as {
        user: {
          email: string
          user_metadata?: { full_name?: string }
          raw_user_meta_data?: { full_name?: string }
        }
        email_data: {
          token: string
          token_hash: string
          redirect_to: string
          email_action_type: string
        }
      }
      
      user = webhookData.user
      emailData = webhookData.email_data
    } else {
      // Parse direto se não há webhook secret
      const data = JSON.parse(payload)
      user = data.user
      emailData = data.email_data
    }

    console.log(`📧 Enviando email para: ${user.email}`)

    // Extrair nome do usuário
    const userName = user.user_metadata?.full_name || 
                    user.raw_user_meta_data?.full_name || 
                    user.email.split('@')[0]

    console.log(`👤 Nome do usuário: ${userName}`)

    // Renderizar template de email
    const html = await renderAsync(
      React.createElement(ConfirmationEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token: emailData.token,
        token_hash: emailData.token_hash,
        redirect_to: emailData.redirect_to,
        email_action_type: emailData.email_action_type,
        user_name: userName,
      })
    )

    console.log('📨 Template renderizado, enviando via Resend...')

    // Enviar email via Resend
    const { data, error } = await resend.emails.send({
      from: 'PleaCraft AI <noreply@pleacraft.ai>',
      to: [user.email],
      subject: '✅ Confirme sua conta no PleaCraft AI',
      html,
    })

    if (error) {
      console.error('❌ Erro ao enviar email:', error)
      throw error
    }

    console.log('✅ Email enviado com sucesso:', data)

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )

  } catch (error) {
    console.error('🔥 Erro no envio de email:', error)
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
          details: error.toString(),
        },
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})