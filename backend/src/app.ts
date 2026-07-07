import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, param, query as queryValidator, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Complaint } from './models/Complaint';

dotenv.config();

const app = express();

// ─── Security Headers (helmet) ──────────────────────────────────────────────
app.use(helmet());
// Disable X-Powered-By explicitly (helmet does this, but belt-and-suspenders)
app.disable('x-powered-by');

// ─── CORS – Strict Origin Allowlist ─────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://hackdevengers.vercel.app',
  'https://hack-devengers.vercel.app',
  // Update with your deployed frontend URL
  process.env.FRONTEND_URL,                  // Allow override via env var
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server calls (no origin) and known origins only
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
  credentials: false,
}));

// ─── Body Size Limit ─────────────────────────────────────────────────────────
// Prevents DoS via oversized JSON payloads
app.use(express.json({ limit: '10kb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// General API limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Strict AI chat limiter: 20 requests per 15 minutes per IP
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please slow down.' },
});

app.use(generalLimiter);

// ─── Validation Helpers ───────────────────────────────────────────────────────
const validateRequest = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: 'Validation failed', details: errors.array() });
    return false;
  }
  return true;
};

const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

// ─── Database Connection Helper ───────────────────────────────────────────────
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

// ─── Users Routes ─────────────────────────────────────────────────────────────
app.post('/api/users',
  [
    body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
    body('preferredLanguage').optional().isIn(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'])
      .withMessage('Unsupported language code'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    if (!validateRequest(req, res)) return;
    try {
      const { email, phone, preferredLanguage } = req.body;
      const user = new User({ email, phone, preferredLanguage });
      await user.save();
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/users/:id',
  [param('id').custom(v => isValidObjectId(v)).withMessage('Invalid user ID')],
  async (req: Request, res: Response, next: NextFunction) => {
    if (!validateRequest(req, res)) return;
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// ─── Complaints Routes ─────────────────────────────────────────────────────────
app.post('/api/complaints',
  [
    body('citizenId').custom(v => isValidObjectId(v)).withMessage('Invalid citizenId'),
    body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
    body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10–2000 characters'),
    body('category').trim().notEmpty().isLength({ max: 50 }).withMessage('Category is required (max 50 chars)'),
    body('location.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('location.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    if (!validateRequest(req, res)) return;
    try {
      const { citizenId, title, description, category, location } = req.body;

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
  }
);

app.get('/api/complaints',
  [
    queryValidator('citizenId').optional().custom(v => isValidObjectId(v))
      .withMessage('Invalid citizenId query parameter'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    if (!validateRequest(req, res)) return;
    try {
      const { citizenId } = req.query;
      const filter = citizenId ? { citizenId: citizenId as string } : {};
      const complaints = await Complaint.find(filter).populate('citizenId');
      res.json(complaints);
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/complaints/:id',
  [param('id').custom(v => isValidObjectId(v)).withMessage('Invalid complaint ID')],
  async (req: Request, res: Response, next: NextFunction) => {
    if (!validateRequest(req, res)) return;
    try {
      const complaint = await Complaint.findById(req.params.id).populate('citizenId');
      if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found' });
      }
      res.json(complaint);
    } catch (error) {
      next(error);
    }
  }
);

app.post('/api/complaints/:id/updates',
  [
    param('id').custom(v => isValidObjectId(v)).withMessage('Invalid complaint ID'),
    body('status').trim().isIn(['Pending', 'In Progress', 'Resolved']).withMessage('Invalid status value'),
    body('note').optional().trim().isLength({ max: 500 }).withMessage('Note must be under 500 characters'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    if (!validateRequest(req, res)) return;
    try {
      const { status, note } = req.body;

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
  }
);

// ─── AI Chat Route (rate-limited + sanitized) ──────────────────────────────────
app.post('/api/chat',
  chatLimiter,
  [
    body('query').trim().notEmpty().isLength({ max: 1000 })
      .withMessage('Query must be non-empty and under 1000 characters'),
    body('language').optional().isIn(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'])
      .withMessage('Unsupported language code'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    if (!validateRequest(req, res)) return;
    try {
      const { query, language, contextDocuments } = req.body;

      const pyServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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

      // Fallback companion response — does NOT echo raw user input
      res.json({
        answer: 'I am currently running in fallback companion mode. I can suggest checking our service directory for more details.',
        sources_used: [],
        confidence_score: 0.8
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Sanitized Error Handling Middleware ──────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the full error server-side only
  console.error('[Error]', err);

  // Determine if CORS error
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: 'Forbidden: CORS policy violation' });
  }

  // Never leak stack traces or internal messages to clients in production
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : (err.message || 'Internal server error'),
  });
});

export default app;
