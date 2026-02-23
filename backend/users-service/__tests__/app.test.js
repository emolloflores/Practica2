'use strict';

/**
 * Tests unitarios — users-service
 *
 * Estrategia: se importa app.js (Express app sin el listen) y se levanta
 * en un puerto aleatorio (0) para evitar conflictos entre tests y CI.
 * Se usa el fetch global disponible en Node.js 20 para las peticiones HTTP.
 * El servidor se cierra limpiamente en afterAll.
 */

// JWT_SECRET debe estar definida antes de que los módulos de la app se carguen,
// porque auth.facades.js llama a jwt.sign con process.env.JWT_SECRET al hacer login.
process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const app = require('../src/app');

let server;
let baseUrl;

beforeAll((done) => {
  // Puerto 0 le pide al SO un puerto libre, evitando colisiones en CI.
  server = app.listen(0, () => {
    baseUrl = `http://localhost:${server.address().port}`;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('responde 200 con status OK', async () => {
    const res  = await fetch(`${baseUrl}/health`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 'users-service OK' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /login — caso exitoso
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /login — credenciales válidas', () => {
  let token;

  beforeAll(async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: 'admin@test.cl', password: '123456' }),
    });
    const body = await res.json();
    token = body.token;
  });

  test('responde 200', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: 'admin@test.cl', password: '123456' }),
    });
    expect(res.status).toBe(200);
  });

  test('devuelve un JWT válido y no vacío', () => {
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    // El token debe tener el formato header.payload.signature
    expect(token.split('.')).toHaveLength(3);
  });

  test('el JWT contiene el email y el rol del usuario', () => {
    const decoded = jwt.verify(token, 'test-secret');
    expect(decoded.email).toBe('admin@test.cl');
    expect(decoded.role).toBe('admin');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /login — manejo de errores
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /login — manejo de errores', () => {
  test('responde 401 con contraseña incorrecta', async () => {
    const res  = await fetch(`${baseUrl}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: 'admin@test.cl', password: 'wrong' }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Credenciales incorrectas');
  });

  test('responde 401 con usuario inexistente', async () => {
    const res  = await fetch(`${baseUrl}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: 'noexiste@test.cl', password: '123456' }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Credenciales incorrectas');
  });

  test('responde 401 cuando falta el email', async () => {
    const res  = await fetch(`${baseUrl}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: '123456' }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Datos inválidos');
  });

  test('responde 401 cuando falta la contraseña', async () => {
    const res  = await fetch(`${baseUrl}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: 'admin@test.cl' }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Datos inválidos');
  });

  test('responde 401 con body vacío', async () => {
    const res  = await fetch(`${baseUrl}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBeTruthy();
  });
});
