import express from "express";
import Membership from "../models/Membership.js";

const router = express.Router();

// ✅ GET /api/membership/active/:name
router.get("/active/:name", async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`🔍 Checking membership for user: "${name}"`);
    
    const membership = await Membership.findOne({ 
      userId: name,
      status: 'active'
    });

    console.log(`📋 Membership found:`, membership);

    if (membership) {
      return res.json({ 
        planId: membership.planId,
        planName: membership.planName
      });
    }
    
    // Return empty plan instead of 404
    console.log(`ℹ️ No active plan found for "${name}"`);
    return res.json({ 
      planId: null,
      planName: null,
      message: "No active plan"
    });
  } catch (error) {
    console.error("❌ Error fetching membership:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ POST /api/membership/activate
router.post("/activate", async (req, res) => {
  try {
    const { userId, planId, planName } = req.body;
    
    // Check if user already has an active plan
    const existingPlan = await Membership.findOne({ 
      userId, 
      status: 'active'
    });

    if (existingPlan) {
      existingPlan.status = 'expired';
      await existingPlan.save();
    }

    // Create new membership
    const membership = new Membership({
      userId,
      planId,
      planName,
      startDate: new Date(),
      status: 'active'
    });

    await membership.save();
    res.json({ success: true, membership });
  } catch (error) {
    console.error("Error activating membership:", error);
    res.status(500).json({ message: "Error activating membership" });
  }
});

export default router;
