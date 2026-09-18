# Security Policy

This static GitHub Pages site uses:
- HTTPS enforcement in production.
- A restrictive Content Security Policy.
- No inline JavaScript.
- External-link protection with `noopener noreferrer`.
- Blocking of unsafe URL schemes.
- Frame-busting against unauthorized embedding.

Never commit private credentials, API secrets, service-role keys, passwords, or payment secrets to this repository.
If a secret is ever committed, rotate it immediately.
