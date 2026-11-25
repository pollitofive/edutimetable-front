// Novedades de versión: badge en el top bar con la versión del primer elemento de
// /changelog.json y modal con todas las versiones. El archivo se intercepta con un
// JSON fijo, así el spec no depende del changelog real (vacío hasta v1.0.0) y no
// escribe nada en staging.
import { test, expect, type Page } from "@playwright/test";

const changelog = [
  {
    version: "9.3.0",
    fecha: "2026-11-20",
    titulo: "Versión E2E más nueva",
    cambios: [
      { tipo: "correccion", texto: "Corrección E2E" },
      { tipo: "nuevo", texto: "Novedad E2E" },
      { tipo: "mejora", texto: "Mejora E2E" },
    ],
  },
  {
    version: "9.2.0",
    fecha: "2026-10-01",
    titulo: "Versión E2E intermedia",
    cambios: [{ tipo: "mejora", texto: "Otra mejora E2E" }],
  },
  {
    version: "9.1.0",
    fecha: "2026-09-01",
    titulo: "Versión E2E más vieja",
    cambios: [{ tipo: "nuevo", texto: "Primera novedad E2E" }],
  },
];

async function serveChangelog(page: Page, body: string, status = 200, contentType = "application/json") {
  await page.route("**/changelog.json", (route) => route.fulfill({ status, contentType, body }));
}

test("el badge del top bar muestra la versión más nueva del changelog", async ({ page }) => {
  await serveChangelog(page, JSON.stringify(changelog));
  await page.goto("/");

  const badge = page.getByTestId("layout-version-badge");
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText("v9.3.0");
});

test("al tocar el badge se abre Novedades con todas las versiones y los cambios agrupados", async ({ page }) => {
  await serveChangelog(page, JSON.stringify(changelog));
  await page.goto("/");

  await page.getByTestId("layout-version-badge").click();
  const modal = page.getByTestId("changelog-modal");
  await expect(modal).toBeVisible();

  // Todas las versiones, en el orden del archivo
  await expect(modal.getByTestId("changelog-entry")).toHaveCount(3);
  await expect(modal.getByTestId("changelog-entry-version")).toHaveText(["v9.3.0", "v9.2.0", "v9.1.0"]);
  await expect(modal.getByTestId("changelog-empty")).toHaveCount(0);

  // La primera versión agrupa sus cambios por tipo
  const first = modal.getByTestId("changelog-entry").first();
  await expect(first).toContainText("Versión E2E más nueva");
  await expect(first.getByTestId("changelog-group-nuevo")).toContainText("Novedad E2E");
  await expect(first.getByTestId("changelog-group-mejora")).toContainText("Mejora E2E");
  await expect(first.getByTestId("changelog-group-correccion")).toContainText("Corrección E2E");

  // Una versión con un solo tipo no muestra los grupos vacíos
  const last = modal.getByTestId("changelog-entry").last();
  await expect(last.getByTestId("changelog-group-nuevo")).toContainText("Primera novedad E2E");
  await expect(last.getByTestId("changelog-group-mejora")).toHaveCount(0);
  await expect(last.getByTestId("changelog-group-correccion")).toHaveCount(0);

  await modal.getByTestId("changelog-close").click();
  await expect(modal).toBeHidden();
});

test("sin versiones publicadas (changelog vacío) no aparece el badge", async ({ page }) => {
  await serveChangelog(page, "[]");
  await page.goto("/");

  // El layout ya cargó: el dashboard está a la vista y el badge no
  await expect(page.getByTestId("dashboard-totals")).toBeVisible();
  await expect(page.getByTestId("layout-version-badge")).toHaveCount(0);
});

test("si el changelog no existe (el servidor responde el index.html) no aparece el badge", async ({ page }) => {
  await serveChangelog(page, "<!doctype html><html></html>", 200, "text/html");
  await page.goto("/");

  await expect(page.getByTestId("dashboard-totals")).toBeVisible();
  await expect(page.getByTestId("layout-version-badge")).toHaveCount(0);
});

test("en mobile el badge y el selector de business entran en el top bar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "el desborde solo puede pasar en mobile (375px)");
  await serveChangelog(page, JSON.stringify(changelog));
  await page.goto("/");

  const badge = page.getByTestId("layout-version-badge");
  await expect(badge).toBeVisible();

  // Borde derecho del contenedor del badge y de cada hijo (badge + BusinessSelector)
  const overflow = await badge.evaluate((el) => {
    const container = el.parentElement!;
    const rights = [container, ...Array.from(container.children)].map((node) => node.getBoundingClientRect().right);
    return { maxRight: Math.max(...rights), viewport: window.innerWidth, badgeLeft: el.getBoundingClientRect().left };
  });
  expect(overflow.badgeLeft).toBeGreaterThanOrEqual(0);
  expect(overflow.maxRight).toBeLessThanOrEqual(overflow.viewport);
});
