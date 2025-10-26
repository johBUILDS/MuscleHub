import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  planId: {
    type: Number,
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'expired'],
    default: 'active'
  }
});

export default mongoose.model('Membership', membershipSchema);