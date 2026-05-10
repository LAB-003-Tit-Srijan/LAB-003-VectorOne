import mongoose from 'mongoose';

const RoadmapNodeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['concept', 'practice', 'advanced'], default: 'concept' },
  status: { type: String, enum: ['locked', 'available', 'completed'], default: 'locked' },
  suggestedResources: [String],
  order: { type: Number, required: true }
});

const RoadmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  nodes: [RoadmapNodeSchema],
  currentTopic: String,
  totalNodes: { type: Number, default: 0 },
  completedNodes: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

export const Roadmap = mongoose.models.Roadmap || mongoose.model('Roadmap', RoadmapSchema);
