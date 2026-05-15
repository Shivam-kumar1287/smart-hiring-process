import nodemailer from "nodemailer";



const transporter = nodemailer.createTransport({

  service: "gmail",

  auth: {

    user: process.env.SMTP_EMAIL,

    pass: process.env.SMTP_PASSWORD,

  },

});



export const sendMail = async (to, subject, text, html = "", attachments = []) => {

  try {

    await transporter.sendMail({

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