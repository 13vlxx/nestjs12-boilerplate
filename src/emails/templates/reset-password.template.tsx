import { Button, Link, Section, Text } from 'react-email';
import { LayoutTemplate, styles } from './layout.template.js';

interface ResetPasswordProps {
  firstName: string;
  link: string;
  expiresInMinutes: number;
}

export function resetPasswordTemplate({
  firstName,
  link,
  expiresInMinutes,
}: ResetPasswordProps) {
  return (
    <LayoutTemplate preview="Reset your password" title="Reset your password">
      <Text style={styles.text}>Hi {firstName},</Text>
      <Text style={styles.text}>
        We received a request to reset your password. Click the button below to
        choose a new one. This link expires in {expiresInMinutes} minutes.
      </Text>
      <Section style={{ margin: '24px 0' }}>
        <Button href={link} style={styles.button}>
          Reset my password
        </Button>
      </Section>
      <Text style={styles.text}>Or copy this link into your browser:</Text>
      <Link href={link} style={styles.link}>
        {link}
      </Link>
      <Text style={styles.text}>
        If you didn't request this, no action is needed: your password stays the
        same.
      </Text>
    </LayoutTemplate>
  );
}
