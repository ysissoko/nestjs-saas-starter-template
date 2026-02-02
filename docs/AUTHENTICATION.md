# Authentication Guide

Complete guide to the authentication system in NestJS SaaS Starter.

## Overview

The template provides multiple authentication strategies:
- **Local (Email/Password)** - Traditional username/password authentication
- **JWT** - Stateless authentication with JSON Web Tokens
- **Google OAuth 2.0** - Social login with Google
- **Facebook OAuth** - Social login with Facebook
- **Email Verification** - Verify user email addresses
- **Password Reset** - Secure password reset flow
- **OTP (One-Time Password)** - Two-factor authentication

## Authentication Strategies

### 1. Local Authentication (Email/Password)

#### Register New Account

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isVerified": false,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

**What happens**:
1. Password is hashed with bcrypt (10 rounds)
2. Account created with "User" role
3. Email verification token generated
4. Verification email sent

#### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "roles": ["User"]
  }
}
```

**What happens**:
1. LocalStrategy validates email/password
2. JWT token generated (expires in 60 minutes)
3. Token contains: user ID, email, roles

#### Protecting Routes

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@Request() req) {
  return req.user; // { id, email, roles, ... }
}
```

### 2. JWT Authentication

#### How It Works

```
Client Login
  ↓
Server validates credentials
  ↓
Server generates JWT token
  access_token = JWT.sign({ userId, email, roles }, SECRET)
  ↓
Client stores token (localStorage, cookie, etc.)
  ↓
Client sends token with each request
  Authorization: Bearer <access_token>
  ↓
JwtAuthGuard validates token
  ↓
JwtStrategy decodes payload
  ↓
User attached to request (req.user)
```

#### Token Structure

**Payload**:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["User"],
  "iat": 1704067200,
  "exp": 1704070800,
  "iss": "nestjs-saas-starter"
}
```

#### Configuration

**config/config.yaml**:
```yaml
auth:
  jwt:
    secret: # Set via JWT_SECRET env var
    signOptions:
      expiresIn: 60m
      issuer: nestjs-saas-starter
```

#### Security Best Practices

✅ **Do**:
- Store JWT_SECRET securely (min 32 characters)
- Use HTTPS in production
- Implement token refresh mechanism
- Set reasonable expiration times (15-60 minutes)
- Validate token on every request

❌ **Don't**:
- Store sensitive data in JWT payload (it's not encrypted)
- Use weak secrets
- Set very long expiration times
- Store tokens in localStorage if XSS is a concern (use httpOnly cookies)

### 3. Google OAuth 2.0

#### Setup

1. **Get Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create project → Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:3000/auth/google/callback`

2. **Configure**:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```

#### Flow

```
1. User clicks "Login with Google"
   ↓
2. Redirect to /auth/google
   ↓
3. GoogleAuthGuard redirects to Google
   ↓
4. User authorizes app
   ↓
5. Google redirects to /auth/google/callback?code=...
   ↓
6. GoogleStrategy validates code
   ↓
7. Get user profile from Google
   ↓
8. Find or create account
   ↓
9. Generate JWT token
   ↓
10. Redirect with token
```

#### Usage

```html
<!-- Frontend -->
<a href="http://localhost:3000/auth/google">
  Login with Google
</a>
```

**Backend**:
```typescript
@Get('google')
@UseGuards(GoogleAuthGuard)
async googleLogin() {
  // Redirects to Google
}

@Get('google/callback')
@UseGuards(GoogleAuthGuard)
async googleCallback(@Request() req) {
  // User authenticated, generate JWT
  return {
    access_token: this.authService.generateToken(req.user)
  };
}
```

### 4. Facebook OAuth

#### Setup

Similar to Google:

1. **Get Credentials**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create app → Add Facebook Login
   - Add Valid OAuth Redirect URI: `http://localhost:3000/auth/facebook/callback`

2. **Configure**:
   ```env
   FACEBOOK_CLIENT_ID=your_app_id
   FACEBOOK_CLIENT_SECRET=your_app_secret
   FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback
   ```

#### Usage

```html
<a href="http://localhost:3000/auth/facebook">
  Login with Facebook
</a>
```

### 5. Email Verification

#### Flow

```
1. User registers
   ↓
2. Verification token generated (24h expiry)
   ↓
3. Email sent with verification link
   https://yourapp.com/verify?token=...
   ↓
4. User clicks link
   ↓
5. POST /auth/verify { token }
   ↓
6. Token validated
   ↓
7. Account.isVerified = true
```

#### Verify Email

```bash
POST /auth/verify
Content-Type: application/json

{
  "token": "verification_token_from_email"
}
```

**Response**:
```json
{
  "message": "Email verified successfully"
}
```

#### Resend Verification Email

```bash
GET /auth/resend-verification?email=user@example.com
```

### 6. Password Reset

#### Flow

```
1. User forgets password
   ↓
2. POST /auth/forgot-password { email }
   ↓
3. Reset token generated (1h expiry)
   ↓
4. Email sent with reset link
   https://yourapp.com/reset?token=...
   ↓
5. User clicks link, enters new password
   ↓
6. POST /auth/reset-password { token, newPassword }
   ↓
7. Token validated
   ↓
8. Password updated (hashed)
```

#### Request Password Reset

```bash
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "Password reset email sent"
}
```

#### Reset Password

```bash
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!"
}
```

### 7. OTP (Two-Factor Authentication)

#### Enable OTP

```bash
POST /auth/enable-otp
Authorization: Bearer <token>
```

**Response**:
```json
{
  "secret": "base32_secret",
  "qrCode": "data:image/png;base64,..."
}
```

User scans QR code with authenticator app (Google Authenticator, Authy, etc.)

#### Verify OTP

```bash
POST /auth/verify-otp
Content-Type: application/json

{
  "code": "123456"
}
```

#### Login with OTP

When OTP is enabled, login requires 2 steps:

1. **Step 1**: Regular login
   ```bash
   POST /auth/login
   { "email": "...", "password": "..." }
   ```
   **Response**: `{ requiresOTP: true, tempToken: "..." }`

2. **Step 2**: Provide OTP
   ```bash
   POST /auth/verify-otp
   { "tempToken": "...", "code": "123456" }
   ```
   **Response**: `{ access_token: "..." }`

## Get Current User

```bash
GET /auth/me
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": [
    {
      "id": "uuid",
      "name": "User",
      "permissions": [...]
    }
  ],
  "isVerified": true
}
```

## Logout

```bash
GET /auth/logout
Authorization: Bearer <access_token>
```

**Note**: For stateless JWT, logout is handled client-side by removing the token. For added security, implement token blacklisting.

## Rate Limiting

Authentication endpoints are rate-limited to prevent brute force attacks:

```typescript
@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } })
async login() {
  // Max 5 login attempts per minute
}
```

## Security Features

### Password Hashing

```typescript
import * as bcrypt from 'bcrypt';

// Hash password
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password
const isMatch = await bcrypt.compare(password, hashedPassword);
```

### Token Security

- Secrets stored in environment variables
- Tokens signed with HMAC SHA-256
- Expiration times enforced
- Issuer validation

### Brute Force Protection

- Rate limiting on login endpoint (5 attempts/minute)
- Account lockout after failed attempts (configurable)
- CAPTCHA integration (optional, to be added)

## Testing Authentication

### Using cURL

```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.access_token')

# Use token
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Using Swagger UI

1. Go to http://localhost:3000/api
2. Click "Authorize" button
3. Enter: `Bearer your_token_here`
4. Test protected endpoints

## Custom Authentication

### Adding New OAuth Provider

1. **Install Passport Strategy**:
   ```bash
   pnpm add passport-twitter
   ```

2. **Create Strategy**:
   ```typescript
   // apps/backend/src/auth/strategies/twitter.strategy.ts
   @Injectable()
   export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
     constructor(configService: ConfigService) {
       super({
         consumerKey: configService.get('auth.twitter.consumerKey'),
         consumerSecret: configService.get('auth.twitter.consumerSecret'),
         callbackURL: configService.get('auth.twitter.callbackURL'),
       });
     }

     async validate(token, tokenSecret, profile) {
       // Find or create user
     }
   }
   ```

3. **Add Routes**:
   ```typescript
   @Get('twitter')
   @UseGuards(TwitterAuthGuard)
   async twitterLogin() {}

   @Get('twitter/callback')
   @UseGuards(TwitterAuthGuard)
   async twitterCallback(@Request() req) {
     return { access_token: this.authService.generateToken(req.user) };
   }
   ```

## Troubleshooting

### Invalid Token

**Error**: `Unauthorized: jwt malformed`

**Solutions**:
- Ensure token format: `Bearer <token>`
- Check JWT_SECRET matches
- Verify token hasn't expired

### OAuth Redirect Mismatch

**Error**: `redirect_uri_mismatch`

**Solutions**:
- Verify callback URL in OAuth provider matches config
- Use exact URL (including http/https, port)
- Check for trailing slashes

### Email Not Sending

**Solutions**:
- Verify SMTP credentials
- Check firewall/network settings
- Use app-specific password for Gmail
- Test with a service like Mailtrap.io

## Next Steps

- [Authorization Guide](AUTHORIZATION.md) - Learn about RBAC and permissions
- [API Documentation](http://localhost:3000/api) - Explore all endpoints
