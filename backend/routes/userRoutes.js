// backend/routes/userRoutes.js
import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get user profile
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    console.log('📝 Profile update request received');
    console.log('👤 User ID:', req.user.id);
    console.log('📦 Request body:', req.body);
    
    const { name, email, phone, dob, goal, avatar } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ message: "User not found" });
    }

    console.log('📊 Current user data:', { name: user.name, email: user.email, phone: user.phone, dob: user.dob, goal: user.goal });

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.dob = dob || user.dob;
    user.goal = goal || user.goal;
    user.avatar = avatar || user.avatar;

    console.log('💾 Saving updated user data:', { name: user.name, email: user.email, phone: user.phone, dob: user.dob, goal: user.goal });

    await user.save();
    
    // Return user without password
    const updatedUser = await User.findById(req.user.id).select('-password');
    
    console.log('✅ Profile updated successfully');
    console.log('📤 Sending response:', updatedUser);
    
    res.json(updatedUser);
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all users for leaderboard (excluding passwords)
router.get("/leaderboard", authMiddleware, async (req, res) => {
  try {
    // Fetch all users except the current user, without password field
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('-password')
      .limit(50); // Limit to top 50 users
    
    res.json(users);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users (for name validation during signup)
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).select('name email');
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Save BMI data to user profile
router.post("/bmi", authMiddleware, async (req, res) => {
  try {
    const { height, weight, bmi, category } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const today = new Date().toLocaleDateString();

    // Ensure one entry per day
    if (user.bmiHistory && user.bmiHistory.length > 0) {
      const latest = user.bmiHistory[0];
      if (latest && latest.date === today) {
        return res.status(400).json({ success: false, message: 'BMI already recorded for today' });
      }
    }

    const bmiEntry = {
      id: Date.now(),
      date: today,
      time: new Date().toLocaleTimeString(),
      height,
      weight,
      bmi,
      category
    };

    // Add to beginning of array (most recent first)
    if (!user.bmiHistory) {
      user.bmiHistory = [];
    }
    user.bmiHistory.unshift(bmiEntry);

    // Keep only last 50 entries
    if (user.bmiHistory.length > 50) {
      user.bmiHistory = user.bmiHistory.slice(0, 50);
    }

    await user.save();
    
    res.json({ success: true, bmiHistory: user.bmiHistory });
  } catch (err) {
    console.error("Error saving BMI:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

// ADMIN ROUTES FOR BMI MANAGEMENT
// Delete a specific BMI entry for a user (admin only)
router.delete("/bmi/:userId/:entryId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { userId, entryId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const before = user.bmiHistory?.length || 0;
    user.bmiHistory = (user.bmiHistory || []).filter(e => String(e.id) !== String(entryId));
    const after = user.bmiHistory?.length || 0;

    await user.save();

    return res.json({ success: true, removed: before - after, bmiHistory: user.bmiHistory });
  } catch (err) {
    console.error('Error deleting BMI entry:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear all BMI history for a user (admin only)
router.delete("/bmi/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.bmiHistory = [];
    await user.save();

    return res.json({ success: true, bmiHistory: [] });
  } catch (err) {
    console.error('Error clearing BMI history:', err);
    res.status(500).json({ message: 'Server error' });
  }
});