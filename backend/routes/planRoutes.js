import express from 'express';
import Plan from '../models/Plan.js';

const router = express.Router();

// Helper to generate next numeric id
async function getNextPlanId() {
  const last = await Plan.findOne().sort({ id: -1 }).lean();
  return last ? last.id + 1 : 1;
}

// GET all plans
router.get('/', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ id: 1 });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch plans' });
  }
});

// GET plan by id
router.get('/:id', async (req, res) => {
  try {
    const plan = await Plan.findOne({ id: Number(req.params.id) });
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch plan' });
  }
});

// CREATE plan
router.post('/', async (req, res) => {
  try {
    const { name, price, duration, features } = req.body;
    const id = await getNextPlanId();
    const plan = new Plan({ id, name, price, duration, features: features || [] });
    await plan.save();
    res.status(201).json(plan);
  } catch (e) {
    res.status(400).json({ message: 'Failed to create plan' });
  }
});

// UPDATE plan
router.put('/:id', async (req, res) => {
  try {
    const { name, price, duration, features } = req.body;
    const plan = await Plan.findOneAndUpdate(
      { id: Number(req.params.id) },
      { name, price, duration, features },
      { new: true }
    );
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    res.json(plan);
  } catch (e) {
    res.status(400).json({ message: 'Failed to update plan' });
  }
});

// DELETE plan
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Plan.findOneAndDelete({ id: Number(req.params.id) });
    if (!deleted) return res.status(404).json({ message: 'Plan not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ message: 'Failed to delete plan' });
  }
});

export default router;


