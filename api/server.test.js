const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('GraphQL API', () => {
  it('should return electrical balance data', async () => {
    const query = `
      query {
        electricalBalance(startDate: "2023-01-01", endDate: "2023-01-02") {
          timestamp
          generation
          demand
          imports
          exports
        }
      }
    `;

    const response = await request(app)
      .post('/graphql')
      .send({ query })
      .expect(200);

    expect(response.body.data.electricalBalance).toBeDefined();
    expect(Array.isArray(response.body.data.electricalBalance)).toBe(true);
  });

  it('should handle invalid date range', async () => {
    const query = `
      query {
        electricalBalance(startDate: "invalid-date", endDate: "2023-01-02") {
          timestamp
          generation
          demand
          imports
          exports
        }
      }
    `;

    const response = await request(app)
      .post('/graphql')
      .send({ query })
      .expect(400);

    expect(response.body.errors).toBeDefined();
  });
});
