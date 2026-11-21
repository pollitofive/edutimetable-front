import { test, expect } from "@playwright/test";
import { credentials } from "./support/env";

// Sin la sesión guardada: se prueba el login en sí
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("login", () => {
  test("sin sesión, una página privada manda al login", async ({ page }) => {
    await page.goto("/students");
    await expect(page).toHaveURL(/\/login/);
  });

  test("con una contraseña incorrecta no entra", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(credentials.email);
    await page.getByTestId("login-password").fill("incorrecta-123");
    const response = page.waitForResponse(r => r.url().includes("/login-token"));
    await page.getByTestId("login-submit").click();

    expect((await response).status()).toBeGreaterThanOrEqual(400);
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
  });

  test("con el usuario del seed entra", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill(credentials.email);
    await page.getByTestId("login-password").fill(credentials.password);
    await page.getByTestId("login-submit").click();

    await expect(page).not.toHaveURL(/\/login/);
  });
});
