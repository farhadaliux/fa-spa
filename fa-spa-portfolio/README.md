# Security Pack for Cloudflare Pages (Static SPA)

Add the files in this folder to the **root** of your `fa-spa-portfolio` repo:

- `_headers` — strict security/privacy headers + caching
- `_redirects` — SPA fallback (all routes → /index.html)
- `robots.txt` — crawler directives
- `.well-known/security.txt` — security contact & policy
- `privacy.html` — minimal privacy policy page

## Cloudflare Dashboard Settings (Recommended)

1. **SSL/TLS → Full (Strict)**, enable **HSTS (1 year, include subdomains, preload)**.
2. **Rules → Redirects**: ensure HTTPS is forced (or toggle **Always Use HTTPS**).
3. **Security → WAF**: Enable **Managed Rules** (Cloudflare Managed + OWASP) and set to “Use default” action.
4. **Security → Bots**: Enable **Bot Fight Mode**.
5. **Zero Trust → Access** (optional for private case studies):
   - Create **Self-hosted** app for `/work/private/*`.
   - Policy: Allow emails you choose (e.g., client domain) with One-Time Pin.
6. **Rate Limiting Rules** (optional): Protect any endpoints you might add later (APIs, form webhooks).

## Updating CSP later

If you add an external service (e.g., Formspree at https://api.formspree.io), you must allow it in `connect-src` and `form-action`, e.g.:

Content-Security-Policy: ... connect-src 'self' https://api.formspree.io; form-action 'self' https://formspree.io https://api.formspree.io mailto:;

