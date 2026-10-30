# Spec Delta

## ADDED Requirements

### Requirement: Security notes
The README SHALL describe the API's protections (rate limits, one generation at a time, AI timeout, body limit, CORS, security headers, log hygiene) and their limits: in-memory per-process counters, IP-based identification, browser-only CORS and no authentication. It SHALL state that these measures do not make the app fully secure.

#### Scenario: Reading the security notes
- **WHEN** a developer reads the README's security section
- **THEN** they find each protection with its limit values, what it does not cover, and a statement that the app is not fully secure
