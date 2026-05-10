# Security Implementation & Hardening

The following security measures have been implemented to ensure a robust and loop-hole-free authentication and API system.

## 1. Authentication & Authorization

-   **JWT with Rotation:** Uses short-lived Access Tokens and Refresh Tokens. Refresh tokens are rotated on every use to prevent reuse if stolen.
-   **Session Revocation:** Implemented a `tokenVersion` check on every request. Incrementing the version in the database (e.g., on logout or password change) instantly invalidates all existing sessions.
-   **Google OAuth 2.0:** Securely verifies Google ID tokens on the backend using `google-auth-library` to ensure the user identity is authentic.
-   **Protected Routes:** Every sensitive API endpoint is protected by an `authenticate` middleware.

## 2. API Security (Loop Holes Plugged)

-   **NoSQL Injection Protection:** Integrated `express-mongo-sanitize` to recursively strip any keys starting with `$` or `.` from request bodies, preventing malicious MongoDB operator injection.
-   **Rate Limiting:** Implemented `express-rate-limit` on all `/api` routes to prevent brute-force attacks and denial-of-service attempts.
-   **Security Headers:** Used `helmet` to set secure HTTP headers (HSTS, CSP, XSS protection, etc.) to protect against common web vulnerabilities.
-   **Sensitive Data Masking:** The `toSafeJSON` method in the `User` model ensures that internal fields like `passwordHash` and `tokenVersion` are never leaked to the client.
-   **Production Error Handling:** Error responses in production are generic (`Unauthorized`, `Internal Server Error`) to prevent leaking stack traces or internal logic.

## 3. Data Integrity

-   **Input Validation:** Mongoose schemas enforce strict data types, required fields, and email format validation via regex.
-   **Safe Password Hashing:** Uses `bcryptjs` with appropriate salt rounds for password storage.

## 4. Google Sign-In Troubleshooting

If Google Sign-In is still not working:
1.  **Client ID Mismatch:** Ensure `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend) are identical.
2.  **Web Client ID:** You **must** use a "Web application" Client ID in the Google Cloud Console, not "Android" or "iOS".
3.  **Authorized Origins:** In the Google Cloud Console, add `http://localhost:5173` (or your production URL) to "Authorized JavaScript origins".
4.  **Authorized Redirects:** Add `http://localhost:5173` to "Authorized redirect URIs".
