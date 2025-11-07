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
        planName: membership.planName,
        startDate: membership.startDate,
        status: membership.status
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
    // If an active membership exists, reject activation to prevent double-purchase
    if (existingPlan) {
      console.log(`User ${userId} already has an active membership (planId=${existingPlan.planId}). Activation blocked.`);
      return res.status(400).json({ success: false, message: 'User already has an active membership' });
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

// ✅ ADMIN: Membership summary grouped by user
router.get("/admin/summary", async (req, res) => {
  try {
    // Fetch all memberships and group by userId
    const memberships = await Membership.find({}).sort({ startDate: -1 }).lean();
    const summary = {};
    for (const m of memberships) {
      if (!summary[m.userId]) {
        summary[m.userId] = { active: null, history: [] };
      }
      if (m.status === 'active' && !summary[m.userId].active) {
        summary[m.userId].active = {
          planId: m.planId,
          planName: m.planName,
          startDate: m.startDate,
          status: m.status
        };
      }
      summary[m.userId].history.push({
        planId: m.planId,
        planName: m.planName,
        startDate: m.startDate,
        status: m.status
      });
    }
    res.json(summary);
  } catch (error) {
    console.error("Error building membership summary:", error);
    res.status(500).json({ message: "Failed to fetch membership summary" });
  }
});

export default router;
