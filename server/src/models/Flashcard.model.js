import mongoose from 'mongoose';

const FlashcardSchema = new mongoose.Schema({
    question:   { type: String, required: true },
    answer:     { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
});

const FlashcardSetSchema = new mongoose.Schema({
    videoId:    { type: String, required: true, unique: true, index: true },
    cards:      [FlashcardSchema],
    createdAt:  { type: Date, default: Date.now },
    updatedAt:  { type: Date, default: Date.now },
});

export const FlashcardModel =
    mongoose.models.Flashcard ||
    mongoose.model('Flashcard', FlashcardSetSchema);
