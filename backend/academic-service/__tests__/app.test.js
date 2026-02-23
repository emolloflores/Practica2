'use strict';

/**
 * Tests unitarios — academic-service
 *
 * Estrategia: se importa app.js y se levanta en un puerto aleatorio.
 * Se genera un JWT válido con la misma clave de test para poder probar
 * tanto el acceso autorizado como los intentos sin/mal token.
 */

// JWT_SECRET antes de cargar cualquier módulo de la app.
process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const app = require('../src/app');

let server;
let baseUrl;

// Token válido reutilizado en todos los tests que necesitan autenticación.
const VALID_TOKEN = jwt.sign(
  { id: 1, email: 'admin@test.cl', role: 'admin' },
  'test-secret',
  { expiresIn: '1h' }
);

beforeAll((done) => {
  server = app.listen(0, () => {
    baseUrl = `http://localhost:${server.address().port}`;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

// ─────────────────────────────────────────────────────────────────────────────
// Health check (ruta pública, sin autenticación)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('responde 200 con status OK', async () => {
    const res  = await fetch(`${baseUrl}/health`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 'academic-service OK' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET / — ruta protegida: requiere JWT válido
// ─────────────────────────────────────────────────────────────────────────────
describe('GET / (lista de cursos) — ruta protegida', () => {
  test('responde 401 cuando no se envía ningún header Authorization', async () => {
    const res  = await fetch(`${baseUrl}/`);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('No autorizado');
  });

  test('responde 401 con un token JWT inválido (firma incorrecta)', async () => {
    const fakeToken = jwt.sign({ id: 99 }, 'wrong-secret');
    const res  = await fetch(`${baseUrl}/`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Token inválido');
  });

  test('responde 401 con una cadena aleatoria como token', async () => {
    const res  = await fetch(`${baseUrl}/`, {
      headers: { Authorization: 'Bearer esto.no.es.un.jwt' },
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Token inválido');
  });

  test('responde 401 cuando el header Authorization no tiene el prefijo "Bearer "', async () => {
    // El middleware hace authHeader.split(" ")[1], por lo que enviar el token
    // directamente (sin "Bearer ") produce un token undefined → jwt falla.
    const res   = await fetch(`${baseUrl}/`, {
      headers: { Authorization: VALID_TOKEN },
    });
    await res.json(); // consumir body; no se valida su contenido en este caso

    expect(res.status).toBe(401);
  });

  test('responde 401 con un JWT expirado', async () => {
    const expiredToken = jwt.sign(
      { id: 1, email: 'admin@test.cl' },
      'test-secret',
      { expiresIn: -1 }   // expira en el pasado
    );
    const res  = await fetch(`${baseUrl}/`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Token inválido');
  });

  test('responde 200 con la lista de cursos cuando el JWT es válido', async () => {
    const res  = await fetch(`${baseUrl}/`, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('cada curso en la respuesta tiene id y name', async () => {
    const res  = await fetch(`${baseUrl}/`, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` },
    });
    const courses = await res.json();

    courses.forEach((course) => {
      expect(course).toHaveProperty('id');
      expect(course).toHaveProperty('name');
      expect(typeof course.name).toBe('string');
    });
  });
});
