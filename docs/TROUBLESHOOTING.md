# Troubleshooting Guide

This document consolidates common troubleshooting scenarios and their solutions.

## Configuration Issues

### Settings Not Saving
**Symptoms:** Settings page shows success but values don't persist after reload.

**Solutions:**
- Check `config.json` file permissions
- Verify backend is running and accessible
- Check browser console for errors
- Verify API endpoint `/api/config` is responding
- See `SETTINGS_SAVE_FIX.md` for detailed fix

### Config Not Loading on Startup
**Symptoms:** Server starts but configuration values are empty.

**Solutions:**
- Verify `config.json` exists and is valid JSON
- Check `loadConfigFromFile()` is called on startup
- Verify environment variables are set correctly
- See `CONFIG_LOADING_FIX.md` for details

### Nodemon Restarting on Config Save
**Symptoms:** Server restarts every time config.json is saved.

**Solutions:**
- Verify `nodemon.json` ignores `config.json`
- Check for other files being modified
- Increase delay in nodemon config
- See `NODEMON_RESTART_FIX.md` for details

## Connection Issues

### Backend Not Connecting
**Symptoms:** Frontend can't reach backend API.

**Solutions:**
- Verify backend is running on port 3000
- Check CORS configuration
- Verify firewall settings
- Check network connectivity
- See `BACKEND_CONNECTION.md` for details

### Frontend Not Loading
**Symptoms:** Frontend shows errors or blank page.

**Solutions:**
- Clear Next.js cache: `rm -rf frontend/.next`
- Restart dev server
- Check browser console for errors
- Verify Node.js version compatibility
- See `FRONTEND_DIAGNOSTIC.md` for details

## Authentication Issues

### Login Not Working
**Symptoms:** Can't log in or getting authentication errors.

**Solutions:**
- Verify JWT secret is configured
- Check user exists in database
- Verify password hashing
- Check token expiration settings
- See `TROUBLESHOOTING_AUTH.md` for details

## Database Issues

### MongoDB Connection Failed
**Symptoms:** Database connection errors.

**Solutions:**
- Verify MongoDB is running
- Check connection string in config
- Verify network access
- Check authentication credentials
- See `MONGODB_SETUP.md` for details

### WSL MongoDB Issues
**Symptoms:** MongoDB not working in WSL.

**Solutions:**
- Verify MongoDB service is running: `sudo service mongod status`
- Check WSL network configuration
- Verify port forwarding
- See `MONGODB_WSL.md` for details

## Development Issues

### TypeScript Errors
**Symptoms:** TypeScript compilation errors.

**Solutions:**
- Run `npm run type-check` to see all errors
- Verify `tsconfig.json` is correct
- Check for missing type definitions
- Update dependencies if needed

### Linting Errors
**Symptoms:** ESLint errors or warnings.

**Solutions:**
- Run `npm run lint` to see all issues
- Run `npm run lint:fix` to auto-fix
- Check `.eslintrc.json` configuration
- See `LINTING_FIXES.md` for common fixes

### Test Failures
**Symptoms:** Tests failing or not running.

**Solutions:**
- Run `npm test` to see errors
- Check Jest configuration
- Verify mocks are set up correctly
- See `TESTING_FIXES.md` for common issues

## Performance Issues

### Slow API Responses
**Symptoms:** API calls taking too long.

**Solutions:**
- Check database query performance
- Verify network latency
- Check for rate limiting
- See `PERFORMANCE_OPTIMIZATION.md` for details

## Debugging

### Debug Points
Common places to add breakpoints or logs:
- See `DEBUG_POINTS.md` for list

### Debugging Tools
- Winston logger (backend)
- Browser DevTools (frontend)
- MongoDB Compass (database)
- Postman/Insomnia (API testing)

## Getting Help

1. Check this troubleshooting guide
2. Review relevant documentation files
3. Check GitHub issues
4. Review logs for error messages
5. Ask in project chat/forum

## Related Documentation

- `SETTINGS_SAVE_FIX.md` - Settings save issues
- `CONFIG_LOADING_FIX.md` - Config loading issues
- `NODEMON_RESTART_FIX.md` - Nodemon restart issues
- `BACKEND_CONNECTION.md` - Backend connection issues
- `FRONTEND_DIAGNOSTIC.md` - Frontend issues
- `TROUBLESHOOTING_AUTH.md` - Authentication issues
- `MONGODB_SETUP.md` - MongoDB setup
- `MONGODB_WSL.md` - WSL MongoDB issues
- `LINTING_FIXES.md` - Linting fixes
- `TESTING_FIXES.md` - Testing fixes
- `PERFORMANCE_OPTIMIZATION.md` - Performance tips

