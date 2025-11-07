import express from "express";
import Membership from "../models/Membership.js";
import Plan from "../models/Plan.js";
import User from "../models/User.js";

const router = express.Router();

// GET /api/analytics/summary
router.get("/summary", async (req, res) => {
  try {
    // Preload plans to a map for fast lookups
    const plans = await Plan.find({}).lean();
    const planIdToPrice = new Map(plans.map(p => [p.id, Number(p.price) || 0]));

    // Helper to compute revenue for memberships in a date range
    const computeRevenueForRange = async (startDate, endDate) => {
      const query = {};
      if (startDate || endDate) {
        query.startDate = {};
        if (startDate) query.startDate.$gte = startDate;
        if (endDate) query.startDate.$lt = endDate;
      }
      const memberships = await Membership.find(query).select("planId startDate").lean();
      return memberships.reduce((sum, m) => sum + (planIdToPrice.get(m.planId) || 0), 0);
    };

    // Total revenue (all time)
    const allMemberships = await Membership.find({}).select("planId startDate").lean();
    const totalRevenue = allMemberships.reduce((sum, m) => sum + (planIdToPrice.get(m.planId) || 0), 0);

    // Users count (exclude admins)
    const usersCount = await User.countDocuments({ role: { $ne: "admin" } });

    // Weekly revenue for the last 7 complete days including today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyAmounts = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      // revenue for this day
      // Query directly to avoid fetching everything multiple times
      const dayMemberships = await Membership.find({ startDate: { $gte: dayStart, $lt: dayEnd } }).select("planId").lean();
      const amount = dayMemberships.reduce((sum, m) => sum + (planIdToPrice.get(m.planId) || 0), 0);
      dailyAmounts.push({ date: dayStart.toISOString().slice(0, 10), amount });
    }

    const revenueLast7 = dailyAmounts.reduce((s, d) => s + d.amount, 0);

    // Previous 7-day window
    const sevenDaysAgoStart = new Date(today);
    sevenDaysAgoStart.setDate(today.getDate() - 7);
    const fourteenDaysAgoStart = new Date(today);
    fourteenDaysAgoStart.setDate(today.getDate() - 14);
    const revenuePrev7 = await computeRevenueForRange(fourteenDaysAgoStart, sevenDaysAgoStart);

    // Growth rate: (current - previous) / previous
    let growthRate = 0;
    if (revenuePrev7 === 0) {
      growthRate = revenueLast7 > 0 ? 100 : 0;
    } else {
      growthRate = ((revenueLast7 - revenuePrev7) / revenuePrev7) * 100;
    }

    // Members growth: last 6 months of new memberships by month
    const sixMonths = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthMemberships = await Membership.find({ startDate: { $gte: start, $lt: end } }).select('_id').lean();
      sixMonths.push({ label: start.toLocaleString('en-US', { month: 'short' }), count: monthMemberships.length });
    }

    // Helper: convert plan duration string to days
    const durationToDays = (duration) => {
      if (!duration) return 30;
      const d = String(duration).toLowerCase();
      if (d === 'day') return 1;
      if (d === 'month') return 30;
      if (d.includes('3')) return 90;
      if (d.includes('6')) return 180;
      if (d.includes('12')) return 365;
      return 30;
    };

    // Renewals due in next 30 days (active memberships whose expiry is within 30 days)
    const activeMemberships = await Membership.find({ status: 'active' }).select('planId startDate').lean();
    let renewalsDue = 0;
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    for (const m of activeMemberships) {
      const plan = plans.find(p => p.id === m.planId);
      const days = durationToDays(plan?.duration);
      const expiry = new Date(m.startDate);
      expiry.setDate(expiry.getDate() + days);
      if (expiry >= new Date() && expiry <= in30) {
        renewalsDue += 1;
      }
    }

    // Plans availed distribution in last 30 days
    const last30Start = new Date();
    last30Start.setDate(last30Start.getDate() - 30);
    const last30 = await Membership.find({ startDate: { $gte: last30Start } }).select('planId').lean();
    const planDistribution = {};
    for (const m of last30) {
      const plan = plans.find(p => p.id === m.planId);
      const name = plan?.name || `Plan ${m.planId}`;
      planDistribution[name] = (planDistribution[name] || 0) + 1;
    }

    return res.json({
      totalRevenue,
      usersCount,
      revenueLast7,
      revenuePrev7,
      growthRate,
      weeklyRevenue: dailyAmounts,
      membersGrowth6m: sixMonths,
      renewalsDue,
      plansAvailed30d: planDistribution
    });
  } catch (err) {
    console.error("Error computing analytics summary:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;

// GET /api/analytics/renewals - users due for renewal soon and lapsed
router.get("/renewals", async (req, res) => {
  try {
    const plans = await Plan.find({}).lean();
    const planIdToPlan = new Map(plans.map(p => [p.id, p]));

    const durationToDays = (duration) => {
      if (!duration) return 30;
      const d = String(duration).toLowerCase();
      if (d === 'day') return 1;
      if (d === 'month') return 30;
      if (d.includes('3')) return 90;
      if (d.includes('6')) return 180;
      if (d.includes('12')) return 365;
      return 30;
    };

    // Load all memberships sorted by startDate per user
    const memberships = await Membership.find({}).sort({ userId: 1, startDate: -1 }).lean();

    // Build latest membership by user and compute expiry
    const latestByUser = new Map();
    for (const m of memberships) {
      if (!latestByUser.has(m.userId)) {
        const plan = planIdToPlan.get(m.planId);
        const days = durationToDays(plan?.duration);
        const expiry = new Date(m.startDate);
        expiry.setDate(expiry.getDate() + days);
        latestByUser.set(m.userId, { ...m, plan, expiry });
      }
    }

    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);

    const dueNext30 = [];
    const lapsed30 = [];

    // Prefetch users to resolve names/emails
    const userIds = Array.from(latestByUser.keys());
    const users = await User.find({}).select('name email').lean();
    const byId = new Map(users.map(u => [String(u._id), u]));
    const byName = new Map(users.map(u => [u.name, u]));

    for (const [uid, record] of latestByUser) {
      const user = byId.get(uid) || byName.get(uid);
      const base = {
        userId: uid,
        name: user?.name || uid,
        email: user?.email || '',
        planName: record.plan?.name || `Plan ${record.planId}`,
        availingDate: record.startDate,
        expiry: record.expiry
      };
      if (record.expiry >= now && record.expiry <= in30) {
        dueNext30.push(base);
      } else if (record.expiry < now) {
        // lapsed in last 30 days
        const thirtyAgo = new Date();
        thirtyAgo.setDate(thirtyAgo.getDate() - 30);
        if (record.expiry >= thirtyAgo) {
          lapsed30.push(base);
        }
      }
    }

    // Sort by nearest expiry
    dueNext30.sort((a, b) => a.expiry - b.expiry);
    lapsed30.sort((a, b) => b.expiry - a.expiry);

    return res.json({
      dueNext30,
      lapsed30
    });
  } catch (err) {
    console.error('Error computing renewals list:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


