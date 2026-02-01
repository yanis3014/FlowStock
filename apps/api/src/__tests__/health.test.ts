import request from 'supertest';
import app from '../index';

describe('GET /health', () => {
  it('should return 200 status code', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });

  it('should return correct JSON structure', async () => {
    const response = await request(app).get('/health');
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('service');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return status "ok"', async () => {
    const response = await request(app).get('/health');
    expect(response.body.status).toBe('ok');
  });

  it('should return correct service name', async () => {
    const response = await request(app).get('/health');
    expect(response.body.service).toBe('bmad-stock-agent-api');
  });

  it('should return valid ISO timestamp', async () => {
    const response = await request(app).get('/health');
    const timestamp = response.body.timestamp;
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it('should return version number', async () => {
    const response = await request(app).get('/health');
    expect(response.body.version).toBeDefined();
    expect(typeof response.body.version).toBe('string');
  });
});
