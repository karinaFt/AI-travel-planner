# Spec Delta

## MODIFIED Requirements

### Requirement: Security headers
API responses SHALL include standard security headers, at least `X-Content-Type-Options: nosniff`. They SHALL NOT include `X-Powered-By`. Responses SHALL carry a Content Security Policy that keeps helmet's defaults and allows images only from the same origin, `data:` URLs and the Wikimedia media hosts `https://upload.wikimedia.org` and `https://thumb.wikimedia.org`.

#### Scenario: Headers on a response
- **WHEN** a client requests `GET /api/health`
- **THEN** the response includes `X-Content-Type-Options: nosniff` and no `X-Powered-By` header

#### Scenario: Images from Wikimedia
- **WHEN** a client requests `GET /api/health`
- **THEN** the `Content-Security-Policy` header's `img-src` directive is `'self' data: https://upload.wikimedia.org https://thumb.wikimedia.org`
- **AND** its `default-src` directive is `'self'`
