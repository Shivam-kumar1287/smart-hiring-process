// Gmail Setup Helper
console.log("=== Gmail SMTP Setup for Smart Job Tracker ===\n");

console.log("Follow these steps to configure email sending:\n");

console.log("1. Enable 2-Factor Authentication on your Gmail account");
console.log("   - Go to: https://myaccount.google.com/security");
console.log("   - Enable 2-Factor Authentication\n");

console.log("2. Generate an App Password");
console.log("   - Go to: https://myaccount.google.com/apppasswords");
console.log("   - Select 'Mail' for the app");
console.log("   - Select 'Other (Custom name)' and name it 'Smart Job Tracker'");
console.log("   - Click 'Generate'");
console.log("   - Copy the 16-character password\n");

console.log("3. Add these lines to your .env file:");
console.log("   SMTP_EMAIL=your-gmail@gmail.com");
console.log("   SMTP_PASSWORD=your-16-character-app-password\n");

console.log("4. Restart the backend server");
console.log("   - Stop current server (Ctrl+C)");
console.log("   - Run: npm run dev\n");

console.log("5. Test the registration");
console.log("   - Try registering a new user");
console.log("   - Check your Gmail for the OTP email\n");

console.log("Current Status: Email service needs Gmail credentials to send real emails");
console.log("Without credentials, system shows debug OTP in console and error response.\n");

// Check if credentials are already configured
if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
  console.log("✅ Gmail credentials found in .env file");
  console.log("Email service should work with Gmail SMTP");
} else {
  console.log("❌ Gmail credentials not found in .env file");
  console.log("Please add SMTP_EMAIL and SMTP_PASSWORD to enable real email sending");
}
