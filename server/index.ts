import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from 'cors';

// Load environment variables from .env file
dotenv.config();

// Force development mode if NODE_ENV is not explicitly set to production
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const app = express();
app.set('env', 'development'); // Force development mode to use Vite dev server
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Subdomain extraction middleware
const extractSubdomain = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const host = req.get('host');
  if (!host) {
    req.subdomain = 'main';
    return next();
  }

  const subdomain = host.split('.')[0];
  const baseDomain = process.env.BASE_DOMAIN || 'mkashop.online';

  // Check if it's a subdomain (not the main domain)
  if (host.includes('.') && !host.startsWith('www.') && host.endsWith(baseDomain)) {
    req.subdomain = subdomain;
  } else {
    req.subdomain = 'main';
  }

  next();
};

app.use(extractSubdomain);


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register payment routes
  const { default: paymentRoutes } = await import('./payment-routes.js');
  app.use('/api/payment', paymentRoutes);

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();