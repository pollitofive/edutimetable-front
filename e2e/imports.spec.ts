// Importar alumnos y profesores desde una planilla. Llega hasta la revisión y no
// importa: el preview no escribe nada, así que el spec no deja datos en staging.
// El archivo se arma en el momento, con emails únicos para que salgan como nuevos.
import { test, expect, type Page } from "@playwright/test";

const csv = (lines: string[]) => ({
  name: "e2e-import.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(lines.join("\r\n"), "utf-8"),
});

async function openWizard(page: Page, kind: "students" | "teachers") {
  await page.goto(`/${kind}`);
  await page.getByTestId(`${kind}-import`).click();
  const wizard = page.getByTestId("import-wizard");
  await expect(wizard).toBeVisible();
  return wizard;
}

test("importar alumnos: sugiere las columnas, asigna el nivel y revisa las filas", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const wizard = await openWizard(page, "students");

  // La fila 3 está en blanco: el alumno sin email es la fila 4 de la planilla
  await wizard.getByTestId("import-file").setInputFiles(csv([
    "Nombre;Email;Teléfono;Nivel",
    `Alumno E2E;${email};11 5555 0000;Nivel E2E`,
    "",
    "Sin Email E2E;;;Nivel E2E",
  ]));

  // Columnas sugeridas por los encabezados
  await expect(wizard.getByTestId("import-column-name")).toHaveValue("0");
  await expect(wizard.getByTestId("import-column-email")).toHaveValue("1");
  await expect(wizard.getByTestId("import-column-phone")).toHaveValue("2");
  await expect(wizard.getByTestId("import-column-level")).toHaveValue("3");
  await wizard.getByTestId("import-next").click();

  // "Nivel E2E" no existe: queda sin asignar y se elige el primer nivel de la lista
  const level = wizard.getByTestId("import-level");
  await expect(level).toHaveCount(1);
  await expect(level).toHaveValue("");
  await level.selectOption({ index: 1 });
  await wizard.getByTestId("import-next").click();

  await expect(wizard.getByTestId("import-status-new")).toHaveAttribute("data-count", "1");
  await expect(wizard.getByTestId("import-status-error")).toHaveAttribute("data-count", "1");
  // Con errores, la revisión arranca filtrada por ellos
  const rows = wizard.getByTestId("import-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute("data-row", "4");
  await expect(rows.first()).toHaveAttribute("data-status", "error");

  await wizard.getByTestId("import-status-new").click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute("data-row", "2");
  await expect(rows.first()).toContainText(email);
});

test("importar profesores: sin paso de niveles, marca el que no tiene email", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const wizard = await openWizard(page, "teachers");

  await wizard.getByTestId("import-file").setInputFiles(csv([
    "Nombre,Email",
    `Profesor E2E,${email}`,
    "Sin Email E2E,",
  ]));
  await wizard.getByTestId("import-next").click();

  await expect(wizard.getByTestId("import-status-new")).toHaveAttribute("data-count", "1");
  await expect(wizard.getByTestId("import-status-error")).toHaveAttribute("data-count", "1");
  await expect(wizard.getByTestId("import-row").first()).toHaveAttribute("data-row", "3");
});

test("importar: un archivo sin filas muestra el error de la api", async ({ page }) => {
  const wizard = await openWizard(page, "students");

  await wizard.getByTestId("import-file").setInputFiles({ name: "vacio.csv", mimeType: "text/csv", buffer: Buffer.from("Nombre;Email\r\n") });

  // Solo encabezados: la api responde 422 "empty" y el asistente sigue en el paso del archivo
  await expect(wizard.getByTestId("import-error")).toBeVisible();
  await expect(wizard.getByTestId("import-file")).toBeAttached();
});
