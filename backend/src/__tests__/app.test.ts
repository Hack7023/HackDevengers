import request from 'supertest';
import app from '../app';
import { User } from '../models/User';

jest.mock('../models/User', () => {
  const findByIdMock = jest.fn();
  function MockUser(this: any, data: any) {
    Object.assign(this, data);
    this._id = 'mock-user-id';
    this.save = async () => this;
  }
  (MockUser as any).findById = findByIdMock;
  return { User: MockUser };
});

jest.mock('../models/Complaint', () => {
  const findMock = jest.fn();
  const findByIdMock = jest.fn();
  function MockComplaint(this: any, data: any) {
    Object.assign(this, data);
    this._id = 'mock-complaint-id';
    this.updates = [{ status: 'Pending', note: 'Complaint submitted' }];
    this.save = async () => this;
  }
  (MockComplaint as any).find = findMock;
  (MockComplaint as any).findById = findByIdMock;
  return { Complaint: MockComplaint };
});

describe('Gateway API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/users', () => {
    it('should create and return a new user session', async () => {
      // Act
      const response = await request(app)
        .post('/api/users')
        .send({ email: 'citizen@example.com', preferredLanguage: 'hi' });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.email).toBe('citizen@example.com');
      expect(response.body.preferredLanguage).toBe('hi');
      expect(response.body._id).toBe('mock-user-id');
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

    it('should create and return a new complaint if inputs are valid', async () => {
      // Arrange
      const citizenId = 'mock-user-id';
      const mockFindById = (User as any).findById as jest.Mock;
      mockFindById.mockResolvedValue({
        _id: citizenId,
        email: 'citizen@example.com'
      });

      // Act
      const response = await request(app)
        .post('/api/complaints')
        .send({
          citizenId,
          title: 'Pothole on Main St',
          description: 'Large pothole blocking the road',
          category: 'Infrastructure',
          location: { latitude: 12.9716, longitude: 77.5946 },
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Pothole on Main St');
      expect(response.body._id).toBe('mock-complaint-id');
    });
  });

  describe('POST /api/chat', () => {
    it('should fail if query is missing', async () => {
      const response = await request(app).post('/api/chat').send({});
      expect(response.status).toBe(400);
    });

    it('should return a companion fallback answer', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ query: 'How do I renew my license?' });

      expect(response.status).toBe(200);
      expect(response.body.answer).toContain('renew my license');
      expect(response.body.confidence_score).toBe(0.8);
    });
  });
});
