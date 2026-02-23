/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // os.availableParallelism se añadió en Node 18.14.0.
  // Fijar maxWorkers evita el crash en versiones anteriores (ej. 18.12.x).
  maxWorkers: 2,
};
