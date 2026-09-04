# Security checklist

Implemented in this build:

- Netlify Functions live outside the public `site/` directory.
- CSP: scripts/styles only from the site itself, images only local/data PNG-JPEG-WebP, no frames/objects.
- HSTS, X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP/CORP.
- Admin session in `Secure; HttpOnly; SameSite=Strict` cookie, 30 days, signed with HMAC-SHA256.
- Session is bound to a hash of the browser User-Agent.
- CSRF token required for all admin writes and logout.
- Same-origin check on state-changing requests.
- Scrypt password hash; plaintext password is not present in browser code.
- `AUTH_SECRET` is mandatory in production. If missing, login returns 503 instead of using a hardcoded fallback.
- Login rate limit: 5 requests / 60 sec / IP+domain.
- Admin write/read endpoint rate limit: 60 requests / 60 sec / IP+domain.
- Request size limits and JSON Content-Type checks.
- Output escaping on public cards and admin list.
- Partner links accept only `http`/`https`; `javascript:` and other executable schemes are rejected.
- Uploaded images accept only PNG/JPEG/WebP, are re-encoded to WebP in browser, and server rejects SVG/data with other MIME types.
- IDs/strings/array values are length-limited and normalized.
- No SQL/database queries, therefore SQL injection surface is absent in this architecture.
- Admin and API are `noindex`; public API responses are limited to public card fields stored in the card objects.
- Netlify provides baseline network DDoS protection; code-based rate limiting adds application-level throttling on the sensitive endpoints.

Before production:

1. Set a random `AUTH_SECRET` of at least 32 characters in Netlify environment variables.
2. Change the admin password. Prefer a random password from a password manager.
3. Optionally move `ADMIN_PASSWORD_SALT` and `ADMIN_PASSWORD_HASH` to Netlify environment variables if the GitHub repository is public.
4. Enable MFA on Netlify and GitHub.
5. Keep deploy previews private where possible.
6. Review Netlify deploy logs to confirm both rate-limiting rules were accepted.
7. Do not add third-party analytics/scripts without updating CSP and the privacy/legal setup.
8. Do not store lead PII in this website/admin panel. Use a properly controlled CRM with access restrictions and a defined retention policy.

No website can guarantee absolute protection from DDoS or compromise. The architecture minimizes attack surface and delegates volumetric DDoS handling to Netlify's edge network.
- Public `/api/cards` explicitly strips internal fields such as `partner` and `admin_note`; the static fallback JSON is sanitized the same way.
