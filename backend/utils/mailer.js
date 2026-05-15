import nodemailer from "nodemailer";



let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
};




export const sendMail = async (to, subject, text, html = "", attachments = []) => {

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: process.env.SMTP_EMAIL,
      to,
      subject,
      text,
      html,
      attachments
    });
    console.log("Email sent successfully");


  } catch (error) {

    console.error("Email sending failed:", error);

  }

};