import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/database/prisma.js';

describe('API Routes Integration Tests', () => {
  let testConvId: string;

  beforeAll(async () => {
    // Ensure clean state
    const conv = await prisma.conversation.create({
      data: { title: 'Integration Test Conversation' },
    });
    testConvId = conv.id;
  });

  afterAll(async () => {
    await prisma.conversation.deleteMany({
      where: { title: { contains: 'Integration Test' } },
    });
    await prisma.$disconnect();
  });

  it('GET /api/health returns 200 with system status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.timezone).toBe('Asia/Kolkata');
  });

  it('GET /api/conversations lists conversations', async () => {
    const res = await request(app).get('/api/conversations');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/conversations creates a new conversation', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .send({ title: 'Integration Test New' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Integration Test New');
  });

  it('GET /api/conversations/:id returns conversation details', async () => {
    const res = await request(app).get(`/api/conversations/${testConvId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(testConvId);
    expect(res.body.data.messages).toBeInstanceOf(Array);
  });

  it('POST /api/chat handles direct JSON response', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        conversationId: testConvId,
        message: 'What is a database index?',
        stream: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.response).toBeDefined();
    expect(res.body.data.conversationId).toBe(testConvId);
  });

  it('POST /api/chat handles Server-Sent Events stream', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        conversationId: testConvId,
        message: 'Explain how B-trees work',
        stream: true,
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('event: step');
    expect(res.text).toContain('event: response');
    expect(res.text).toContain('event: done');
  });

  it('DELETE /api/conversations/:id deletes conversation', async () => {
    const convToDelete = await prisma.conversation.create({
      data: { title: 'To Delete' },
    });

    const res = await request(app).delete(`/api/conversations/${convToDelete.id}`);
    expect(res.status).toBe(200);

    const check = await prisma.conversation.findUnique({
      where: { id: convToDelete.id },
    });
    expect(check).toBeNull();
  });
});
