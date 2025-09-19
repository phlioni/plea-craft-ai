import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ConfirmationEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  user_name?: string
}

export const ConfirmationEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  user_name = 'Usuário',
}: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirme sua conta no PleaCraft AI</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>PleaCraft AI</Text>
        </Section>
        
        <Heading style={h1}>Bem-vindo(a) ao PleaCraft AI!</Heading>
        
        <Text style={text}>
          Olá {user_name},
        </Text>
        
        <Text style={text}>
          Obrigado por se cadastrar no PleaCraft AI, sua plataforma inteligente para criação de documentos jurídicos. 
          Para ativar sua conta e começar a criar petições com inteligência artificial, 
          confirme seu email clicando no botão abaixo:
        </Text>

        <Section style={buttonContainer}>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            target="_blank"
            style={button}
          >
            Confirmar Email
          </Link>
        </Section>

        <Text style={text}>
          Ou, se preferir, use este código de confirmação:
        </Text>
        <Section style={codeContainer}>
          <Text style={code}>{token}</Text>
        </Section>

        <Hr style={hr} />

        <Text style={text}>
          Após confirmar seu email, você terá acesso a:
        </Text>
        <Text style={listText}>• Geração automática de petições iniciais</Text>
        <Text style={listText}>• Templates jurídicos personalizáveis</Text>
        <Text style={listText}>• Gerenciamento de casos e documentos</Text>
        <Text style={listText}>• Interface intuitiva e segura</Text>

        <Text style={footerText}>
          Se você não se cadastrou no PleaCraft AI, pode ignorar este email com segurança.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          <Link
            href="https://pleacraft.ai"
            target="_blank"
            style={{ ...link, color: '#898989' }}
          >
            PleaCraft AI
          </Link>
          <br />
          Sua plataforma inteligente para documentos jurídicos
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ConfirmationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const logoSection = {
  padding: '20px 0',
  textAlign: 'center' as const,
}

const logoText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#2563eb',
  margin: '0',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const listText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '8px 0',
  paddingLeft: '16px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
}

const codeContainer = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  margin: '16px 0',
  padding: '16px',
  textAlign: 'center' as const,
}

const code = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#2563eb',
  letterSpacing: '2px',
  margin: '0',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
}

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const footerText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '12px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}