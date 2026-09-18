import { Button, Link, Section, Text } from 'react-email';
import { LayoutTemplate, styles } from './layout.template.js';

interface VerifyEmailProps {
  firstName: string;
  link: string;
  expiresInHours: number;
}

export function verifyEmailTemplate({
  firstName,
  link,
  expiresInHours,
}: VerifyEmailProps) {
  return (
    <LayoutTemplate
      preview="Confirm your email address"
      title="Verify your email"
    >
      <Text style={styles.text}>Hi {firstName},</Text>
      <Text style={styles.text}>
        Thanks for signing up. Please confirm your email address by clicking the
        button below. This link expires in {expiresInHours} hours.
      </Text>
      <Section style={{ margin: '24px 0' }}>
        <Button href={link} style={styles.button}>
          Verify my email
        </Button>
      </Section>
      <Text style={styles.text}>Or copy this link into your browser:</Text>
      <Link href={link} style={styles.link}>
        {link}
      </Link>
    </LayoutTemplate>
  );
}
