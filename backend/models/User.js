import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  dob: { type: Date },
  avatar: { 
    type: String, 
    default: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=2662&auto-format&fit=crop' 
  },
  goal: { 
    type: String, 
    default: 'No goal set' 
  },
  bmiHistory: {
    type: Array,
    default: []
  },
  
  // ✅ FIX: Correct enum values (match your frontend)
  role: {
    type: String,
    enum: ["admin", "member", "client"], // add valid role names
    default: "member", // default for normal users
  },
  
  // Two-Factor Authentication fields
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  isVerified: { type: Boolean, default: false },
  
  // Password Reset fields
  resetPasswordCode: { type: String },
  resetPasswordExpires: { type: Date },
});

const User = mongoose.model("User", userSchema);
export default User;
