// This script helps you set up real email service
import nodemailer from "nodemailer";

console.log("=== Email Service Setup ===");
console.log("\nTo configure real email sending, you need to:");
console.log("1. Enable 2FA on your Gmail account");
console.log("2. Generate an App Password");
console.log("3. Add credentials to your .env file");
console.log("\nSteps to generate Gmail App Password:");
console.log("- Go to: https://myaccount.google.com/apppasswords");
console.log("- Select 'Mail' for app");
console.log("- Select 'Other (Custom name)' and name it 'Smart Job Tracker'");
console.log("- Click 'Generate' and copy the 16-character password");
console.log("\nAdd these lines to your .env file:");
console.log("SMTP_EMAIL=your-gmail@gmail.com");
console.log("SMTP_PASSWORD=your-16-character-app-password");
console.log("\nThen restart the backend server.");

// Test current configuration
const testEmail = async () => {
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      
      console.log("\nTesting email configuration...");
      await transporter.verify();
      console.log("✅ Email configuration is valid!");
      
      // Send test email
      const info = await transporter.sendMail({
        from: process.env.SMTP_EMAIL,
        to: process.env.SMTP_EMAIL, // Send to self for testing
        subject: "Test Email - Smart Job Tracker",
        text: "This is a test email to verify the email service is working.",
        html: "<h3>Test Email</h3><p>This is a test email to verify the email service is working.</p>",
      });
      
      console.log("✅ Test email sent successfully!");
      console.log("Message ID:", info.messageId);
      
    } catch (error) {
      console.error("❌ Email configuration failed:", error.message);
    }
  } else {
    console.log("\n❌ Email credentials not found in .env file");
    console.log("Please add SMTP_EMAIL and SMTP_PASSWORD to your .env file");
  }
};

testEmail();
