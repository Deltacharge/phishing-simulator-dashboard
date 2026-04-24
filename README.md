# 🎣 Phishing Simulation Platform

An authorized phishing simulation tool built for **Privé Technologies** to assess employee security awareness. It sends tracked phishing emails, monitors who clicked and who submitted credentials, and provides a real-time campaign dashboard.

> ⚠️ **Disclaimer**: This tool is intended for **authorized security testing only**. Ensure you have proper written authorization before running any phishing simulation campaign.

---

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Setup Guide](#-setup-guide)
  - [1. Clone & Install Dependencies](#1-clone--install-dependencies)
  - [2. Create a Gmail App Password](#2-create-a-gmail-app-password)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Add Campaign Targets](#4-add-campaign-targets)
  - [5. Setup Ngrok (Public URL)](#5-setup-ngrok-public-url)
  - [6. Start the Application](#6-start-the-application)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Event Tracking](#-event-tracking)
- [API Endpoints](#-api-endpoints)

---

## ✨ Features

- 📧 **Email Dispatch** — Sends branded phishing emails via SMTP (Gmail, Outlook, SendGrid, etc.)
- 🔗 **Click Tracking** — Logs when a target clicks the "Update Password" link
- 📝 **Form Submission Tracking** — Logs when a target fills out and submits the password form
- 🆔 **Unique Reference IDs** — Each target gets a UUID for event correlation
- 📊 **Real-time Dashboard** — View campaign stats, click-through rates, and per-target activity
- 🛡️ **Awareness Page** — Educates users after they fall for the simulation
- 🔒 **Ethical by Design** — Passwords are **never** stored or logged

---

## 📦 Prerequisites

- **Node.js** (v16 or higher) — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Gmail Account** with 2-Step Verification enabled (for App Password)
- **Ngrok** (for public URL access) — [Download](https://ngrok.com/)

---

## 🔧 Setup Guide

### 1. Clone & Install Dependencies

```bash
cd "Phishing Simulation"
npm install
```

This installs: `express`, `nodemailer`, `uuid`, `dotenv`

---

### 2. Create a Gmail App Password

Gmail blocks direct password login for third-party apps. You need to generate an **App Password**:

#### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under **"How you sign in to Google"**, click **2-Step Verification**
3. Follow the prompts to enable it (use your phone number for verification)

#### Step 2: Generate an App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Or navigate: Google Account → Security → 2-Step Verification → App Passwords
2. In the **"App name"** field, type: `Phishing Simulation`
3. Click **Create**
4. Google will display a **16-character password** (e.g., `abcd efgh ijkl mnop`)
5. **Copy this password** — you'll need it for the `.env` file

> 💡 **Important**: This password is shown only once. If you lose it, you'll need to generate a new one.

> ⚠️ **Note**: If you don't see the "App Passwords" option, make sure 2-Step Verification is fully enabled and active.

---

### 3. Configure Environment Variables

Open the `.env` file in the project root and fill in your details:

```env
# ============================
# SMTP Configuration
# ============================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com          # Your Gmail address
SMTP_PASS=abcd efgh ijkl mnop           # The 16-char App Password from Step 2

# ============================
# Sender Identity (what the target sees)
# ============================
SENDER_NAME=IT Security Team
SENDER_EMAIL=it-security@company.com

# ============================
# Server Configuration
# ============================
SERVER_URL=https://your-ngrok-url.ngrok-free.dev   # Updated in Step 5
PORT=3000

# ============================
# Organization Branding
# ============================
ORG_NAME=Privé Technologies
```

#### SMTP Settings for Other Providers

| Provider    | SMTP_HOST             | SMTP_PORT | SMTP_USER          | SMTP_PASS          |
|-------------|----------------------|-----------|--------------------|--------------------|
| **Gmail**   | smtp.gmail.com        | 587       | your@gmail.com     | App Password       |
| **Outlook** | smtp.office365.com    | 587       | your@outlook.com   | Your password      |
| **SendGrid**| smtp.sendgrid.net     | 587       | `apikey`           | Your API key       |
| **Mailgun** | smtp.mailgun.org      | 587       | Your SMTP user     | Your SMTP password |

---

### 4. Add Campaign Targets

Edit `targets.json` with the names and emails of authorized test targets:

```json
[
  {
    "name": "John Doe",
    "email": "john.doe@company.com"
  },
  {
    "name": "Jane Smith",
    "email": "jane.smith@company.com"
  }
]
```

---

### 5. Setup Ngrok (Public URL)

Ngrok creates a public tunnel to your local server so phishing email links are clickable from any network (Gmail, Outlook, etc.).

#### Install Ngrok

```bash
# Ubuntu / Debian
sudo snap install ngrok

# Or download from https://ngrok.com/download
```

#### Sign Up & Authenticate (One-time)

1. Create a free account at [ngrok.com](https://dashboard.ngrok.com/signup)
2. Copy your **authtoken** from [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Run:

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

#### Start the Tunnel

```bash
ngrok http 3000
```

You'll see output like:

```
Forwarding   https://a1b2-c3d4-e5f6.ngrok-free.dev -> http://localhost:3000
```

#### Update `.env` with the Ngrok URL

Copy the `https://....ngrok-free.dev` URL and set it in your `.env`:

```env
SERVER_URL=https://a1b2-c3d4-e5f6.ngrok-free.dev
```

> ⚠️ **Important**: The free ngrok URL changes every time you restart ngrok. Always update `SERVER_URL` in `.env` after restarting the tunnel.

> 💡 **Keep ngrok running** in a separate terminal while the campaign is active.

---

### 6. Start the Application

Open a **separate terminal** (keep ngrok running in the first one):

```bash
npm start
```

You should see:

```
╔══════════════════════════════════════════════════╗
║   🎣 Phishing Simulation Server                  ║
╠══════════════════════════════════════════════════╣
║   Server:    https://xxxxx.ngrok-free.dev        ║
║   Dashboard: https://xxxxx.ngrok-free.dev/dashboard ║
║   Campaign:  GET https://xxxxx.ngrok-free.dev/send-campaign ║
║   Org:       Privé Technologies                  ║
╚══════════════════════════════════════════════════╝
```

---

## 🚀 Usage

### Sending a Campaign

1. Open the **Dashboard** in your browser: `http://localhost:3000/dashboard`
2. Click the **🚀 Send Campaign** button
3. Emails will be dispatched to all targets in `targets.json`
4. Monitor clicks and submissions in real-time on the dashboard

### Resetting Campaign Data

- Click the **🗑️ Reset** button on the dashboard
- This clears `events.log` and `target-registry.json`

### Running a New Campaign

1. Reset the previous campaign data
2. Update `targets.json` with new targets
3. Click **🚀 Send Campaign** again

---

## 📁 Project Structure

```
Phishing Simulation/
├── .env                          # SMTP & server configuration
├── package.json                  # Node.js dependencies
├── server.js                     # Express server (all routes & logic)
├── targets.json                  # Campaign target list (name + email)
├── events.log                    # Auto-generated event log (JSONL)
├── target-registry.json          # Auto-generated rid → target mapping
├── README.md                     # This file
├── templates/
│   └── phishing-email.html       # Phishing email HTML template
└── public/
    ├── PriveLogo.jpeg             # Company logo
    ├── login.html                 # Password update landing page
    ├── awareness.html             # Security awareness education page
    └── dashboard.html             # Real-time campaign dashboard
```

---

## 📊 Event Tracking

Every event is logged to `events.log` as a JSON line (JSONL format):

```json
{
  "rid": "a7f91c6b-6d28-4e22-a64c-47089793d695",
  "email": "john@company.com",
  "name": "John Doe",
  "event": "email_sent",
  "timestamp": "2026-04-23T05:24:06.031Z"
}
```

### Event Types

| Event         | Triggered When                                  |
|---------------|------------------------------------------------|
| `email_sent`  | Phishing email is dispatched to a target        |
| `clicked`     | Target clicks the "Update Password" link        |
| `submitted`   | Target fills out and submits the password form   |

All events for a target share the same `rid` (UUID v4) for easy correlation.

---

## 🔌 API Endpoints

| Route               | Method | Description                                    |
|---------------------|--------|------------------------------------------------|
| `/send-campaign`    | GET    | Sends phishing emails to all targets           |
| `/update-password`  | GET    | Serves the password form (tracks click)         |
| `/submit-password`  | POST   | Handles form submission (tracks submit)         |
| `/awareness`        | GET    | Serves the security awareness page              |
| `/dashboard`        | GET    | Serves the campaign dashboard                   |
| `/api/events`       | GET    | Returns all events as JSON array                |
| `/api/targets`      | GET    | Returns the target registry (rid → target map)  |
| `/api/reset`        | POST   | Clears all campaign data                        |

---

## 🧪 Quick Test Checklist

- [ ] `.env` is configured with valid SMTP credentials
- [ ] `targets.json` has at least one target
- [ ] Ngrok is running (`ngrok http 3000`)
- [ ] `SERVER_URL` in `.env` matches the ngrok URL
- [ ] Server is running (`npm start`)
- [ ] Send a test campaign to your own email first
- [ ] Verify the email arrives with the correct logo and branding
- [ ] Click the link and verify the click is logged on the dashboard
- [ ] Submit the form and verify the submission is logged

---

## 📝 License

Internal use only — Privé Technologies Security Team.
