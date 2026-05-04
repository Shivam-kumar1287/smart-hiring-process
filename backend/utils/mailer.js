import nodemailer from "nodemailer";

let transporter = null;

// Initialize transporter based on available credentials
const initializeTransporter = () => {
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
    // Use Gmail if credentials are provided
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    console.log("Email service configured with Gmail");
  } else {
    // Use a working SMTP service for development
    transporter = nodemailer.createTransport({
      host: "smtp.mailtrap.io",
      port: 2525,
      secure: false,
      auth: {
        user: "1b2c3d4e5f6g7h",
        pass: "1b2c3d4e5f6g7h"
      },
    });
    console.log("Email service configured with Mailtrap (development)");
    console.log("Note: For production, configure Gmail SMTP in .env file");
  }
};

// Initialize on module load removed to allow env variables to load first

export const sendMail = async (to, subject, text, html = "", attachments = []) => {
  try {
    if (!transporter) {
      initializeTransporter();
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_EMAIL || transporter.options.auth.user,
      to,
      subject,
      text,
      html,
      attachments
    });
    
    console.log("Email sent successfully to:", to);
    
    // If using Ethereal, log the preview URL
    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      console.log("Message ID:", info.messageId);
    } else {
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    console.log("Email details:");
    console.log("- To:", to);
    console.log("- Subject:", subject);
    console.log("- Content:", text || html);
    return false;
  }
};