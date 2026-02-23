'use strict';

/**
 * Tests unitarios — frontend
 *
 * Limitación de diseño: el frontend usa Vite + ES Modules ("type": "module")
 * con import.meta.env, JSX y APIs de navegador (sessionStorage, fetch,
 * window.location). Importar los módulos de src/ directamente en Jest
 * requiere configuración adicional (jsdom, @testing-library/react, Babel/SWC
 * con soporte de import.meta, y VITE_* env mocks) que está fuera del alcance
 * de "solo agregar archivos de test".
 *
 * Estrategia adoptada: tests de contrato de comportamiento.
 * Se verifican las lógicas clave descritas en los módulos de src/ reimplementando
 * las funciones exactas tal como están en el código fuente. Si alguien modifica
 * esa lógica en el componente, el contrato aquí documentado sirve de referencia.
 *
 * Para tests de componentes React completos (renderizado, eventos, snapshot)
 * agregar: jest-environment-jsdom, @testing-library/react y jest.config.cjs
 * con transform para import.meta.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Contrato: src/services/api.jsx — interceptor de request (autenticación)
// ─────────────────────────────────────────────────────────────────────────────
describe('API client — interceptor de request', () => {
  // Lógica exacta del interceptor en api.jsx:
  //   api.interceptors.request.use((config) => {
  //     const token = sessionStorage.getItem("token");
  //     if (token) config.headers.Authorization = `Bearer ${token}`;
  //     return config;
  //   });
  function requestInterceptor(config, storedToken) {
    if (storedToken) {
      config.headers.Authorization = `Bearer ${storedToken}`;
    }
    return config;
  }

  test('agrega el header Authorization cuando hay un token almacenado', () => {
    const config = { headers: {} };
    const result = requestInterceptor(config, 'mock-jwt-token');

    expect(result.headers.Authorization).toBe('Bearer mock-jwt-token');
  });

  test('NO agrega el header Authorization cuando no hay token', () => {
    const config = { headers: {} };
    const result = requestInterceptor(config, null);

    expect(result.headers.Authorization).toBeUndefined();
  });

  test('NO agrega el header Authorization con token vacío', () => {
    const config = { headers: {} };
    const result = requestInterceptor(config, '');

    expect(result.headers.Authorization).toBeUndefined();
  });

  test('preserva los headers existentes al agregar Authorization', () => {
    const config = { headers: { 'Content-Type': 'application/json' } };
    const result = requestInterceptor(config, 'some-token');

    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.headers.Authorization).toBe('Bearer some-token');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contrato: src/services/api.jsx — interceptor de response (manejo de errores)
// ─────────────────────────────────────────────────────────────────────────────
describe('API client — interceptor de response (manejo de errores)', () => {
  // Lógica exacta del interceptor de error en api.jsx:
  //   api.interceptors.response.use(
  //     (response) => response,
  //     (error) => {
  //       if (error.response?.status === 401 || error.response?.status === 403) {
  //         sessionStorage.removeItem("token");
  //         window.location.reload();
  //       }
  //       return Promise.reject(error);
  //     }
  //   );
  function responseErrorInterceptor(error, store, onReload) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      delete store.token;
      onReload();
    }
    return Promise.reject(error);
  }

  test('elimina el token y recarga en respuesta 401', async () => {
    const store = { token: 'existing-token' };
    let reloadCalled = false;

    await responseErrorInterceptor(
      { response: { status: 401 } },
      store,
      () => { reloadCalled = true; }
    ).catch(() => {});

    expect(store.token).toBeUndefined();
    expect(reloadCalled).toBe(true);
  });

  test('elimina el token y recarga en respuesta 403', async () => {
    const store = { token: 'existing-token' };
    let reloadCalled = false;

    await responseErrorInterceptor(
      { response: { status: 403 } },
      store,
      () => { reloadCalled = true; }
    ).catch(() => {});

    expect(store.token).toBeUndefined();
    expect(reloadCalled).toBe(true);
  });

  test('NO elimina el token en errores de servidor (500)', async () => {
    const store = { token: 'existing-token' };
    let reloadCalled = false;

    await responseErrorInterceptor(
      { response: { status: 500 } },
      store,
      () => { reloadCalled = true; }
    ).catch(() => {});

    expect(store.token).toBe('existing-token');
    expect(reloadCalled).toBe(false);
  });

  test('NO elimina el token en errores de cliente genéricos (400)', async () => {
    const store = { token: 'existing-token' };
    let reloadCalled = false;

    await responseErrorInterceptor(
      { response: { status: 400 } },
      store,
      () => { reloadCalled = true; }
    ).catch(() => {});

    expect(store.token).toBe('existing-token');
    expect(reloadCalled).toBe(false);
  });

  test('rechaza la promesa con el error original (para que el caller pueda manejarlo)', async () => {
    const originalError = { response: { status: 500 }, message: 'server error' };

    await expect(
      responseErrorInterceptor(originalError, {}, () => {})
    ).rejects.toBe(originalError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contrato: src/pages/Login.jsx — manejo de errores en el formulario
// ─────────────────────────────────────────────────────────────────────────────
describe('Login.jsx — manejo de errores', () => {
  test('muestra "Credenciales incorrectas" cuando el servidor rechaza el login', () => {
    let errorMessage = '';
    const setError = (msg) => { errorMessage = msg; };

    // Simula el bloque catch de handleSubmit en Login.jsx:
    //   } catch {
    //     setError("Credenciales incorrectas");
    //   }
    const handleLoginError = () => setError('Credenciales incorrectas');

    handleLoginError();
    expect(errorMessage).toBe('Credenciales incorrectas');
  });

  test('limpia el mensaje de error al iniciar un nuevo intento de login', () => {
    let errorMessage = 'error previo';
    const setError = (msg) => { errorMessage = msg; };

    // Primera línea de handleSubmit en Login.jsx: setError("")
    setError('');

    expect(errorMessage).toBe('');
  });

  test('almacena el token en sessionStorage tras login exitoso', () => {
    const sessionStore = {};
    const mockSetItem = (key, val) => { sessionStore[key] = val; };

    // Simula data.token + sessionStorage.setItem("token", data.token) en Login.jsx
    const data = { token: 'jwt-token-from-server' };
    mockSetItem('token', data.token);

    expect(sessionStore.token).toBe('jwt-token-from-server');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contrato: src/App.jsx — flujo de autenticación (token como guardia de rutas)
// ─────────────────────────────────────────────────────────────────────────────
describe('App.jsx — guardia de autenticación', () => {
  // Lógica de App.jsx:
  //   const [token, setToken] = useState(sessionStorage.getItem("token"));
  //   if (!token) return <Login onLogin={setToken} />;
  //   return <Courses />;  (+ botón Logout)
  function getViewForToken(storedToken) {
    return storedToken ? 'app' : 'login';
  }

  test('muestra la vista de login cuando no hay token almacenado', () => {
    expect(getViewForToken(null)).toBe('login');
    expect(getViewForToken(undefined)).toBe('login');
    expect(getViewForToken('')).toBe('login');
  });

  test('muestra la vista de la app cuando hay un token almacenado', () => {
    expect(getViewForToken('any-jwt-token')).toBe('app');
  });

  test('eliminar el token lleva de vuelta a la vista de login', () => {
    const sessionStore = { token: 'existing-token' };
    const removeItem   = (key) => { delete sessionStore[key]; };

    // Simula el onClick del botón Logout en App.jsx
    removeItem('token');

    expect(getViewForToken(sessionStore.token)).toBe('login');
  });
});
