// Smoke de las pantallas principales, con la sesión del setup. Solo lee datos:
// staging se comparte entre ramas.
import { test, expect } from "@playwright/test";

test("dashboard muestra los totales", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("dashboard-totals")).toBeVisible();
  await expect(page.getByTestId("dashboard-totals").getByRole("link").first()).toBeVisible();
});

test("listado de alumnos tiene filas", async ({ page }) => {
  await page.goto("/students");
  const table = page.getByTestId("students-table");
  await expect(table).toBeVisible();
  await expect(table.locator("tbody tr").first()).toBeVisible();
});

test("inscripciones: muestra la semana y abre un curso", async ({ page, isMobile }) => {
  await page.goto("/student-enrollments");
  const calendar = page.getByTestId("enrollments-calendar");

  // Desktop: grilla semanal. Mobile: lista por día (FullCalendar listWeek).
  await expect(calendar.locator(isMobile ? ".fc-list" : ".fc-timegrid")).toBeVisible();
  // Desktop: el último curso de la semana. Los del lunes quedan pegados al menú
  // lateral colapsado, que se expande al pasar el mouse y tapa el click.
  const events = calendar.locator(isMobile ? ".fc-list-event" : ".fc-event");
  const event = isMobile ? events.first() : events.last();
  await expect(event).toBeVisible();

  await event.click();
  await expect(page.getByTestId("schedule-detail")).toBeVisible();
});

test("una ruta que no existe muestra el 404", async ({ page }) => {
  await page.goto("/no-existe-esta-pagina");
  await expect(page.getByTestId("not-found")).toBeVisible();
});
