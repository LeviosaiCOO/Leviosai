import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { initSentry, Sentry } from "./lib/sentry.js";

// Initialize Sentry before anything else
initSentry();
import { checkDatabaseConnection, closeDatabaseConnection } from "./lib/db.js";
import apiRoutes from "./routes/api.js";
import authRoutes from "./routes/auth.js";
import messagingRoutes from "./routes/messaging.js";
import aiRoutes from "./routes/ai.js";
import billingRoutes from "./routes/billing.js";
import webhookRoutes from "./routes/webhooks.js";
import reactorRoutes from "./routes/reactor.js";
import sandboxRoutes from "./routes/sandbox.js";
import { Reactor } from "./reactor/reactor.js";
import { createAllAgents } from "./reactor/agents/index.js";
import { authLimiter, apiLimiter, aiLimiter, messagingLimiter } from "./lib/rate-limit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3000");
const isProd = process.env.NODE_ENV === "production";

// Stripe webhook needs raw body — must be registered before express.json()
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/leads/:id/sms", messagingLimiter);
app.use("/api/leads/:id/email", messagingLimiter);
app.use("/api/leads/:id/call", messagingLimiter);
app.use("/api", apiLimiter);

// API Routes
app.use(authRoutes);
app.use(billingRoutes);
app.use(webhookRoutes);
app.use(apiRoutes);
app.use(messagingRoutes);
app.use(aiRoutes);
app.use(reactorRoutes);
app.use(sandboxRoutes);

// Sentry error handler (must be after routes, before Vite/static)
Sentry.setupExpressErrorHandler(app);

async function setupVite() {
  if (isProd) {
    // Production: serve built client files
    const distPath = path.resolve(__dirname, "client/dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Development: use Vite dev server as middleware
    const { createServer } = await import("vite");
    const vite = await createServer({
      root: path.resolve(__dirname, "client"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
}

// Start
async function start() {
  console.log("\n🚀 Leviosai CRM Server Starting...\n");

  // Check database (non-blocking — frontend still loads without DB)
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    console.warn("⚠️  Database unavailable — API routes will fail but frontend will load. Check your DATABASE_URL.");
  }

  // Start Reactor (agent orchestrator)
  console.log("\n⚡ Initializing Reactor...");
  const reactor = Reactor.getInstance();
  reactor.registerAgents(createAllAgents());
  reactor.start();

  // Setup frontend
  await setupVite();

  app.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard:     GET http://localhost:${PORT}/api/dashboard`);
    console.log(`👥 Leads:         GET http://localhost:${PORT}/api/leads`);
    console.log(`📅 Appointments:  GET http://localhost:${PORT}/api/appointments`);
    console.log(`💚 Health:        GET http://localhost:${PORT}/api/health\n`);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await closeDatabaseConnection();
  process.exit(0);
});

start();
