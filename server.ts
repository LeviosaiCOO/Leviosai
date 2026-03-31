import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { checkDatabaseConnection, closeDatabaseConnection } from "./lib/db.js";
import apiRoutes from "./routes/api.js";
import authRoutes from "./routes/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || "3000");
const isProd = process.env.NODE_ENV === "production";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use(authRoutes);
app.use(apiRoutes);

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
