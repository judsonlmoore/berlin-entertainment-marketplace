/**
 * Console email provider for development and testing
 * Logs emails to console instead of sending them
 */

import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log("📧 [Email] Would send email:");
    console.log(`  To: ${message.to}`);
    console.log(`  Subject: ${message.subject}`);
    console.log(`  Text: ${message.text.slice(0, 100)}...`);
    if (message.html) {
      console.log(`  HTML: ${message.html.slice(0, 100)}...`);
    }

    return {
      success: true,
      messageId: `console-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  async verify(): Promise<boolean> {
    return true;
  }
}
