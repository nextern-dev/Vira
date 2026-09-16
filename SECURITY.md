# Security Policy

Vira is a personal portfolio project. The following practices are built in,
and any weakness in them is considered in scope for a report:

- Per-user data isolation (every query is scoped to the authenticated user)
- Password hashing with scrypt
- Opaque, httpOnly session cookies
- Strict server-side input validation (Zod) and integer-cents money storage
- CSRF protection via Origin-versus-Host verification
- Rate limiting on authentication endpoints
- Content Security Policy and security headers

## Reporting a vulnerability

Please **do not** open a public issue with details of a security problem.
Open a private security advisory on the GitHub repository, or contact the
maintainer directly through the channel listed in their GitHub profile.

Include:

- a description of the issue and its impact
- steps to reproduce, including affected routes
- any suggested mitigation

You can expect an acknowledgement within 7 days. Non-security bugs belong in
the regular issue tracker.
