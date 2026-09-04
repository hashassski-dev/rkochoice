# Security / interface test report

Date: 2026-09-04

## Passed automated checks

- JavaScript syntax check for all frontend and Netlify Function files.
- Authentication unit smoke test with a temporary scrypt password hash.
- Valid password accepted; wrong password rejected.
- Signed session cookie is created with `HttpOnly`, `Secure`, `SameSite=Strict`.
- Session parsing and CSRF verification passed.
- Cross-origin login request rejected with 403.
- `javascript:` partner URL rejected by server validation.
- SVG data URL rejected for uploaded images; only PNG/JPEG/WebP data URLs or local `/assets/` paths are accepted.
- Advertising card without an advertiser name rejected.
- Public HTTP files `/`, `/legal.html`, `/privacy.html`, `/panel/`, `/assets/app.js` return successfully under a static server.
- Health function returns 200 in direct function test.
- Public cards endpoint strips `partner` and `admin_note`; static fallback JSON contains no internal fields.
- Plaintext production password is not present in the delivered source tree.

## Architecture checks

- Public publish directory is `site/`.
- Netlify Functions are outside the publish directory.
- Two free-plan code rate limits are used: login and admin cards.
- Netlify CSP/security headers are declared globally.
- Admin/API pages are noindex/noarchive.

## Interface coverage

Responsive CSS covers narrow phones, 360-430 CSS px, tablets, and desktop breakpoints. The project uses fluid sizing (`clamp`, flexible grid, safe-area support) rather than relying on physical display inches.

A full browser-to-Netlify-Blobs integration test cannot be executed until the project is deployed or run with `netlify dev` with dependencies available. After deploy, verify:

1. `/api/health` -> HTTP 200 JSON.
2. `/panel/` -> login succeeds after env vars are configured.
3. Create/edit/delete a test card -> refresh -> change persists.
4. Logout -> `/api/session` returns 401.
5. Six rapid wrong login attempts from one IP -> Netlify begins returning 429 after rate-limit enforcement catches up.
6. DevTools response headers include CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.

## DDoS note

Application code cannot guarantee protection from volumetric DDoS. The site relies on Netlify's edge-level default DDoS protection for all plans and adds path-level rate limiting for sensitive dynamic endpoints. For larger attacks or custom WAF/firewall rules, use Netlify's advanced security/enterprise controls or place an additional specialized edge/WAF service in front of the application.
