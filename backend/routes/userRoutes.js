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
    const { name, email, phone, dob, goal, avatar } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.dob = dob || user.dob;
    user.goal = goal || user.goal;
    user.avatar = avatar || user.avatar;

    await user.save();
    
    // Return user without password
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error" });
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

// Save BMI data to user profile
router.post("/bmi", authMiddleware, async (req, res) => {
  try {
    const { height, weight, bmi, category } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bmiEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
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