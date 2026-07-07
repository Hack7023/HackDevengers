import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  preferredLanguage: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: false },
  phone: { type: String, required: false },
  preferredLanguage: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', UserSchema);
