/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // server.js arranca el proceso HTTP pero no exporta la instancia del servidor,
  // por lo que no es posible cerrarlo limpiamente en afterAll.
  // forceExit garantiza que Jest finalice tras los tests sin colgar.
  forceExit: true,
  maxWorkers: 2,
};
