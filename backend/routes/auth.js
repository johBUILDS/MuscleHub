// backend/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail } from "../utils/emailService.js";

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

// ✅ LOGIN ROUTE - STEP 1: Verify credentials and send verification code
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

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save verification code to user
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = expiresAt;
    await user.save();

    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, user.name, verificationCode);
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        message: "Failed to send verification email. Please check your email configuration.",
        error: emailResult.error 
      });
    }

    console.log("✅ Verification code sent to:", user.email);
    
    // Send response indicating 2FA is required
    res.json({
      message: "Verification code sent to your email",
      requiresVerification: true,
      email: user.email,
      userId: user._id
    });
    
  } catch (err) {
    console.error("❌ Error during login:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ LOGIN ROUTE - STEP 2: Verify code and complete login
router.post("/verify-code", async (req, res) => {
  try {
    console.log("📩 Verify code request:", req.body);
    
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ message: "User ID and code are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if code is expired
    if (new Date() > user.verificationCodeExpires) {
      return res.status(400).json({ message: "Verification code has expired. Please login again." });
    }

    // Check if code matches
    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Clear verification code
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    user.isVerified = true;
    await user.save();

    // ✅ Create token and include role
    const tokenPayload = { id: user._id.toString(), role: user.role };
    console.log('🔐 Creating token with payload:', tokenPayload);
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "24h" }
    );
    
    console.log('✅ Token created successfully');

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
      role: user.role || "member",
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

// ✅ FORGOT PASSWORD - STEP 1: Send reset code
router.post("/forgot-password", async (req, res) => {
  try {
    console.log("📩 Forgot password request:", req.body);
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ 
        message: "If an account exists with this email, you will receive a password reset code.",
        emailSent: true
      });
    }

    // Generate reset code
    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset code to user
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    // Send reset email
    const emailResult = await sendPasswordResetEmail(user.email, user.name, resetCode);
    
    if (!emailResult.success) {
      return res.status(500).json({ 
        message: "Failed to send reset email. Please check your email configuration.",
        error: emailResult.error 
      });
    }

    console.log("✅ Password reset code sent to:", user.email);
    
    res.json({
      message: "Password reset code sent to your email",
      emailSent: true,
      email: user.email
    });
    
  } catch (err) {
    console.error("❌ Error in forgot password:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ FORGOT PASSWORD - STEP 2: Verify reset code
router.post("/verify-reset-code", async (req, res) => {
  try {
    console.log("📩 Verify reset code request:", req.body);
    
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid request" });
    }

    // Check if code is expired
    if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ message: "Reset code has expired. Please request a new one." });
    }

    // Check if code matches
    if (user.resetPasswordCode !== code) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    console.log("✅ Reset code verified for:", user.email);
    
    res.json({
      message: "Code verified successfully",
      verified: true,
      userId: user._id
    });
    
  } catch (err) {
    console.error("❌ Error verifying reset code:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ FORGOT PASSWORD - STEP 3: Reset password
router.post("/reset-password", async (req, res) => {
  try {
    console.log("📩 Reset password request for user:", req.body.email);
    
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, code, and new password are required" });
    }

    // Validate password requirements
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }
    
    if (newPassword.length > 12) {
      return res.status(400).json({ message: "Password must not exceed 12 characters" });
    }
    
    if (specialCharRegex.test(newPassword)) {
      return res.status(400).json({ message: "Password should only contain letters and numbers" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid request" });
    }

    // Check if code is expired
    if (!user.resetPasswordExpires || new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ message: "Reset code has expired. Please request a new one." });
    }

    // Check if code matches
    if (user.resetPasswordCode !== code) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log("✅ Password reset successful for:", user.email);
    
    res.json({
      message: "Password reset successful. You can now login with your new password.",
      success: true
    });
    
  } catch (err) {
    console.error("❌ Error resetting password:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
