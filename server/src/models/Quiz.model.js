import mongoose from 'mongoose';

/**
 * Each quiz question is an MCQ with 4 options, the correct index (0-3),
 * a plain-English explanation, a difficulty tag, and a topic category string.
 */
const QuizQuestionSchema = new mongoose.Schema({
    question:      { type: String, required: true },
    options:       { type: [String], required: true },   // always 4 items
    correctIndex:  { type: Number, required: true },     // 0–3
    explanation:   { type: String, default: '' },
    difficulty:    { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    topic:         { type: String, default: '' },        // e.g. "Vectors", "Kinematics"
});

const QuizSetSchema = new mongoose.Schema({
    videoId:   { type: String, required: true, unique: true, index: true },
    questions: [QuizQuestionSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

export const QuizModel =
    mongoose.models.Quiz ||
    mongoose.model('Quiz', QuizSetSchema);
