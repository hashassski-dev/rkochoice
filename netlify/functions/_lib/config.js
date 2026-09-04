export const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "main_admin";
export const PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || "";
export const PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
export const AUTH_SECRET = process.env.AUTH_SECRET || "";
export const COOKIE_NAME = "rko_admin_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const MAX_ADMIN_BODY = 900_000;
export const MAX_LOGIN_BODY = 8_000;

export function authConfigured() {
  return typeof AUTH_SECRET === "string" && AUTH_SECRET.length >= 32 &&
    /^[a-f0-9]{32,}$/i.test(PASSWORD_SALT) && /^[a-f0-9]{128}$/i.test(PASSWORD_HASH);
}
