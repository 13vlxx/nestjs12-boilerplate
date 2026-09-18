import type { ReactNode } from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'react-email';

interface LayoutProps {
  preview: string;
  title: string;
  children: ReactNode;
}

export function LayoutTemplate({ preview, title, children }: LayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{title}</Heading>
          {children}
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            You received this email because an account was created with this
            address. If it wasn't you, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const styles = {
  body: {
    backgroundColor: '#f4f4f5',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '32px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '0 auto',
    maxWidth: '520px',
    padding: '32px',
  },
  heading: { color: '#18181b', fontSize: '22px', margin: '0 0 16px' },
  text: { color: '#3f3f46', fontSize: '15px', lineHeight: '24px' },
  button: {
    backgroundColor: '#18181b',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 600,
    padding: '12px 20px',
    textDecoration: 'none',
  },
  link: { color: '#71717a', fontSize: '13px', wordBreak: 'break-all' as const },
  hr: { borderColor: '#e4e4e7', margin: '24px 0' },
  footer: { color: '#a1a1aa', fontSize: '12px', lineHeight: '18px' },
};
