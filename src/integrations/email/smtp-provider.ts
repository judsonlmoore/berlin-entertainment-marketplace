/**
 * SMTP email provider using nodemailer
 * For production use with configured SMTP server
 */

import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class SMTPEmailProvider implements EmailProvider {
  private config: SMTPConfig;
  private nodemailer: typeof import("nodemailer") | null = null;
  private transporter: ReturnType<
    typeof import("nodemailer").createTransport
  > | null = null;

  constructor(config: SMTPConfig) {
    this.config = config;
  }

  private async ensureTransporter() {
    if (this.transporter) return;

    // Lazy load nodemailer (only when needed)
    try {
      this.nodemailer = await import("nodemailer");
      this.transporter = this.nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
      });
    } catch (error) {
      console.error("Failed to initialize SMTP transporter:", error);
      throw new Error("SMTP provider not available");
    }
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      await this.ensureTransporter();

      if (!this.transporter) {
        throw new Error("SMTP transporter not initialized");
      }

      const result = await this.transporter.sendMail({
        from: message.from || this.config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error("SMTP send error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown SMTP error",
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      await this.ensureTransporter();
      if (!this.transporter) return false;
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("SMTP verification failed:", error);
      return false;
    }
  }
}
