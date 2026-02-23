'use strict';

/**
 * Tests unitarios — api-gateway
 *
 * Limitación de diseño: server.js crea la app Express y llama a app.listen()
 * dentro del mismo módulo sin exportar ni la app ni el servidor. Esto impide
 * cerrar el handle HTTP en afterAll de forma estándar.
 *
 * Solución adoptada:
 *   1. jest.config.js tiene forceExit: true → Jest cierra el proceso al terminar.
 *   2. Se mockea http-proxy-middleware para evitar conexiones reales hacia los
 *      servicios upstream (que no están disponibles en el entorno de test).
 *   3. Se fija process.env.PORT a un puerto fijo antes de requerir server.js.
 *
 * Nota: jest.mock() se eleva automáticamente (hoisting) al inicio del módulo,
 * por lo que el mock está activo antes de que require('../src/server') se ejecute.
 */

// ── Configuración de entorno ANTES de cargar el módulo del servidor ─────────
process.env.PORT       = '13001';
process.env.JWT_SECRET = 'test-secret';
process.env.USERS_SERVICE_URL    = 'http://users-service:3001';
process.env.ACADEMIC_SERVICE_URL = 'http://academic-service:3002';

// ── Mock del proxy para que no intente conectarse a los backends ─────────────
// jest.mock es elevado (hoisted) por Babel/Jest antes de los requires.
jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: (options) => (_req, res) => {
    // Simula la respuesta de un upstream no disponible (comportamiento normal en CI).
    res.status(502).json({
      error:  'upstream service unavailable in test environment',
      target: options.target,
    });
  },
}));

// Iniciar el servidor en el puerto definido arriba.
// Después del require, el gateway está escuchando en process.env.PORT.
require('../src/server');

const BASE_URL = `http://localhost:${process.env.PORT}`;

// Dar tiempo al event loop para completar el app.listen() antes de los tests.
beforeAll(() => new Promise((resolve) => setTimeout(resolve, 150)));

// ─────────────────────────────────────────────────────────────────────────────
// Health check (ruta propia del gateway, sin proxy)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('responde 200 con status OK', async () => {
    const res  = await fetch(`${BASE_URL}/health`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 'api-gateway OK' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rutas proxy — verificar que están registradas (no devuelven 404)
// ─────────────────────────────────────────────────────────────────────────────
describe('Rutas de proxy — disponibilidad', () => {
  test('/auth/* está registrada: responde con algo distinto a 404', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: 'test@test.cl', password: '1234' }),
    });
    // En producción se proxy-a a users-service.
    // En tests, el mock devuelve 502 (upstream no disponible), nunca 404.
    expect(res.status).not.toBe(404);
  });

  test('/courses/* está registrada: responde con algo distinto a 404', async () => {
    const res = await fetch(`${BASE_URL}/courses`);
    // En producción se proxy-a a academic-service.
    // En tests, el mock devuelve 502, nunca 404.
    expect(res.status).not.toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rutas no registradas — Express devuelve 404 por defecto
// ─────────────────────────────────────────────────────────────────────────────
describe('Rutas no registradas', () => {
  test('responde 404 para una ruta desconocida', async () => {
    const res = await fetch(`${BASE_URL}/ruta-que-no-existe`);
    expect(res.status).toBe(404);
  });
});
