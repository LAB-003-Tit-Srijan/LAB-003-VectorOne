import mongoose from 'mongoose';

const GlobalAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  totalLecturesAnalyzed: { type: Number, default: 0 },
  analyzedVideoIds: [String], // To avoid double counting
  
  // Study streak tracking
  lastStudyDate: { type: Date },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  
  // Quiz accuracy
  totalQuizQuestionsAttempted: { type: Number, default: 0 },
  totalQuizCorrectAnswers: { type: Number, default: 0 },
  
  // Weak concepts aggregation
  // Mapping topic -> struggle count
  conceptStruggles: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Activity history for consistency chart
  // [{ date: '2024-05-10', actions: 5 }]
  dailyActivity: [{
    date: { type: String, required: true },
    actions: { type: Number, default: 0 }
  }],

  // Revision frequency (notes accessed, flashcards flipped, etc)
  revisionCount: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now }
});

export const GlobalAnalytics = mongoose.models.GlobalAnalytics || mongoose.model('GlobalAnalytics', GlobalAnalyticsSchema);
