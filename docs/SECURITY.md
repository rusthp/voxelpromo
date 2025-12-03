# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

### API Keys and Secrets

**CRITICAL**: Never commit API keys, secrets, or credentials to the repository.

- ✅ Use `.env` file for sensitive configuration
- ✅ Add `.env` to `.gitignore`
- ✅ Use `config.json` for non-sensitive configuration
- ✅ Never hardcode credentials in source code
- ✅ Rotate API keys regularly

### Environment Variables

Required environment variables (stored in `.env`):
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `ALIEXPRESS_APP_KEY` - AliExpress API key (if not in config.json)
- `ALIEXPRESS_APP_SECRET` - AliExpress API secret (if not in config.json)
- `GROQ_API_KEY` - Groq API key for AI
- `OPENAI_API_KEY` - OpenAI API key (alternative to Groq)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token

### Configuration Files

- `config.json` - Non-sensitive configuration (can be committed)
- `.env` - Sensitive credentials (MUST be in .gitignore)

### Dependencies

- ✅ Regular security audits: `npm audit`
- ✅ Keep dependencies updated
- ✅ Review dependency changes before updating
- ✅ Use exact versions for critical dependencies

### Authentication

- ✅ JWT tokens with expiration
- ✅ Password hashing with bcrypt
- ✅ Secure session management
- ✅ Rate limiting on authentication endpoints

### API Security

- ✅ Input validation on all endpoints
- ✅ CORS configuration
- ✅ Error messages don't expose sensitive information
- ✅ Rate limiting to prevent abuse

## Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email security details to: [your-email@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond within 48 hours and work to fix the issue promptly.

## Security Checklist

Before deploying:

- [ ] All API keys are in `.env` (not committed)
- [ ] `.env` is in `.gitignore`
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Dependencies are up to date
- [ ] Authentication is properly configured
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled
- [ ] Error messages don't expose sensitive info
- [ ] Logs don't contain sensitive data
- [ ] Change all default passwords and API keys
- [ ] Use strong, unique secrets for JWT_SECRET
- [ ] Enable MongoDB authentication
- [ ] Configure firewall rules
- [ ] Use HTTPS/TLS for all connections
- [ ] Review and restrict CORS origins
- [ ] Enable security headers (Helmet.js)
- [ ] Monitor logs for suspicious activity

## Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email security details to: [your-email@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond within 48 hours and work to fix the issue promptly.
