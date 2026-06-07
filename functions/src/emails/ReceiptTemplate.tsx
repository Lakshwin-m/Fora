import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from "@react-email/components";

interface ReceiptEmailProps {
  userName: string;
  capsuleTitle: string;
  unlockDate: string;
}

export const ReceiptEmail = ({
  userName,
  capsuleTitle,
  unlockDate,
}: ReceiptEmailProps) => (
  <Html>
    <Head />
    <Preview>Your time capsule has been sealed! 🏺</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Heading style={logo}>FORÁ</Heading>
        </Section>
        <Section style={contentSection}>
          <Heading style={h1}>Memory Locked.</Heading>
          <Text style={text}>
            Hello {userName},
          </Text>
          <Text style={text}>
            Your time capsule <strong>"{capsuleTitle}"</strong> has been successfully prepared and sealed in the digital archive.
          </Text>
          <Section style={detailsContainer}>
            <Text style={detailLabel}>Scheduled Unlock Date:</Text>
            <Text style={detailValue}>{unlockDate}</Text>
          </Section>
          <Text style={text}>
            We've safely encrypted your memories. You'll receive a notification when the time comes to reveal what's inside.
          </Text>
        </Section>
        <Section style={footerSection}>
          <Link href="https://memory-locksmith.web.app" style={footerLink}>
            Open Dashboard
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
  padding: "40px 20px",
  maxWidth: "580px",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "30px",
};

const logo = {
  color: "#FB6376",
  fontSize: "32px",
  fontWeight: "bold",
  letterSpacing: "4px",
};

const contentSection = {
  backgroundColor: "#ffffff",
  padding: "40px",
  borderRadius: "24px",
  border: "1px solid #E8E8E8",
  boxShadow: "0 4px 12px rgba(93, 42, 66, 0.03)",
};

const h1 = {
  color: "#5D2A42",
  fontSize: "28px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 30px",
};

const text = {
  color: "#666666",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const detailsContainer = {
  backgroundColor: "#fafafa",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
  border: "1px dashed #FB6376",
};

const detailLabel = {
  color: "#5D2A42",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  margin: "0 0 8px",
};

const detailValue = {
  color: "#FB6376",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0",
};

const footerSection = {
  textAlign: "center" as const,
  marginTop: "40px",
};

const footerLink = {
  color: "#FB6376",
  textDecoration: "underline",
  fontSize: "14px",
  fontWeight: "bold",
};

const footerText = {
  color: "#999999",
  fontSize: "12px",
  marginTop: "20px",
};
