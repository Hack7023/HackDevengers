import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  preferredLanguage: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
    validate: {
      validator: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Invalid email format',
    },
  },
  phone: { type: String, required: false, maxlength: 20, trim: true },
  preferredLanguage: { type: String, default: 'en', enum: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'] },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', UserSchema);
