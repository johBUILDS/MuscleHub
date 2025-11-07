import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import paymentRoutes from "./routes/paymentRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import Plan from "./models/Plan.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// Log incoming requests and normalize URLs (strip stray CR/LF that can become %0A)
app.use((req, res, next) => {
  // Log method and raw url for debugging
  console.log(`Incoming request: ${req.method} ${req.url}`);

  // If a request URL contains CR or LF characters, strip them.
  // Some clients (or copy/paste into Postman) can accidentally add a newline which
  // becomes %0A and prevents Express from matching the route.
  if (req.url && /[\r\n]/.test(req.url)) {
    req.url = req.url.replace(/[\r\n]/g, "");
  }
  // originalUrl may also be used by some middleware; normalize it as well if present
  if (req.originalUrl && /[\r\n]/.test(req.originalUrl)) {
    req.originalUrl = req.originalUrl.replace(/[\r\n]/g, "");
  }

  next();
});
app.use("/api/membership", membershipRoutes);


//  CONNECT TO MONGODB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    try {
      const planCount = await Plan.countDocuments();
      if (planCount === 0) {
        await Plan.insertMany([
          { id: 1, name: "Day Pass", price: 129, duration: "day", features: [
            "Single-day access to one club",
            "Perfect for trying out a gym"
          ] },
          { id: 2, name: "1 Month (Upfront)", price: 1249, duration: "month", features: [
            "One-time payment",
            "No lock-in contract"
          ] },
          { id: 3, name: "1 Month (Autodebit)", price: 1149, duration: "month", features: [
            "Convenient monthly billing",
            "Cancel or pause anytime"
          ] },
          { id: 4, name: "3 Months", price: 3249, duration: "3 months", features: [
            "Total: ₱3,249",
            "Good value & flexibility"
          ] },
          { id: 5, name: "6 Months", price: 5994, duration: "6 months", features: [
            "Total: ₱5,994",
            "Popular mid-term option"
          ] },
          { id: 6, name: "12 Months", price: 11388, duration: "12 months", features: [
            "Total: ₱11,388",
            "Best value for Plus Tier"
          ] },
        ]);
        console.log("🌱 Seeded default plans into database");
      }
    } catch (seedErr) {
      console.error("⚠️ Failed to seed default plans:", seedErr);
    }
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

//  TEST ROUTE (you can visit http://localhost:5000/)
app.get("/", (req, res) => {
  res.send("API is running and connected to MongoDB!");
});

// ADD YOUR ROUTES BELOW
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes); // Add this for the signup name validation
app.use("/api/plans", planRoutes);
app.use("/api/analytics", analyticsRoutes);



// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
