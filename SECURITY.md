# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in VoxelPromo, please report it by emailing [SECURITY_EMAIL] or opening a private security advisory on GitHub.

**Please do not open public issues for security vulnerabilities.**

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

### Secrets Management

- ✅ All sensitive credentials (API keys, tokens, passwords) are stored in `.env` file
- ✅ `.env` file is git-ignored and never committed to version control
- ❌ Never hardcode secrets in source code
- ❌ Never commit `config.json` with real credentials

### Authentication

- ✅ JWT tokens with expiration
- ✅ bcrypt for password hashing
- ⚠️ Implement refresh tokens (planned)
- ⚠️ Implement RBAC (planned)

### API Security

- ✅ CORS configured
- ⚠️ Rate limiting (in progress)
- ⚠️ Input validation with Joi (partial)
- ⚠️ Helmet.js for security headers (planned)

### Data Protection

- ✅ MongoDB connection with authentication
- ✅ Password hashing with bcrypt
- ⚠️ Encryption at rest (planned)

## Known Security Considerations

1. **Secrets in config.json**: Currently some services read from `config.json`. Migration to pure `.env` is in progress.
2. **Rate Limiting**: Not yet implemented. Endpoints are vulnerable to abuse.
3. **Input Validation**: Joi is configured but not applied to all routes yet.
4. **CORS**: Currently permissive. Needs whitelist for production.

## Security Checklist for Deployment

- [ ] Change all default passwords and API keys
- [ ] Use strong, unique secrets for JWT_SECRET
- [ ] Enable MongoDB authentication
- [ ] Configure firewall rules
- [ ] Use HTTPS/TLS for all connections
- [ ] Implement rate limiting
- [ ] Review and restrict CORS origins
- [ ] Enable security headers (Helmet.js)
- [ ] Regular dependency updates (`npm audit`)
- [ ] Monitor logs for suspicious activity

## Dependency Security

Run regular security audits:

```bash
npm audit
npm audit fix
```

## Contact

For security concerns, please contact: [SECURITY_EMAIL]
