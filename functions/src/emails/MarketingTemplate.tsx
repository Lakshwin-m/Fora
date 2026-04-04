import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Column,
  Row,
} from "@react-email/components";

interface MarketingEmailProps {
  userName: string;
}

export const MarketingEmail = ({ userName }: MarketingEmailProps) => (
  <Html>
    <Head />
    <Preview>Reconnect with your future self on Forá 🏺</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={heroSection}>
          <Heading style={logo}>FORÁ</Heading>
          <Heading style={h1}>Time is the ultimate luxury.</Heading>
          <Text style={heroText}>
            Hello {userName}, when was the last time you spoke to your future self? 
            The memories you capture today will become tomorrow's greatest treasures.
          </Text>
          <Button href="https://memory-locksmith.web.app/create" style={button}>
            Create a New Capsule
          </Button>
        </Section>

        <Section style={featuresSection}>
          <Heading style={h2}>Why use Forá?</Heading>
          <Row style={featureRow}>
            <Column style={featureCol}>
              <Text style={featureTitle}>Encrypted</Text>
              <Text style={featureDesc}>Your memories are sealed with military-grade encryption.</Text>
            </Column>
            <Column style={featureCol}>
              <Text style={featureTitle}>Timeless</Text>
              <Text style={featureDesc}>Schedule messages for 1, 5, or 50 years into the future.</Text>
            </Column>
          </Row>
        </Section>

        <Section style={ctaSection}>
          <Text style={text}>
            Ready to preserve a moment? Join thousands of others who are connecting with their future selves.
          </Text>
        </Section>

        <Section style={footerSection}>
          <Text style={footerText}>
            You received this because you're a member of the Forá digital archive.
          </Text>
          <Link href="https://memory-locksmith.web.app/settings" style={footerLink}>
            Unsubscribe from marketing emails
          </Link>
          <Text style={footerText}>
            © 2026 Forá Time Capsules. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#FFF9EC",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "40px 0",
  maxWidth: "600px",
};

const heroSection = {
  backgroundColor: "#5D2A42",
  padding: "60px 40px",
  textAlign: "center" as const,
  borderRadius: "32px",
  margin: "0 20px",
};

const logo = {
  color: "#FB6376",
  fontSize: "24px",
  fontWeight: "bold",
  letterSpacing: "4px",
  margin: "0 0 20px",
};

const h1 = {
  color: "#ffffff",
  fontSize: "36px",
  fontWeight: "bold",
  lineHeight: "1.2",
  margin: "0 0 24px",
};

const heroText = {
  color: "#FFDCCC",
  fontSize: "18px",
  lineHeight: "28px",
  margin: "0 0 32px",
};

const button = {
  backgroundColor: "#FB6376",
  borderRadius: "12px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "16px 32px",
};

const featuresSection = {
  padding: "40px 20px",
  textAlign: "center" as const,
};

const h2 = {
  color: "#5D2A42",
  fontSize: "24px",
  fontWeight: "bold",
  marginBottom: "32px",
};

const featureRow = {
  marginTop: "20px",
};

const featureCol = {
  padding: "0 10px",
  width: "50%",
};

const featureTitle = {
  color: "#FB6376",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 8px",
};

const featureDesc = {
  color: "#666666",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const ctaSection = {
  padding: "20px 40px",
  textAlign: "center" as const,
};

const text = {
  color: "#666666",
  fontSize: "16px",
  lineHeight: "24px",
};

const footerSection = {
  textAlign: "center" as const,
  marginTop: "40px",
  padding: "0 20px",
};

const footerLink = {
  color: "#999999",
  textDecoration: "underline",
  fontSize: "12px",
};

const footerText = {
  color: "#999999",
  fontSize: "12px",
  margin: "20px 0 10px",
};
