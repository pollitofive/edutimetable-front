// Un alumno puede estudiar varias pistas, con un nivel por pista (card #28).
// Crea su propio alumno con un email único y lo borra al final: no toca el seed.
import { test, expect, type Page } from "@playwright/test";

let email = "";

async function findStudent(page: Page) {
  await page.goto("/students");
  await page.getByTestId("students-search").fill(email);
  const rows = page.getByTestId("students-row");
  await expect(rows).toHaveCount(1);
  return rows.first();
}

test.afterEach(async ({ page }) => {
  if (!email) return;
  await page.goto("/students");
  await page.getByTestId("students-search").fill(email);
  const row = page.getByTestId("students-row");
  if (await row.count() === 0) return;
  await row.first().getByTestId("students-delete").click();
  await page.getByTestId("students-delete-confirm").click();
  await expect(page.getByTestId("students-row")).toHaveCount(0);
});

test("alta de un alumno con dos pistas, cada una con su nivel", async ({ page }) => {
  email = `e2e-${Date.now()}@example.com`;
  await page.goto("/students");
  await page.getByTestId("students-new").click();

  await page.getByTestId("student-name").fill("Alumno E2E Dos Pistas");
  await page.getByTestId("student-email").fill(email);

  // Primera pista y nivel
  const tracks = page.getByTestId("student-track");
  const levels = page.getByTestId("student-level");
  await tracks.nth(0).selectOption({ index: 1 });
  await levels.nth(0).selectOption({ index: 1 });
  const firstTrack = (await tracks.nth(0).locator("option:checked").textContent())!.trim();

  // La segunda fila no ofrece la pista que ya se eligió
  await page.getByTestId("student-add-track").click();
  await expect(tracks).toHaveCount(2);
  await expect(tracks.nth(1).locator("option", { hasText: firstTrack })).toHaveCount(0);
  await tracks.nth(1).selectOption({ index: 1 });
  await levels.nth(1).selectOption({ index: 1 });
  const secondTrack = (await tracks.nth(1).locator("option:checked").textContent())!.trim();

  await page.getByTestId("student-save").click();

  const row = await findStudent(page);
  await expect(row).toContainText(firstTrack);
  await expect(row).toContainText(secondTrack);

  // Al editar vuelven las dos filas
  await row.getByTestId("students-edit").click();
  await expect(page.getByTestId("student-track")).toHaveCount(2);
});

test("una pista sin nivel no deja guardar", async ({ page }) => {
  email = "";
  await page.goto("/students");
  await page.getByTestId("students-new").click();

  await page.getByTestId("student-name").fill("Alumno E2E Sin Nivel");
  await page.getByTestId("student-email").fill(`e2e-${Date.now()}@example.com`);
  await page.getByTestId("student-track").first().selectOption({ index: 1 });
  await page.getByTestId("student-save").click();

  await expect(page.getByTestId("student-levels")).toContainText(/nivel|level/i);
  await expect(page.getByTestId("student-name")).toBeVisible();
});
