# edutimetable-front

SPA Vue 3 + Vite + TypeScript. En local corre en el contenedor `edutimetable_vue_app`, levantado por el compose de `edutimetable-api`. `node_modules` vive en un volumen del contenedor, no en el host: los comandos `npm` se corren con `docker exec edutimetable_vue_app npm ...`.

## Tests (Vitest)

- **Correr:** `npm run test` (una pasada), `npm run test:watch` y `npm run test:coverage` (reporte en `coverage/`).
- **CI:** el job `test` de `.github/workflows/deploy.yml` corre `npm run test`, y `deploy` depende de él. Si un test falla, no se deploya a ningún ambiente.
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
- **Fuera de alcance:** los flujos de punta a punta con navegador van en E2E (Playwright), no acá.
