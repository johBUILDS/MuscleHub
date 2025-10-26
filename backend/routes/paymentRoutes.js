import express from "express";
import axios from "axios";
import dotenv from "dotenv";

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

    // Activate the membership
    const activateResponse = await axios.post("http://localhost:5000/api/membership/activate", {
      userId,
      planId: parseInt(planId),
      planName: plan.name
    });

    console.log("Membership activated:", activateResponse.data);

    // Redirect to home page to show active plan
    res.redirect("http://localhost:3000/home");
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

export default router;
