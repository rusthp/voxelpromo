# 🔐 Authentication System

This document explains the authentication system implemented in VoxelPromo.

## Overview

The system uses **JWT (JSON Web Tokens)** for authentication with the following features:

- User registration and login
- Password hashing with bcrypt
- Token-based authentication
- Protected API routes
- Protected frontend routes
- Automatic token refresh
- Role-based access control (admin/user)

## Backend Implementation

### Models

**User Model** (`src/models/User.ts`):
- Username (unique, 3-30 characters)
- Email (unique, validated)
- Password (hashed with bcrypt, min 6 characters)
- Role (admin/user)
- isActive flag
- Timestamps (createdAt, updatedAt, lastLogin)

### Routes

**Auth Routes** (`src/routes/auth.routes.ts`):

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info (protected)
- `POST /api/auth/logout` - Logout (client-side token removal)
- `PUT /api/auth/change-password` - Change password (protected)

### Middleware

**Authentication Middleware** (`src/middleware/auth.ts`):

- `authenticate` - Verifies JWT token and attaches user to request
- `requireAdmin` - Ensures user has admin role

### Protected Routes

All API routes except `/api/auth` and `/health` require authentication:

- `/api/offers` - Requires authentication
- `/api/collector` - Requires authentication
- `/api/stats` - Requires authentication
- `/api/config` - Requires authentication

## Frontend Implementation

### Context

**AuthContext** (`frontend/contexts/AuthContext.tsx`):
- Manages authentication state
- Provides login, register, logout functions
- Checks authentication on mount
- Stores token in localStorage

### Components

**ProtectedRoute** (`frontend/components/ProtectedRoute.tsx`):
- Wraps protected pages
- Redirects to login if not authenticated
- Shows loading state during auth check

### Pages

**Login Page** (`frontend/app/login/page.tsx`):
- Login form
- Registration form (toggle)
- Error handling
- Beautiful UI with glassmorphism

### API Integration

**API Client** (`frontend/lib/api.ts`):
- Automatically adds JWT token to requests
- Handles 401 errors (redirects to login)
- Token stored in localStorage

## Environment Variables

Add to your `.env` file:

```env
# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=your-super-secret-key-change-this-in-production-min-32-characters

# Optional: Token expiration (default: 7d)
JWT_EXPIRES_IN=7d
```

## Usage

### Creating First User

1. **Via API** (recommended for first admin):
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

2. **Via Frontend**:
- Go to `/login`
- Click "Criar conta"
- Fill in username, email, and password
- Submit form

### Login

1. Go to `/login`
2. Enter email and password
3. Click "Entrar"
4. You'll be redirected to dashboard

### Logout

- Click the logout button (top right) in the dashboard
- Or call `logout()` from `useAuth()` hook

### Changing Password

Use the API endpoint:
```bash
curl -X PUT http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "oldpassword",
    "newPassword": "newpassword"
  }'
```

## Security Features

### Password Security
- Passwords hashed with bcrypt (10 rounds)
- Minimum 6 characters required
- Never returned in API responses

### Token Security
- Tokens expire after 7 days (configurable)
- Stored in localStorage (consider httpOnly cookies for production)
- Automatically added to all API requests
- Invalid tokens redirect to login

### Route Protection
- All API routes protected except auth endpoints
- Frontend routes protected with `ProtectedRoute` component
- 401 errors automatically handled

## Production Considerations

### Security Checklist

1. **Change JWT_SECRET**:
   ```env
   JWT_SECRET=your-very-long-random-secret-key-minimum-32-characters
   ```

2. **Use HTTPS**: Always use HTTPS in production

3. **Token Storage**: Consider using httpOnly cookies instead of localStorage

4. **Rate Limiting**: Add rate limiting to login/register endpoints

5. **CORS**: Configure CORS properly for your domain

6. **Password Policy**: Consider stronger password requirements

7. **2FA**: Consider adding two-factor authentication

8. **Session Management**: Implement token refresh mechanism

## API Examples

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "user123",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer YOUR_TOKEN

Response:
{
  "success": true,
  "user": {
    "id": "...",
    "username": "user123",
    "email": "user@example.com",
    "role": "user",
    "isActive": true,
    "lastLogin": "2024-01-15T10:30:00.000Z"
  }
}
```

## Troubleshooting

### "Token não fornecido"
- Make sure you're sending the token in the Authorization header
- Format: `Authorization: Bearer YOUR_TOKEN`

### "Token inválido"
- Token may be expired (default: 7 days)
- Token may be malformed
- JWT_SECRET may have changed

### "Usuário não encontrado"
- User may have been deleted
- Token may be for a different user

### "Usuário inativo"
- User account has been deactivated
- Contact administrator

## Related Files

- `src/models/User.ts` - User model
- `src/routes/auth.routes.ts` - Auth routes
- `src/middleware/auth.ts` - Auth middleware
- `frontend/contexts/AuthContext.tsx` - Auth context
- `frontend/components/ProtectedRoute.tsx` - Route protection
- `frontend/app/login/page.tsx` - Login page

