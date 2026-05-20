# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.



# Smart Job Tracker

A modern job tracking web application built using React and Vite.  
Users can manage job applications, track interview status, and organize opportunities efficiently.

## 🚀 Features

- Add and manage job applications
- Track application status
- Responsive UI
- Fast performance with Vite
- Modern React components

## 🛠 Tech Stack

- React
- Vite
- JavaScript
- Tailwind CSS
- Node.js

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/Shivam-kumar1287/newmern_smart_job_tracker_


# Email Service Setup Guide

## Problem
The OTP emails are not being sent because SMTP credentials are missing from the environment variables.

## Solution: Configure Gmail SMTP

### Step 1: Enable 2-Factor Authentication on your Gmail account
1. Go to your Google Account settings
2. Enable 2-Factor Authentication (2FA)

### Step 2: Create an App Password
1. Go to Google Account settings > Security
2. Click on "App passwords"
3. Select "Mail" for the app
4. Select "Other (Custom name)" and name it "Smart Job Tracker"
5. Click "Generate"
6. Copy the 16-character password (this is your SMTP_PASSWORD)

### Step 3: Update your .env file
Add these lines to your `.env` file in the backend directory:

```
SMTP_EMAIL=your-gmail-address@gmail.com
SMTP_PASSWORD=your-16-character-app-password
```

### Step 4: Restart the server
Stop the current server (Ctrl+C) and restart it:
```bash
npm run dev
```

## Alternative: Use a different email service

If you prefer not to use Gmail, you can use other SMTP services:

### Option 1: Outlook/Hotmail
```
SMTP_EMAIL=your-outlook-email@outlook.com
SMTP_PASSWORD=your-outlook-password
```

### Option 2: SendGrid (Recommended for production)
1. Sign up for SendGrid
2. Create an API key
3. Update mailer.js to use SendGrid instead of nodemailer

## Testing
After configuring the credentials, test the email service by:
1. Trying to register a new user
2. Check the console for "Email sent successfully" message
3. Check your email inbox for the OTP

## Common Issues
- **"Missing credentials for PLAIN"**: This means SMTP_EMAIL or SMTP_PASSWORD is missing/incorrect
- **"Invalid login"**: Check that you're using an App Password (not your regular Gmail password)
- ****Gmail blocking**: Make sure to use an App Password, not your regular password
