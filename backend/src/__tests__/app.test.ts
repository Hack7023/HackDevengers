import request from 'supertest';
import mongoose from 'mongoose';

// 1. Mock console functions BEFORE importing app
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();

global.console.log = mockConsoleLog;
global.console.error = mockConsoleError;
global.console.warn = mockConsoleWarn;

// 2. Mock mongoose connection readyState with getter/setter & connect method BEFORE importing app
let mockReadyState = 0;
Object.defineProperty(mongoose.connection, 'readyState', {
  get: () => mockReadyState,
  set: (val) => { mockReadyState = val; },
  configurable: true
});

const mockMongooseConnect = jest.fn().mockResolvedValue(mongoose);
mongoose.connect = mockMongooseConnect;

// 3. Global mock for fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// 4. Import app and connectDB
import app, { connectDB } from '../app';
import { User } from '../models/User';
import { Complaint } from '../models/Complaint';

jest.mock('../models/User', () => {
  const findByIdMock = jest.fn();
  function MockUser(this: any, data: any) {
    Object.assign(this, data);
    this._id = 'mock-user-id';
    this.save = async () => {
      if ((MockUser as any).shouldFailSave) {
        throw new Error('User Save Database Error');
      }
      return this;
    };
  }
  (MockUser as any).findById = findByIdMock;
  (MockUser as any).shouldFailSave = false;
  return { User: MockUser };
});

jest.mock('../models/Complaint', () => {
  const findMock = jest.fn();
  const findByIdMock = jest.fn();
  function MockComplaint(this: any, data: any) {
    Object.assign(this, data);
    this._id = 'mock-complaint-id';
    this.updates = [{ status: 'Pending', note: 'Complaint submitted' }];
    this.save = async () => {
      if ((MockComplaint as any).shouldFailSave) {
        throw new Error('Complaint Save Database Error');
      }
      return this;
    };
  }
  (MockComplaint as any).find = findMock;
  (MockComplaint as any).findById = findByIdMock;
  (MockComplaint as any).shouldFailSave = false;
  return { Complaint: MockComplaint };
});

describe('Gateway API Endpoints & DB Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadyState = 0;
    (User as any).shouldFailSave = false;
    (Complaint as any).shouldFailSave = false;
  });

  describe('connectDB helper function', () => {
    it('should connect to MongoDB if readyState is 0', async () => {
      mockReadyState = 0;
      await connectDB();
      expect(mockMongooseConnect).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('MongoDB connected successfully');
    });

    it('should handle MongoDB connection errors gracefully', async () => {
      mockReadyState = 0;
      const connError = new Error('Connection Refused');
      mockMongooseConnect.mockRejectedValueOnce(connError);
      await connectDB();
      expect(mockConsoleError).toHaveBeenCalledWith('MongoDB connection error:', connError);
    });

    it('should not connect if readyState is not 0 (already connected)', async () => {
      mockReadyState = 1;
      await connectDB();
      expect(mockMongooseConnect).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/users', () => {
    it('should create and return a new user session', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'citizen@example.com', preferredLanguage: 'hi' });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('citizen@example.com');
      expect(response.body.preferredLanguage).toBe('hi');
      expect(response.body._id).toBe('mock-user-id');
    });

    it('should fall back to default error middleware on database save error', async () => {
      (User as any).shouldFailSave = true;
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'citizen@example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('User Save Database Error');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should successfully retrieve a user', async () => {
      const mockFindById = (User as any).findById as jest.Mock;
      mockFindById.mockResolvedValueOnce({
        _id: 'mock-user-id',
        email: 'citizen@example.com',
        preferredLanguage: 'en'
      });

      const response = await request(app).get('/api/users/mock-user-id');
      expect(response.status).toBe(200);
      expect(response.body._id).toBe('mock-user-id');
      expect(response.body.email).toBe('citizen@example.com');
    });

    it('should return 404 if user does not exist', async () => {
      const mockFindById = (User as any).findById as jest.Mock;
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app).get('/api/users/non-existent-id');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should propagate errors to middleware if database findById throws', async () => {
      const mockFindById = (User as any).findById as jest.Mock;
      mockFindById.mockRejectedValueOnce(new Error('DB FindById Error'));

      const response = await request(app).get('/api/users/invalid-id');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('DB FindById Error');
    });
  });

  describe('POST /api/complaints', () => {
    it('should fail if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/complaints')
        .send({ title: 'Broken water tap' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required parameters');
    });

    it('should fail if citizenId user does not exist in DB', async () => {
      const mockUserFindById = (User as any).findById as jest.Mock;
      mockUserFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/complaints')
        .send({
          citizenId: 'non-existent-citizen',
          title: 'Pothole on Main St',
          description: 'Large pothole',
          category: 'Infrastructure',
          location: { latitude: 12.9716, longitude: 77.5946 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid citizenId: User does not exist');
    });

    it('should create and return a new complaint if inputs are valid', async () => {
      const citizenId = 'mock-user-id';
      const mockUserFindById = (User as any).findById as jest.Mock;
      mockUserFindById.mockResolvedValueOnce({
        _id: citizenId,
        email: 'citizen@example.com'
      });

      const response = await request(app)
        .post('/api/complaints')
        .send({
          citizenId,
          title: 'Pothole on Main St',
          description: 'Large pothole blocking the road',
          category: 'Infrastructure',
          location: { latitude: 12.9716, longitude: 77.5946 },
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Pothole on Main St');
      expect(response.body._id).toBe('mock-complaint-id');
    });

    it('should trigger catch block and error middleware on database save failure', async () => {
      const citizenId = 'mock-user-id';
      const mockUserFindById = (User as any).findById as jest.Mock;
      mockUserFindById.mockResolvedValueOnce({
        _id: citizenId
      });
      (Complaint as any).shouldFailSave = true;

      const response = await request(app)
        .post('/api/complaints')
        .send({
          citizenId,
          title: 'Pothole St',
          description: 'Pothole',
          category: 'Infrastructure',
          location: { latitude: 12.9716, longitude: 77.5946 },
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Complaint Save Database Error');
    });
  });

  describe('GET /api/complaints', () => {
    it('should return all complaints and populate citizenId', async () => {
      const mockPopulate = jest.fn().mockResolvedValueOnce([
        { _id: 'complaint-1', title: 'Complaint 1' },
        { _id: 'complaint-2', title: 'Complaint 2' }
      ]);
      const mockFind = (Complaint as any).find as jest.Mock;
      mockFind.mockReturnValueOnce({ populate: mockPopulate });

      const response = await request(app).get('/api/complaints');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(mockFind).toHaveBeenCalledWith({});
      expect(mockPopulate).toHaveBeenCalledWith('citizenId');
    });

    it('should filter complaints by citizenId when provided', async () => {
      const mockPopulate = jest.fn().mockResolvedValueOnce([
        { _id: 'complaint-1', title: 'Complaint 1', citizenId: 'mock-user-id' }
      ]);
      const mockFind = (Complaint as any).find as jest.Mock;
      mockFind.mockReturnValueOnce({ populate: mockPopulate });

      const response = await request(app).get('/api/complaints?citizenId=mock-user-id');
      expect(response.status).toBe(200);
      expect(mockFind).toHaveBeenCalledWith({ citizenId: 'mock-user-id' });
    });

    it('should pass find exceptions to next middleware', async () => {
      const mockFind = (Complaint as any).find as jest.Mock;
      mockFind.mockImplementationOnce(() => {
        throw new Error('Database query failure');
      });

      const response = await request(app).get('/api/complaints');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database query failure');
    });
  });

  describe('GET /api/complaints/:id', () => {
    it('should successfully retrieve a complaint by ID', async () => {
      const mockPopulate = jest.fn().mockResolvedValueOnce({
        _id: 'mock-complaint-id',
        title: 'Broken lights'
      });
      const mockFindById = (Complaint as any).findById as jest.Mock;
      mockFindById.mockReturnValueOnce({ populate: mockPopulate });

      const response = await request(app).get('/api/complaints/mock-complaint-id');
      expect(response.status).toBe(200);
      expect(response.body._id).toBe('mock-complaint-id');
      expect(response.body.title).toBe('Broken lights');
    });

    it('should return 404 if complaint not found', async () => {
      const mockPopulate = jest.fn().mockResolvedValueOnce(null);
      const mockFindById = (Complaint as any).findById as jest.Mock;
      mockFindById.mockReturnValueOnce({ populate: mockPopulate });

      const response = await request(app).get('/api/complaints/non-existent-id');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Complaint not found');
    });

    it('should handle get errors by calling next(error)', async () => {
      const mockFindById = (Complaint as any).findById as jest.Mock;
      mockFindById.mockImplementationOnce(() => {
        throw new Error('Database connection lost');
      });

      const response = await request(app).get('/api/complaints/some-id');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database connection lost');
    });
  });

  describe('POST /api/complaints/:id/updates', () => {
    it('should successfully add updates log to a complaint', async () => {
      const mockSave = jest.fn().mockResolvedValueOnce({
        _id: 'mock-complaint-id',
        status: 'In Progress',
        updates: [
          { status: 'Pending', note: 'Complaint submitted' },
          { status: 'In Progress', note: 'Working on it' }
        ]
      });
      const mockFindById = (Complaint as any).findById as jest.Mock;
      mockFindById.mockResolvedValueOnce({
        _id: 'mock-complaint-id',
        status: 'Pending',
        updates: [{ status: 'Pending', note: 'Complaint submitted' }],
        save: mockSave
      });

      const response = await request(app)
        .post('/api/complaints/mock-complaint-id/updates')
        .send({ status: 'In Progress', note: 'Working on it' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('In Progress');
      expect(response.body.updates.length).toBe(2);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should fail with 400 if status is not provided', async () => {
      const response = await request(app)
        .post('/api/complaints/mock-complaint-id/updates')
        .send({ note: 'Missing status' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Status is required');
    });

    it('should return 404 if complaint to update is not found', async () => {
      const mockFindById = (Complaint as any).findById as jest.Mock;
      mockFindById.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/complaints/non-existent-id/updates')
        .send({ status: 'Resolved' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Complaint not found');
    });

    it('should trigger error middleware on database save error', async () => {
      const mockFindById = (Complaint as any).findById as jest.Mock;
      mockFindById.mockResolvedValueOnce({
        _id: 'mock-complaint-id',
        status: 'Pending',
        updates: [],
        save: jest.fn().mockRejectedValueOnce(new Error('Update Save Failed'))
      });

      const response = await request(app)
        .post('/api/complaints/mock-complaint-id/updates')
        .send({ status: 'In Progress' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Update Save Failed');
    });
  });

  describe('POST /api/chat', () => {
    it('should fail if query is missing', async () => {
      const response = await request(app).post('/api/chat').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Query is required');
    });

    it('should proxy query to python service if available and respond ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          answer: 'The direct answer from the Python RAG engine.',
          sources: ['Source Document A'],
          confidence_score: 0.92
        })
      });

      const response = await request(app)
        .post('/api/chat')
        .send({ query: 'How to renew driver license?', contextDocuments: ['DocA'] });

      expect(response.status).toBe(200);
      expect(response.body.answer).toBe('The direct answer from the Python RAG engine.');
      expect(response.body.confidence_score).toBe(0.92);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/query'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query: 'How to renew driver license?',
            context_documents: ['DocA']
          })
        })
      );
    });

    it('should fall back to local mock answer if python service is offline/throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection timed out'));

      const response = await request(app)
        .post('/api/chat')
        .send({ query: 'How to renew driver license?' });

      expect(response.status).toBe(200);
      expect(response.body.answer).toContain('fallback companion mode');
      expect(response.body.confidence_score).toBe(0.8);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('AI Python RAG service offline')
      );
    });

    it('should fall back to local mock answer if python service returns a non-2xx status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      });

      const response = await request(app)
        .post('/api/chat')
        .send({ query: 'How to renew driver license?' });

      expect(response.status).toBe(200);
      expect(response.body.answer).toContain('fallback companion mode');
      expect(response.body.confidence_score).toBe(0.8);
    });
  });
});
