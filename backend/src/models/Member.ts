import { Schema, model } from 'mongoose';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const memberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, 'email must be a valid email address'],
    },
    membershipId: { type: String, required: true, trim: true, unique: true, maxlength: 80 },
    // The server assigns the join instant. Clients cannot supply it.
    joinedDate: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
);

export const Member = model('Member', memberSchema);
