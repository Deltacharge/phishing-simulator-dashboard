require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
const ORG_NAME = process.env.ORG_NAME || "Your Organization";

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── File Paths ───────────────────────────────────────────────────────────────
const EVENTS_LOG = path.join(__dirname, "events.log");
const TARGET_REGISTRY = path.join(__dirname, "target-registry.json");
const TARGETS_FILE = path.join(__dirname, "targets.json");
const EMAIL_TEMPLATE = path.join(__dirname, "templates", "phishing-email.html");

// ─── Nodemailer Transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ─── Helper: append event to log ──────────────────────────────────────────────
function logEvent(data) {
  const entry = {
    ...data,
    timestamp: new Date().toISOString(),
  };
  fs.appendFileSync(EVENTS_LOG, JSON.stringify(entry) + "\n");
  console.log(`[EVENT] ${entry.event} — rid: ${entry.rid}`);
}

// ─── Helper: read target registry ─────────────────────────────────────────────
function getRegistry() {
  if (!fs.existsSync(TARGET_REGISTRY)) return {};
  try {
    return JSON.parse(fs.readFileSync(TARGET_REGISTRY, "utf-8"));
  } catch {
    return {};
  }
}

// ─── Helper: save target registry ─────────────────────────────────────────────
function saveRegistry(registry) {
  fs.writeFileSync(TARGET_REGISTRY, JSON.stringify(registry, null, 2));
}

// ─── Helper: read events log ─────────────────────────────────────────────────
function getEvents() {
  if (!fs.existsSync(EVENTS_LOG)) return [];
  const raw = fs.readFileSync(EVENTS_LOG, "utf-8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── 1. SEND CAMPAIGN ─────────────────────────────────────────────────────────
// GET /send-campaign — reads targets.json, assigns UIDs, sends emails
app.get("/send-campaign", async (req, res) => {
  try {
    // Read targets
    if (!fs.existsSync(TARGETS_FILE)) {
      return res.status(400).json({ error: "targets.json not found. Create it first." });
    }
    const targets = JSON.parse(fs.readFileSync(TARGETS_FILE, "utf-8"));
    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ error: "targets.json is empty or invalid." });
    }

    // Read email template
    if (!fs.existsSync(EMAIL_TEMPLATE)) {
      return res.status(500).json({ error: "Email template not found at templates/phishing-email.html" });
    }
    const templateRaw = fs.readFileSync(EMAIL_TEMPLATE, "utf-8");

    // Load or create registry
    const registry = getRegistry();

    const results = [];

    for (const target of targets) {
      const { name, email } = target;
      if (!name || !email) {
        results.push({ email: email || "unknown", status: "skipped", reason: "missing name or email" });
        continue;
      }

      // Check if already sent (avoid duplicates)
      const existingEntry = Object.entries(registry).find(([, v]) => v.email === email);
      if (existingEntry) {
        results.push({ email, status: "skipped", reason: "already in registry", rid: existingEntry[0] });
        continue;
      }

      // Generate unique reference ID
      const rid = uuidv4();
      const trackingLink = `${SERVER_URL}/update-password?rid=${rid}`;

      // Personalize email
      const htmlBody = templateRaw
        .replace(/\{\{NAME\}\}/g, name)
        .replace(/\{\{LINK\}\}/g, trackingLink)
        .replace(/\{\{ORG_NAME\}\}/g, ORG_NAME)
        .replace(/\{\{SERVER_URL\}\}/g, SERVER_URL)
        .replace(/\{\{RID\}\}/g, rid);

      // Send email
      try {
        await transporter.sendMail({
          from: `"${process.env.SENDER_NAME || "IT Security"}" <${process.env.SMTP_USER}>`,
          to: email,
          subject: `[Action Required] Password Expiry Notice — ${ORG_NAME}`,
          html: htmlBody,
          attachments: [
            {
              filename: "logo.jpeg",
              path: path.join(__dirname, "public", "PriveLogo.jpeg"),
              cid: "logo",
            },
          ],
        });

        // Register target
        registry[rid] = { name, email, sentAt: new Date().toISOString() };

        // Log event
        logEvent({ rid, email, name, event: "email_sent" });

        results.push({ email, status: "sent", rid });
      } catch (mailErr) {
        console.error(`Failed to send to ${email}:`, mailErr.message);
        results.push({ email, status: "failed", error: mailErr.message });
      }
    }

    // Save updated registry
    saveRegistry(registry);

    res.json({
      message: "Campaign dispatch complete",
      summary: {
        total: targets.length,
        sent: results.filter((r) => r.status === "sent").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        failed: results.filter((r) => r.status === "failed").length,
      },
      details: results,
    });
  } catch (err) {
    console.error("Campaign error:", err);
    res.status(500).json({ error: "Campaign failed", details: err.message });
  }
});

// ─── 2. TRACKING PIXEL — detect email opens ──────────────────────────────────
// GET /track/open?rid=xxx — returns a 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

app.get("/track/open", (req, res) => {
  const rid = req.query.rid;

  if (rid) {
    const registry = getRegistry();
    const target = registry[rid] || {};

    logEvent({
      rid,
      email: target.email || "unknown",
      name: target.name || "unknown",
      event: "opened",
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  }

  // Return 1x1 transparent GIF
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": TRANSPARENT_GIF.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(TRANSPARENT_GIF);
});

// ─── 3. TRACK CLICK — serve password update form ─────────────────────────────
// GET /update-password?rid=xxx
app.get("/update-password", (req, res) => {
  const rid = req.query.rid;
  if (!rid) {
    return res.status(400).send("Invalid request — missing reference ID.");
  }

  // Log the click event
  const registry = getRegistry();
  const target = registry[rid] || {};

  logEvent({
    rid,
    email: target.email || "unknown",
    name: target.name || "unknown",
    event: "clicked",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Serve the login page
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ─── 3. HANDLE FORM SUBMISSION ───────────────────────────────────────────────
// POST /submit-password
app.post("/submit-password", (req, res) => {
  const { rid, email } = req.body;

  // Look up target info
  const registry = getRegistry();
  const target = registry[rid] || {};

  logEvent({
    rid: rid || "unknown",
    email: email || target.email || "unknown",
    name: target.name || "unknown",
    event: "submitted",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // NOTE: Password is intentionally NOT logged — ethical safeguard

  // Redirect to awareness page
  res.redirect("/awareness");
});

// ─── 4. AWARENESS PAGE ──────────────────────────────────────────────────────
app.get("/awareness", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "awareness.html"));
});

// ─── 5. DASHBOARD ───────────────────────────────────────────────────────────
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ─── 6. API: Get all events ─────────────────────────────────────────────────
app.get("/api/events", (req, res) => {
  res.json(getEvents());
});

// ─── 7. API: Get target registry ────────────────────────────────────────────
app.get("/api/targets", (req, res) => {
  res.json(getRegistry());
});

// ─── 8. API: Reset campaign (clears log + registry) ────────────────────────
app.post("/api/reset", (req, res) => {
  try {
    if (fs.existsSync(EVENTS_LOG)) fs.writeFileSync(EVENTS_LOG, "");
    if (fs.existsSync(TARGET_REGISTRY)) fs.unlinkSync(TARGET_REGISTRY);
    res.json({ message: "Campaign data reset successfully." });
  } catch (err) {
    res.status(500).json({ error: "Reset failed", details: err.message });
  }
});

// ─── Static fallback ────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));

// ─── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║   🎣 Phishing Simulation Server                  ║`);
  console.log(`╠══════════════════════════════════════════════════╣`);
  console.log(`║   Server:    ${SERVER_URL.padEnd(35)}║`);
  console.log(`║   Dashboard: ${(SERVER_URL + "/dashboard").padEnd(35)}║`);
  console.log(`║   Campaign:  GET ${(SERVER_URL + "/send-campaign").padEnd(31)}║`);
  console.log(`║   Org:       ${ORG_NAME.padEnd(35)}║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);
});