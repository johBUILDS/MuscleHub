import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import crypto from "crypto";
import Membership from "../models/Membership.js";

dotenv.config();

const router = express.Router();

// Handle successful payment
router.get("/success", async (req, res) => {
  try {
    const { planId, userId } = req.query;
    console.log("Payment success - Query params:", req.query);
    
    // Determine plan name based on planId
    const plans = [
      { id: 1, name: "Day Pass" },
      { id: 2, name: "Monthly Plan" },
      { id: 3, name: "Quarterly Plan" }
    ];
    
    const plan = plans.find(p => p.id === parseInt(planId));
    if (!plan) {
      console.error("Invalid plan ID:", planId);
      throw new Error("Invalid plan ID");
    }

    console.log("Activating membership for:", { userId, planId, planName: plan.name });
      // NOTE: Activation is performed via webhook for security. Do NOT activate here to avoid
      // accidental or forged GET requests. PayMongo will POST to /api/payment/webhook when the
      // payment is confirmed and the webhook handler will create the membership.
      console.log("Skipping direct activation on success redirect; webhook will handle activation.");

      // Redirect to membership page so frontend shows the success message (webhook will create the plan)
      res.redirect("http://localhost:3000/membership?success=true");
  } catch (error) {
    console.error("Error processing payment success:", error);
    res.redirect("http://localhost:3000/membership?error=activation-failed");
  }
});

// ✅ CREATE CHECKOUT SESSION (with required line_items)
router.post("/create-checkout", async (req, res) => {
  const { amount, description } = req.body;

  console.log("📩 Checkout request received:", { amount, description });

  if (!process.env.PAYMONGO_SECRET_KEY) {
    console.error("❌ PAYMONGO_SECRET_KEY missing in .env");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    console.log("Creating checkout with data:", req.body);
    const amountInCentavos = Math.round(amount * 100);

    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            line_items: [
              {
                name: description || "MuscleHub Membership",
                amount: amountInCentavos,
                currency: "PHP",
                quantity: 1,
              },
            ],
            payment_method_types: ["gcash", "grab_pay", "card"],
            // Attach planId and userId as metadata so webhooks can reference them
            metadata: {
              planId: req.body.planId,
              userId: req.body.userId
            },
            success_url: `http://localhost:5000/api/payment/success?planId=${req.body.planId}&userId=${encodeURIComponent(req.body.userId)}`,
            cancel_url: "http://localhost:3000/membership",
            description: `${description} - User: ${req.body.userId}`,
          },
        },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            process.env.PAYMONGO_SECRET_KEY + ":"
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Checkout session created:", response.data.data.id);

    // Send PayMongo checkout link to frontend
    const checkoutUrl = response.data.data.attributes.checkout_url;
    res.json({ url: checkoutUrl });
  } catch (err) {
    console.error("❌ PayMongo API error:");
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .json({ error: err.response?.data || err.message || "Payment failed" });
  }
});

// Webhook endpoint to receive PayMongo events (recommended to configure in PayMongo dashboard)
// It will optionally verify a signature if PAYMONGO_WEBHOOK_SECRET is set in env.
router.post(
  "/webhook",
  // Use raw body so we can verify signature if needed
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const sigHeader = req.headers["paymongo-signature"] || req.headers["paymongo-signature".toLowerCase()] || req.headers["x-paymongo-signature"] || req.headers["paymongo-signature"] || req.headers["signature"];

      // If webhook secret is configured, validate signature according to PayMongo docs.
      // PayMongo sends a header like: t=1496734173,te=...,li=...
      // Verification steps:
      // 1) parse t (timestamp), te (test signature), li (live signature)
      // 2) compute HMAC-SHA256(secret, `${t}.${rawBody}`)
      // 3) compare to te (test) or li (live) depending on mode
      if (process.env.PAYMONGO_WEBHOOK_SECRET) {
        if (!sigHeader) {
          console.warn("Webhook received without Paymongo-Signature header");
          return res.status(400).send("Missing signature");
        }

        // Parse signature header parts
        const parts = {};
        sigHeader.split(',').forEach((p) => {
          const [k, v] = p.split('=');
          if (k && v) parts[k.trim()] = v.trim();
        });

        const timestamp = parts.t;
        const testSig = parts.te;
        const liveSig = parts.li;

        if (!timestamp) {
          console.warn('Missing timestamp in Paymongo-Signature header');
          return res.status(400).send('Invalid signature header');
        }

        // Protect against replay attacks: allow +/- 5 minutes
        const now = Math.floor(Date.now() / 1000);
        const ts = parseInt(timestamp, 10);
        if (isNaN(ts) || Math.abs(now - ts) > 300) {
          console.warn('Webhook timestamp outside tolerance:', { now, ts });
          return res.status(400).send('Stale signature');
        }

        // Raw body must be used for signature computation
        const raw = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
        const signedString = `${timestamp}.${raw}`;
        const computed = crypto.createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET).update(signedString).digest('hex');

        // Decide which signature to compare: use live if running in production or PAYMONGO_WEBHOOK_LIVE=true
        const useLive = process.env.PAYMONGO_WEBHOOK_LIVE === 'true' || process.env.NODE_ENV === 'production';
        const expectedSig = useLive ? liveSig || testSig : testSig || liveSig;

        if (!expectedSig) {
          console.warn('No signature value available in header to compare against');
          return res.status(400).send('Invalid signature header');
        }

        if (computed !== expectedSig) {
          console.warn('Invalid webhook signature (computed mismatch)');
          return res.status(400).send('Invalid signature');
        }
      }

      // req.body may be a Buffer (when express.raw used) or already parsed JSON (if another parser ran).
      let payload;
      if (Buffer.isBuffer(req.body)) {
        const raw = req.body.toString();
        payload = JSON.parse(raw);
      } else {
        // already parsed
        payload = req.body;
      }

      console.log("📬 PayMongo webhook payload:", payload?.type || "(no type)");

      const eventType = payload.type;
      const attrs = payload.data?.attributes || {};
      const metadata = attrs.metadata || {};

      // Heuristic: treat checkout.session.completed or status=paid as successful payment
      const isPaid = eventType === "checkout.session.completed" || attrs.status === "paid" || attrs.payment_status === "paid";

      if (isPaid) {
        const planId = metadata.planId || metadata.plan_id;
        const userId = metadata.userId || metadata.user_id;

        if (!planId || !userId) {
          console.warn("Webhook paid event missing metadata (planId/userId). Skipping activation.");
          return res.status(200).send("ignored");
        }

        // Prevent duplicate activations
        const existing = await Membership.findOne({ userId, status: 'active' });
        if (existing) {
          console.log(`User ${userId} already has active membership (plan ${existing.planId}). Skipping activation.`);
          return res.status(200).send("already_active");
        }

        const membership = new Membership({
          userId,
          planId: parseInt(planId, 10),
          planName: metadata.planName || `Plan ${planId}`,
          startDate: new Date(),
          status: 'active'
        });

        await membership.save();
        console.log(`Activated membership for user ${userId} via webhook (plan ${planId})`);
      }

      res.status(200).send("ok");
    } catch (err) {
      console.error("❌ Error handling webhook:", err);
      res.status(500).send("webhook error");
    }
  }
);

export default router;
