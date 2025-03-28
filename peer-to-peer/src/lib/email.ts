import nodemailer from "nodemailer"
import { createLogger } from "@/lib/logger"

const logger = createLogger("email-service")

// Configure email transport
let transporter: nodemailer.Transporter | null = null
let transporterPromise: Promise<nodemailer.Transporter> | null = null

// Initialize the email transporter
export async function initEmailTransport(): Promise<nodemailer.Transporter> {
  // Return existing transporter if available
  if (transporter) return transporter

  // Return the promise if we're already initializing
  if (transporterPromise) return transporterPromise

  // Create a new initialization promise
  transporterPromise = (async () => {
    // For production, use actual SMTP credentials
    if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_FROM) {
      logger.info("Initializing email transport with SMTP")
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        secure: process.env.EMAIL_SERVER_SECURE === "true",
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      })
    } else {
      // For development, use Ethereal (fake SMTP service)
      logger.warn("Using Ethereal for email testing. Emails will not be delivered to real recipients.")

      try {
        // Create a test account on Ethereal
        const account = await nodemailer.createTestAccount()
        logger.info("Created Ethereal test account", { user: account.user })

        transporter = nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: {
            user: account.user,
            pass: account.pass,
          },
        })
        logger.info("Email transport initialized with Ethereal test account")
      } catch (err) {
        logger.error("Failed to create Ethereal test account", err)
        throw new Error("Failed to initialize email transport")
      }
    }

    return transporter as nodemailer.Transporter
  })()

  return transporterPromise
}

// Send an email
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}) {
  try {
    // Initialize email transport if not already done
    const emailTransport = await initEmailTransport()

    // Set the from address
    const from = process.env.EMAIL_FROM || "noreply@secureescrow.com"

    // Send the email
    const info = await emailTransport.sendMail({
      from,
      to,
      subject,
      text,
      html,
    })

    logger.info("Email sent", { messageId: info.messageId, to })

    // If using Ethereal, log the preview URL
    if (info.messageId && info.messageId.includes("ethereal")) {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      logger.info(`Ethereal email preview: ${previewUrl}`)
      return {
        success: true,
        previewUrl,
      }
    }

    return { success: true }
  } catch (error) {
    logger.error("Failed to send email", error)
    throw error
  }
}

// Send a password reset email
export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const subject = "Reset Your SecureEscrow Password"

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your SecureEscrow account. Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>This link will expire in 1 hour for security reasons.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>Best regards,<br>The SecureEscrow Team</p>
      <hr style="border: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666; text-align: center;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetLink}" style="color: #4f46e5;">${resetLink}</a>
      </p>
    </div>
  `

  const text = `
    Reset Your Password
    
    Hello,
    
    We received a request to reset your password for your SecureEscrow account. 
    Please visit the following link to reset your password:
    
    ${resetLink}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request a password reset, you can safely ignore this email.
    
    Best regards,
    The SecureEscrow Team
  `

  return sendEmail({ to, subject, html, text })
}



