// Loguea una vez por corrida y guarda la sesión (token en localStorage) para
// los specs de los proyectos desktop y mobile.
import { test as setup, expect } from "@playwright/test";
import { authFile } from "../playwright.config";
import { credentials } from "./support/env";

setup("login", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(credentials.email);
  await page.getByTestId("login-password").fill(credentials.password);
  await page.getByTestId("login-submit").click();

  await expect(page).not.toHaveURL(/\/login/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("token"))).toBeTruthy();

  await page.context().storageState({ path: authFile });
});
