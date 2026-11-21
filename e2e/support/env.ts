// Usuario con el que corren los specs. En local es el del seed de edutimetable-api
// (admin@example.com, el único business con datos). Staging tiene su propia base,
// así que usa E2E_STAGING_USER_* si están definidas.
const staging = process.env.E2E_TARGET === "staging";

export const credentials = {
  email: (staging && process.env.E2E_STAGING_USER_EMAIL) || process.env.E2E_USER_EMAIL || "",
  password: (staging && process.env.E2E_STAGING_USER_PASSWORD) || process.env.E2E_USER_PASSWORD || "",
};

if (!credentials.email || !credentials.password) {
  throw new Error("Faltan las credenciales de E2E: copiá .env.e2e.example a .env.e2e y completalo");
}
