import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn("STRIPE_SECRET_KEY is not set. Stripe functionality will be limited.");
    }
    stripeClient = new Stripe(key || "sk_test_placeholder");
  }
  return stripeClient;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    stripeKeySet: !!process.env.STRIPE_SECRET_KEY,
    env: process.env.NODE_ENV || "development",
    time: new Date().toISOString()
  });
});

// Stripe Checkout Session Endpoint
app.post("/api/create-checkout-session", async (req, res) => {
  console.log("POST /api/create-checkout-session - Request body:", req.body);
  try {
    const { email } = req.body;
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY");
      return res.status(500).json({ error: "Stripe API key is not configured on the server. Please add STRIPE_SECRET_KEY to your environment variables." });
    }

    const stripe = getStripe();
    // Use APP_URL from environment or fallback to origin for local dev
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    console.log("Using appUrl for redirects:", appUrl);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "HireQuest AI Pro",
              description: "Lifetime access to advanced interview simulations and detailed feedback.",
            },
            unit_amount: 999, // $9.99
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: email,
      success_url: `${appUrl}?session_id={CHECKOUT_SESSION_ID}&payment=success`,
      cancel_url: `${appUrl}?payment=cancel`,
    });

    console.log("Stripe session created:", session.id);
    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe Error Details:", error);
    res.status(500).json({ error: error.message || "Internal Server Error during Stripe session creation" });
  }
});

// Verify Session Endpoint (Simple check for demo purposes)
app.get("/api/verify-session", async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: "Missing session_id" });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    if (session.payment_status === "paid") {
      res.json({ status: "paid" });
    } else {
      res.json({ status: "unpaid" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  
  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
} else {
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile("dist/index.html", { root: "." });
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SYSTEM CHECK] Server running on http://localhost:${PORT}`);
  console.log(`[SYSTEM CHECK] Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`[SYSTEM CHECK] Stripe Key Set: ${!!process.env.STRIPE_SECRET_KEY}`);
});
