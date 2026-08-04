/**
 * Email service factory and configuration
 */

import type { EmailProvider } from "./types";
import { ConsoleEmailProvider } from "./console-provider";
import { SMTPEmailProvider } from "./smtp-provider";

export * from "./types";
export { ConsoleEmailProvider } from "./console-provider";
export { SMTPEmailProvider } from "./smtp-provider";

/**
 * Create an email provider based on environment configuration
 */
export function createEmailProvider(): EmailProvider {
  const emailServer = process.env.EMAIL_SERVER;
  const emailFrom = process.env.EMAIL_FROM;

  // If no email configuration, use console provider (development)
  if (!emailServer || !emailFrom) {
    console.warn(
      "⚠️  No EMAIL_SERVER or EMAIL_FROM configured. Using console email provider.",
    );
    return new ConsoleEmailProvider();
  }

  // Parse SMTP URL (format: smtp://user:pass@host:port)
  try {
    const url = new URL(emailServer);

    if (url.protocol === "smtp:" || url.protocol === "smtps:") {
      const config = {
        host: url.hostname,
        port: parseInt(url.port) || (url.protocol === "smtps:" ? 465 : 587),
        secure: url.protocol === "smtps:",
        auth: {
          user: decodeURIComponent(url.username),
          pass: decodeURIComponent(url.password),
        },
        from: emailFrom,
      };

      return new SMTPEmailProvider(config);
    }

    console.warn(
      `⚠️  Unsupported email protocol: ${url.protocol}. Using console provider.`,
    );
    return new ConsoleEmailProvider();
  } catch (error) {
    console.error("Failed to parse EMAIL_SERVER:", error);
    console.warn("Using console email provider as fallback.");
    return new ConsoleEmailProvider();
  }
}

/**
 * Singleton email provider instance
 */
let emailProviderInstance: EmailProvider | null = null;

/**
 * Get the configured email provider
 */
export function getEmailProvider(): EmailProvider {
  if (!emailProviderInstance) {
    emailProviderInstance = createEmailProvider();
  }
  return emailProviderInstance;
}
