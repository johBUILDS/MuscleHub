import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import paymentRoutes from "./routes/paymentRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";


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
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

//  TEST ROUTE (you can visit http://localhost:5000/)
app.get("/", (req, res) => {
  res.send("API is running and connected to MongoDB!");
});

// ADD YOUR ROUTES BELOW
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/user", userRoutes);



// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
