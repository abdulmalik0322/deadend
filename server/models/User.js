import mongoose from 'mongoose';

/**
 * User account. Password is stored as a bcrypt hash (passwordHash)
 * and is excluded from queries by default (select: false).
 * Hashing happens in the auth controller, not in a pre-save hook.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9._-]+$/,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    bio: { type: String, default: '', maxlength: 500 },
    country: { type: String, default: '', trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    publicProfile: { type: Boolean, default: true },
    suspended: { type: Boolean, default: false },
    // Password-reset flow: stores only the SHA-256 hash of the reset token,
    // never the raw token. select: false keeps both out of query results.
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    stats: {
      experiences: { type: Number, default: 0 },
      decisionsCompleted: { type: Number, default: 0 },
      contributions: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

export const User = mongoose.model('User', userSchema);
