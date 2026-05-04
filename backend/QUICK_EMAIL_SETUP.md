# Quick Email Setup for OTP

## Option 1: Gmail Setup (Recommended)

### Step 1: Enable 2-Factor Authentication on Gmail
1. Go to your Google Account settings
2. Enable 2-Factor Authentication

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" for the app
3. Select "Other (Custom name)" and name it "Smart Job Tracker"
4. Click "Generate"
5. Copy the 16-character password

### Step 3: Add to .env file
Add these lines to your .env file:
```
SMTP_EMAIL=your-gmail@gmail.com
SMTP_PASSWORD=your-16-character-app-password
```

### Step 4: Restart backend server
Stop and restart: `npm run dev`

## Option 2: Brevo (Free Email Service)

### Step 1: Sign up for Brevo
1. Go to: https://www.brevo.com/
2. Create a free account
3. Verify your email

### Step 2: Get SMTP credentials
1. Go to SMTP & API in your Brevo dashboard
2. Copy your SMTP credentials

### Step 3: Add to .env file
```
SMTP_EMAIL=your-brevo-email
SMTP_PASSWORD=your-brevo-password
```

## Testing
After setup, try registering a new user. You should receive the OTP email instantly!

## Current Status
Email service is configured but needs real credentials to send actual emails.
Without credentials, the system shows debug OTP in the console and error response.
