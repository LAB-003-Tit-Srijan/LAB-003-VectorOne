import mongoose from 'mongoose';

const NotesSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true, index: true },
  sections: [
    {
      title: String,
      content: String,
      keyConcepts: [String],
      formulas: [String]
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const NotesModel = mongoose.models.Notes || mongoose.model('Notes', NotesSchema);
