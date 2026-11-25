# edutimetable-front

SPA Vue 3 + Vite + TypeScript. En local corre en el contenedor `edutimetable_vue_app`, levantado por el compose de `edutimetable-api`. `node_modules` vive en un volumen del contenedor, no en el host: los comandos `npm` se corren con `docker exec edutimetable_vue_app npm ...`.

## Tests (Vitest)

- **Correr:** `npm run test` (una pasada), `npm run test:watch` y `npm run test:coverage` (reporte en `coverage/`).
- **CI:** el job `test` de `.github/workflows/deploy.yml` corre `npm run type-check` y `npm run test`, y `deploy` depende de él. Si el type-check o un test falla, no se deploya a ningún ambiente.
- **Ubicación:** `*.spec.ts` al lado del archivo que prueban (`calendarEvents.ts` → `calendarEvents.spec.ts`). Solo se toman los que están bajo `src/`.
- **Config:** `vitest.config.ts` extiende `vite.config.ts` (plugin de Vue y alias `@/`) con environment `jsdom`.
- **Zona horaria:** los tests corren con `TZ=America/Argentina/Buenos_Aires`. Las fechas se arman con `new Date(año, mes, día, hora)` (hora local) y no dependen del reloj real: se le pasa `now` a la función o se usa `vi.useFakeTimers()`.
- **Datos de la api:** los builders van en `src/test/factories.ts` (`makeSchedule({...})`). Devuelven un objeto válido y se pisa solo lo que importa para el test.

### Qué testear y cómo

- **Lógica pura primero.** Si un composable mezcla lógica con Vue, router, api o FullCalendar, la lógica se saca a un módulo de funciones puras y se testea ahí. Ejemplo: `src/views/enrollments/calendarEvents.ts`, usado por `useEnrollments.ts`.
- **Api:** se mockea la instancia de axios `@/api/http` con `vi.mock` y se verifica el request que arma el service y lo que devuelve. Ejemplo: `src/services/enrollmentService.spec.ts`. Nunca se le pega a una api real.
- **Componentes:** `mount` de `@vue/test-utils`. Los hijos que no importan se stubean (`global.stubs`). Por ejemplo, `LoadingIcon` lee los colores del theme, que jsdom no tiene. Con `transition: false` el contenido aparece sin esperar la animación. Ejemplo: `src/components/LoadingOverlay/LoadingOverlay.spec.ts`.
- **Estado compartido:** los composables singleton (como `useLoading`) se resetean en `afterEach`.
- **Un bug, un test:** cada fix suma un test que falla con el código viejo.
- **Fuera de alcance:** los flujos de punta a punta con navegador van en E2E (Playwright, ver abajo), no acá.

## E2E (Playwright)

Prueba la app real (front + api) en Chromium, en desktop (1280×720) y en mobile (375×812).

- **Correr** (desde el host, no adentro del contenedor del front):
  - `npm run e2e` contra local (`http://edutimetable.local.test`), con el compose de `edutimetable-api` levantado;
  - `npm run e2e:staging` contra `https://staging.edutimetable.82-25-93-70.sslip.io`;
  - `npm run e2e:ui` abre el modo UI en `http://localhost:9323`.
  - Se le pueden pasar args de Playwright: `npm run e2e -- e2e/smoke.spec.ts --project=mobile`.
- **Cómo corre:** `scripts/e2e.sh` levanta la imagen oficial `mcr.microsoft.com/playwright:v<versión>-noble`, con el repo montado y `node_modules` en el volumen `edutimetable-front-e2e-node-modules`. Hace falta porque el contenedor del front es Alpine, que Playwright no soporta. La versión de la imagen sale de `@playwright/test` en `package.json`, fijada sin `^`: si se actualiza el paquete, se actualiza la imagen.
- **Credenciales:** en `.env.e2e` (copiar de `.env.e2e.example`, no se commitea). En local se usa el usuario del seed `admin@example.com`. Staging tiene otra base: usa `E2E_STAGING_USER_*` y el basic-auth `E2E_BASIC_AUTH_*`.
- **Sesión:** `e2e/auth.setup.ts` loguea una vez y guarda el `storageState` en `e2e/.auth/<target>.json`. Los specs arrancan ya logueados. Para probar sin sesión: `test.use({ storageState: { cookies: [], origins: [] } })` (ver `e2e/login.spec.ts`).
- **Si algo falla:** trace, screenshot y video en `test-results/<test>/`, y reporte HTML en `playwright-report/`. El trace se abre con `npx playwright show-trace <trace.zip>` o en https://trace.playwright.dev.

### Convenciones para escribir specs

- **Un spec por feature** en `e2e/<feature>.spec.ts`. Cada card con impacto visible suma o amplía uno, que queda como regresión. Los nombres de los tests van en castellano y describen lo que ve el usuario.
- **Selectores**, en este orden:
  1. `getByTestId` (`data-testid` en kebab-case: `<pantalla>-<cosa>`, por ejemplo `enrollments-calendar`). Si un elemento clave no lo tiene, se agrega en el `.vue`.
  2. `getByRole` con nombre.
  3. Texto visible, como último recurso: la app está en es/en y los textos cambian.

  Nunca clases de Tailwind. Las de FullCalendar (`.fc-event`, `.fc-list-event`) se aceptan porque no tenemos otra forma de llegar.
- **Mobile:** el mismo spec corre en los dos proyectos. Si la pantalla cambia (por ejemplo, Inscripciones pasa a lista por día y abre el detalle en un bottom sheet), se ramifica con el fixture `isMobile`.
- **Esperas:** nada de `waitForTimeout`. Se usan `expect(...).toBeVisible()`, `expect.poll` o `waitForResponse`.
- **Menú lateral:** en desktop está colapsado y se expande al pasar el mouse, así que tapa la primera columna de la pantalla. Conviene hacer click lejos del borde izquierdo.
- **Datos:** staging es uno solo y se comparte entre ramas. Los specs que escriben datos crean lo suyo con un nombre único (`e2e-${Date.now()}`) y lo borran al final (`afterEach`). Nunca modifican ni borran datos del seed. Los de solo lectura se apoyan en el seed: el business de `admin@example.com` tiene tracks, cursos, profesores, alumnos e inscripciones.
