// backend/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// ✅ SIGNUP ROUTE
router.post("/signup", async (req, res) => {
  try {
    console.log("📩 Signup body:", req.body);

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "member", // Default role if none provided
    });

    await newUser.save();
    console.log("✅ User saved:", newUser);

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("❌ Error during signup:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    console.log("📩 Login request body:", req.body);
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password mismatch for:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ✅ Create token and include role
    const tokenPayload = { id: user._id.toString(), role: user.role };
    console.log('🔐 Creating token with payload:', tokenPayload);
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "24h" } // Extended to 24 hours
    );
    
    console.log('✅ Token created successfully');
    console.log('🔑 JWT_SECRET being used:', process.env.JWT_SECRET ? 'Set' : 'Not set');

    // ✅ Send token + user data to frontend
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || "member",
      phone: user.phone,
      dob: user.dob,
      goal: user.goal || "No goal set",
      avatar: user.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=2662&auto-format&fit=crop'
    };

    res.json({
      message: "Login successful",
      token,
      role: user.role || "member", // ✅ Include role at top level for frontend
      user: userData
    });
    
    console.log("✅ Login successful for:", user.email);
  } catch (err) {
    console.error("❌ Error during login:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔧 TEMPORARY: Create admin user (remove after use)
router.post("/create-admin", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = new User({
      name: name || "Admin User",
      email,
      password: hashedPassword,
      role: "admin"
    });

    await adminUser.save();
    console.log("✅ Admin user created:", adminUser.email);

    res.status(201).json({ 
      message: "Admin user created successfully",
      email: adminUser.email,
      role: adminUser.role
    });
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
