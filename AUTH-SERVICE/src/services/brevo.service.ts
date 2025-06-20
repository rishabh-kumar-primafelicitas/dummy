import axios from "axios";
import { config } from "configs/server.config";
import { logger } from "loggers/logger";
import { InternalServerError } from "errors";
import fs from "fs/promises";
import path from "path";

interface BrevoEmailRecipient {
  email: string;
  name?: string;
}

interface BrevoEmailSender {
  email: string;
  name?: string;
}

interface BrevoSendEmailPayload {
  sender: BrevoEmailSender;
  to: BrevoEmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export class BrevoService {
  private apiKey: string;
  private senderEmail: string;
  private brevoApiUrl = "https://api.brevo.com/v3/smtp/email";
  private templatesPath: string;

  constructor() {
    if (!config.brevo.apiKey || !config.brevo.senderEmail) {
      logger.error("Brevo API key or sender email is not configured.");
      // Depending on strictness, you might throw an error here
      // For now, we'll let it proceed but sending emails will fail.
    }
    this.apiKey = config.brevo.apiKey;
    this.senderEmail = config.brevo.senderEmail;
    this.templatesPath = path.join(process.cwd(), "assets", "email-templates");
  }

  private async loadTemplate(templateName: string): Promise<string> {
    try {
      const templatePath = path.join(
        this.templatesPath,
        `${templateName}.html`
      );
      return await fs.readFile(templatePath, "utf-8");
    } catch (error) {
      logger.error(`Failed to load email template: ${templateName}`, { error });
      throw new InternalServerError(
        `Email template not found: ${templateName}`
      );
    }
  }

  private replaceTemplateVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let processedTemplate = template;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedTemplate = processedTemplate.replace(
        new RegExp(placeholder, "g"),
        value
      );
    });
    return processedTemplate;
  }

  async sendEmail(payload: BrevoSendEmailPayload): Promise<void> {
    if (!this.apiKey || !this.senderEmail) {
      logger.error("Brevo service is not properly configured to send emails.");
      throw new InternalServerError("Email service configuration error.");
    }
    try {
      await axios.post(this.brevoApiUrl, payload, {
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      logger.info(
        `Email sent to ${payload.to.map((r) => r.email).join(", ")} with subject "${payload.subject}"`
      );
    } catch (error: any) {
      console.error("Brevo email sending error:", error);
      logger.error("Failed to send email via Brevo:", {
        message: error.message,
        response: error.response?.data,
      });
      throw new InternalServerError("Failed to send email.");
    }
  }

  async sendVerificationEmail(
    userEmail: string,
    username: string,
    verificationToken: string
  ): Promise<void> {
    const verificationLink = `${config.appBaseUrl}/api/v1/verify-email/${verificationToken}`;

    const template = await this.loadTemplate("user-onboarding");
    const htmlContent = this.replaceTemplateVariables(template, {
      username,
      verificationLink,
      appName: "Camp Haven",
    });

    const emailPayload: BrevoSendEmailPayload = {
      sender: { email: this.senderEmail, name: "Camp Haven Auth" },
      to: [{ email: userEmail, name: username }],
      subject: "Verify Your Email Address for Camp Haven",
      htmlContent,
      textContent: `
        Welcome to Camp Haven, ${username}!
        Please verify your email address by visiting the following link:
        ${verificationLink}
        If you did not sign up for Camp Haven, please ignore this email.
        This link will expire in 24 hours.
      `,
    };

    await this.sendEmail(emailPayload);
  }

  async sendPasswordResetOtp(
    userEmail: string,
    username: string,
    otp: string
  ): Promise<void> {
    const template = await this.loadTemplate("forgot-password");
    const htmlContent = this.replaceTemplateVariables(template, {
      username,
      otp,
      appName: "Camp Haven",
    });

    const emailPayload: BrevoSendEmailPayload = {
      sender: { email: this.senderEmail, name: "Camp Haven Auth" },
      to: [{ email: userEmail, name: username }],
      subject: "Password Reset OTP for Camp Haven",
      htmlContent,
      textContent: `
        Password Reset Request
        Hello ${username},
        You have requested to reset your password for your Camp Haven account.
        Your OTP is: ${otp}
        This OTP will expire in 10 minutes.
        If you did not request this password reset, please ignore this email.
        For security reasons, do not share this OTP with anyone.
      `,
    };

    await this.sendEmail(emailPayload);
  }

  async sendSupportManagerWelcomeEmail(
    userEmail: string,
    username: string,
    password: string
  ): Promise<void> {
    const loginLink = `${config.frontendUrl}`;

    const template = await this.loadTemplate("support-manager");
    const htmlContent = this.replaceTemplateVariables(template, {
      username,
      userEmail,
      password,
      loginLink,
      appName: "Camp Haven",
    });

    const emailPayload: BrevoSendEmailPayload = {
      sender: { email: this.senderEmail, name: "Camp Haven Auth" },
      to: [{ email: userEmail, name: username }],
      subject: "Your Camp Haven Account Credentials",
      htmlContent,
      textContent: `
        Welcome to Camp Haven, ${username}!
        
        Your support manager account has been created. Here are your login details:
        - Email: ${userEmail}
        - Password: ${password}

        Please log in at ${loginLink} and change your password immediately.
      `,
    };

    await this.sendEmail(emailPayload);
  }

  async sendPasswordResetSuccessEmail(
    userEmail: string,
    username: string
  ): Promise<void> {
    const template = await this.loadTemplate("password-reset-successfully");
    const htmlContent = this.replaceTemplateVariables(template, {
      username,
      appName: "Camp Haven",
    });

    const emailPayload: BrevoSendEmailPayload = {
      sender: { email: this.senderEmail, name: "Camp Haven Auth" },
      to: [{ email: userEmail, name: username }],
      subject: "Password Reset Successful - Camp Haven",
      htmlContent,
      textContent: `
        Password Reset Successful
        Hello ${username},
        Your password has been successfully reset for your Camp Haven account.
        If you did not perform this action, please contact our support team immediately.
      `,
    };

    await this.sendEmail(emailPayload);
  }

  async sendOtpVerifiedEmail(
    userEmail: string,
    username: string
  ): Promise<void> {
    const template = await this.loadTemplate("verified-otp");
    const htmlContent = this.replaceTemplateVariables(template, {
      username,
      appName: "Camp Haven",
    });

    const emailPayload: BrevoSendEmailPayload = {
      sender: { email: this.senderEmail, name: "Camp Haven Auth" },
      to: [{ email: userEmail, name: username }],
      subject: "OTP Verified Successfully - Camp Haven",
      htmlContent,
      textContent: `
        OTP Verification Successful
        Hello ${username},
        Your OTP has been successfully verified. You can now proceed with your password reset.
      `,
    };

    await this.sendEmail(emailPayload);
  }

  async sendWelcomeEmail(userEmail: string, username: string): Promise<void> {
    const template = await this.loadTemplate("welcome");
    const htmlContent = this.replaceTemplateVariables(template, {
      username,
      appName: "Camp Haven",
    });

    const emailPayload: BrevoSendEmailPayload = {
      sender: { email: this.senderEmail, name: "Camp Haven Auth" },
      to: [{ email: userEmail, name: username }],
      subject: "Welcome to Camp Haven!",
      htmlContent,
      textContent: `
        Welcome to Camp Haven, ${username}!
        Thank you for joining our community.
        We're excited to have you on board!
      `,
    };

    await this.sendEmail(emailPayload);
  }

  async sendQueryResolvedEmail(
    userEmail: string,
    username: string,
    ticketId: string,
    resolution: string
  ): Promise<void> {
    const template = await this.loadTemplate("query-resolved");
    const htmlContent = this.replaceTemplateVariables(template, {
      username,
      ticketId,
      resolution,
      appName: "Camp Haven",
    });

    const emailPayload: BrevoSendEmailPayload = {
      sender: { email: this.senderEmail, name: "Camp Haven Support" },
      to: [{ email: userEmail, name: username }],
      subject: `Your Support Ticket #${ticketId} has been Resolved`,
      htmlContent,
      textContent: `
        Support Ticket Resolved
        Hello ${username},
        Your support ticket #${ticketId} has been resolved.
        Resolution: ${resolution}
        Thank you for contacting Camp Haven support.
      `,
    };

    await this.sendEmail(emailPayload);
  }

  async sendSupportTicketCreatedEmail(
    userEmail: string,
    username: string,
    ticketId: string
  ): Promise<void> {
    const template = await this.loadTemplate(
      "support-ticket-successfully-created"
    );
    const htmlContent = this.replaceTemplateVariables(template, {
      username,
      ticketId,
      appName: "Camp Haven",
    });

    const emailPayload: BrevoSendEmailPayload = {
      sender: { email: this.senderEmail, name: "Camp Haven Support" },
      to: [{ email: userEmail, name: username }],
      subject: `Support Ticket Created - #${ticketId}`,
      htmlContent,
      textContent: `
        Support Ticket Created
        Hello ${username},
        Your support ticket #${ticketId} has been successfully created.
        We will get back to you as soon as possible.
        Thank you for contacting Camp Haven support.
      `,
    };

    await this.sendEmail(emailPayload);
  }
}
