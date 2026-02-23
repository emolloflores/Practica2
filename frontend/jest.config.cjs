/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  maxWorkers: 2,
  // "type": "module" en package.json hace que Jest 30 deje handles abiertos.
  // forceExit garantiza salida limpia sin afectar la ejecución de los tests.
  forceExit: true,
  // Los componentes React (JSX) y las variables Vite (import.meta.env) requieren
  // configuración adicional (jest-environment-jsdom, Babel/SWC transform) para
  // tests de renderizado completo. Los tests actuales son de contrato de
  // comportamiento y no importan desde src/, por lo que no necesitan transforms.
};
