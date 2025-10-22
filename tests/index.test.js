const request = require('supertest');
// Note: ต้องมั่นใจว่า index.js ถูก export app instance
// เพื่อให้ Supertest สามารถ test ได้
const app = require('../app/index'); // แก้ไข: อ้างอิงถึงไฟล์ index.js

describe('API Endpoints', () => {
    // Test Case 1: Testing the root path (/)
    it('GET / should respond with "Hello DevSecOps World!!"', async () => {
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Hello DevSecOps World!!');
    });

    // Test Case 2: Testing the safe-api path
    it('GET /safe-api should respond with "Hello DevSecOps World!!"', async () => {
        const response = await request(app).get('/safe-api');
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Hello DevSecOps World!!');
    });
});
