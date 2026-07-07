import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Complaint } from './models/Complaint';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Database connection helper
export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civic_platform';
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(mongoURI);
      console.log('MongoDB connected successfully');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  }
};

// Users routes
app.post('/api/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phone, preferredLanguage } = req.body;
    const user = new User({ email, phone, preferredLanguage });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Complaints routes
app.post('/api/complaints', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { citizenId, title, description, category, location } = req.body;
    if (!citizenId || !title || !description || !category || !location) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const user = await User.findById(citizenId);
    if (!user) {
      return res.status(400).json({ error: 'Invalid citizenId: User does not exist' });
    }

    const complaint = new Complaint({
      citizenId,
      title,
      description,
      category,
      location,
      updates: [{ status: 'Pending', note: 'Complaint submitted' }]
    });

    await complaint.save();
    res.status(201).json(complaint);
  } catch (error) {
    next(error);
  }
});

app.get('/api/complaints', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { citizenId } = req.query;
    const filter = citizenId ? { citizenId } : {};
    const complaints = await Complaint.find(filter).populate('citizenId');
    res.json(complaints);
  } catch (error) {
    next(error);
  }
});

app.get('/api/complaints/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('citizenId');
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    res.json(complaint);
  } catch (error) {
    next(error);
  }
});

app.post('/api/complaints/:id/updates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    complaint.status = status;
    complaint.updates.push({
      status,
      updatedAt: new Date(),
      note
    });

    await complaint.save();
    res.json(complaint);
  } catch (error) {
    next(error);
  }
});

// Proxy route for AI chat (companion) and RAG simplification
app.post('/api/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, language, contextDocuments } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const pyServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    // We mock/proxy request to python RAG service if we have document context, or call Gemini directly.
    // For local dev without a running py-service, we'll fall back gracefully with a Gemini mock response.
    try {
      const response = await fetch(`${pyServiceUrl}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context_documents: contextDocuments || [] })
      });
      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (e) {
      console.warn('AI Python RAG service offline. Falling back to local prompt orchestration');
    }

    // Local GenAI companion fallback response logic (mocking for testability)
    res.json({
      answer: `Hello! Regarding your query: "${query}". I am currently running in fallback companion mode. I can suggest checking our service directory for details.`,
      sources_used: [],
      confidence_score: 0.8
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
