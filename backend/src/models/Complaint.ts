import { Schema, model, Document, Types } from 'mongoose';

export interface IComplaintUpdate {
  status: string;
  updatedAt: Date;
  note?: string;
}

export interface IComplaint extends Document {
  citizenId: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'Pending' | 'In Progress' | 'Resolved';
  updates: IComplaintUpdate[];
  createdAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>({
  citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Resolved'], 
    default: 'Pending' 
  },
  updates: [
    {
      status: { type: String, required: true },
      updatedAt: { type: Date, default: Date.now },
      note: { type: String }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

export const Complaint = model<IComplaint>('Complaint', ComplaintSchema);
