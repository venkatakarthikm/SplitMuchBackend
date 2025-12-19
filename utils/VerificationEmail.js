const { Html, Head, Body, Container, Section, Text, Button, Hr, Heading } = require('@react-email/components');

const VerificationEmail = ({ username, url }) => {
  return {
    component: (
      <Html>
        <Head />
        <Body style={main}>
          <Container style={container}>
            <Section style={header}>
              <Heading style={h1}>Welcome to SplitEase! 💰</Heading>
            </Section>
            <Section style={content}>
              <Text style={text}>Hi {username},</Text>
              <Text style={text}>
                We're excited to have you! SplitEase helps you manage expenses with friends effortlessly. 
                Before we dive in, please verify your account.
              </Text>
              <Button pX={20} pY={12} style={button} href={url}>
                Verify My Account
              </Button>
              <Hr style={hr} />
              <Text style={footer}>
                If the button doesn't work, copy and paste this link into your browser:
              </Text>
              <Text style={link}>{url}</Text>
            </Section>
          </Container>
        </Body>
      </Html>
    )
  };
};

const main = { backgroundColor: '#f6f9fc', padding: '10px' };
const container = { backgroundColor: '#ffffff', border: '1px solid #f0f0f0', borderRadius: '10px', margin: '0 auto', padding: '40px' };
const h1 = { color: '#4f46e5', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' };
const button = { backgroundColor: '#4f46e5', borderRadius: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center', display: 'block', margin: '20px auto' };
const text = { color: '#444', fontSize: '16px', lineHeight: '24px' };
const footer = { color: '#8898aa', fontSize: '12px' };
const link = { color: '#4f46e5', fontSize: '12px', wordBreak: 'break-all' };

module.exports = VerificationEmail;