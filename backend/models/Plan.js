import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  // Numeric id to keep compatibility with existing UI; also expose _id
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: String, required: true }, // e.g., 'day', 'month', '3 months'
  features: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

planSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Plan', planSchema);


