import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    picture: {
      type: String,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    picture: this.picture ?? undefined,
  };
};

export const User =
  mongoose.models.User ?? mongoose.model('User', userSchema);
