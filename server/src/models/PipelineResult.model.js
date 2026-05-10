import mongoose from 'mongoose';

const PipelineResultSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true, index: true },
  studyNotes: mongoose.Schema.Types.Mixed,
  flashcards: mongoose.Schema.Types.Mixed,
  quizzes: mongoose.Schema.Types.Mixed,
  revisionSummaries: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const PipelineResult = mongoose.models.PipelineResult || mongoose.model('PipelineResult', PipelineResultSchema);
