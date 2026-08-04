/**
 * Email service abstraction types
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email provider interface
 * Implementations: SMTP, Console (test), Future: SendGrid, Postmark, etc.
 */
export interface EmailProvider {
  /**
   * Send a single email
   */
  send(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Verify provider configuration (optional)
   */
  verify?(): Promise<boolean>;
}
