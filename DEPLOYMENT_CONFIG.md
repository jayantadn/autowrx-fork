# Deployment Configuration Guide

This guide explains how to properly configure the application for production deployment.

## Critical: Environment Variables for Production

### Frontend Configuration (`.env`)

```bash
# Production deployment domain (REQUIRED FOR SIGN-IN)
VITE_SERVER_BASE_URL=https://your-production-domain.com
VITE_SERVER_VERSION=v2
```

**Important Notes:**
- `VITE_SERVER_BASE_URL` must point to your production backend domain
- Without this, API calls will fail with 401 errors because cookies won't be sent
- Do NOT use `http://localhost:3201` or any localhost URL in production
- Must include protocol (`https://` for production)

### Backend Configuration (`.env`)

```bash
# Environment
NODE_ENV=production
PORT=3200
MONGODB_URL=mongodb://your-mongodb-host:27017/autowrx

# JWT Settings
JWT_COOKIE_NAME=token
JWT_SECRET=your-secure-random-secret-key-change-this
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_REFRESH_EXPIRATION_DAYS=30
JWT_COOKIE_DOMAIN=your-production-domain.com

# Admin credentials (CHANGE THESE!)
ADMIN_EMAILS=admin@your-domain.com
ADMIN_PASSWORD=secure-password-here

# CORS Configuration (CRITICAL FOR SIGN-IN)
# Add your production domain(s) as regex patterns
CORS_ORIGINS=your-production-domain\\.com,www\\.your-production-domain\\.com

# Optional: Other integrations
CLIENT_BASE_URL=https://your-production-domain.com
```

## Critical Issues - Why Sign-In Fails

### Issue 1: Cookie Domain Mismatch ❌

**Problem:** Frontend and backend have different domains/ports
```
❌ Frontend: https://example.com
❌ Backend: http://localhost:3201
❌ Result: Cookies not sent, 401 error on /v2/auth/refresh-tokens
```

**Solution:**
```
✅ Frontend: https://example.com → VITE_SERVER_BASE_URL=https://example.com
✅ Backend: https://example.com → JWT_COOKIE_DOMAIN=example.com
✅ Result: Cookies sent correctly, sign-in works
```

### Issue 2: CORS Not Configured ❌

**Problem:** Backend CORS_ORIGINS doesn't include frontend domain
```
❌ CORS_ORIGINS=localhost:\d+
❌ Frontend: https://example.com
❌ Result: Request blocked by CORS policy
```

**Solution:**
```
✅ CORS_ORIGINS=example\\.com,www\\.example\\.com
✅ Result: Requests allowed, credentials sent
```

### Issue 3: Development Config in Production ❌

**Problem:** Using development .env in production
```
❌ VITE_SERVER_BASE_URL=http://localhost:3201  (in deployed app)
❌ Result: API calls to non-existent localhost server
```

**Solution:**
- Create separate `.env` files for each environment
- Deploy with correct production `.env`
- Use environment variables or docker secrets for sensitive values

## Step-by-Step Deployment Checklist

### 1. Before Deploying to Production

- [ ] Change `JWT_SECRET` to a randomly generated secure key
- [ ] Change `ADMIN_PASSWORD` to a strong password
- [ ] Update `VITE_SERVER_BASE_URL` to production domain
- [ ] Update `JWT_COOKIE_DOMAIN` to production domain
- [ ] Update `CORS_ORIGINS` to include production domain
- [ ] Update `CLIENT_BASE_URL` to production domain
- [ ] Update `MONGODB_URL` to production MongoDB instance
- [ ] Ensure all secrets are stored securely (not in git!)

### 2. Verify CORS Configuration

Your `CORS_ORIGINS` regex should match your frontend domain:

```bash
# If frontend is at: https://example.com
CORS_ORIGINS=example\\.com,www\\.example\\.com

# If frontend is at: https://app.company.co.uk
CORS_ORIGINS=app\\.company\\.co\\.uk

# Multiple domains:
CORS_ORIGINS=example\\.com,test\\.example\\.com,app\\.company\\.co\\.uk
```

### 3. Test Cookie/CORS Configuration

After deployment, verify:

1. **Open browser DevTools** (F12)
2. **Go to Application > Cookies**
3. **Sign in**
4. **Check if cookie is set** - Name should be `token`
   - If missing: Check `JWT_COOKIE_DOMAIN` and `CORS_ORIGINS`
5. **Check Network tab** for `/v2/auth/refresh-tokens`
   - Status should be **200**, not **401**
   - Cookie should be sent in the request headers

### 4. Common Production Issues & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| 401 on /v2/auth/refresh-tokens | CORS not configured | Update `CORS_ORIGINS` for your domain |
| Cookies not sent | Domain mismatch | Update `JWT_COOKIE_DOMAIN` to production domain |
| Sign-in page redirects to /login | Unknown frontend domain | Update `VITE_SERVER_BASE_URL` in frontend build |
| 404 on font files (Handrope-VariableFont.ttf) | Missing static assets | Run build and check dist folder |

## Environment Variable Reference

### Frontend (VITE_* — set at build time or runtime)
```bash
VITE_SERVER_BASE_URL      # Backend API base URL (must match backend CORS_ORIGINS)
VITE_SERVER_VERSION       # API version (default: v2)
```

### Backend (standard env vars)
```bash
NODE_ENV                  # 'development' or 'production'
PORT                      # Server port (default: 3200)
MONGODB_URL              # MongoDB connection string
JWT_SECRET               # Secret key for signing JWT tokens
JWT_COOKIE_NAME          # Cookie name for refresh token (default: token)
JWT_COOKIE_DOMAIN        # Cookie domain (production only)
CORS_ORIGINS             # Regex patterns of allowed origins
CLIENT_BASE_URL          # Frontend base URL for redirects
```

## Troubleshooting Cookie Issues

### Symptoms
- User logs in but immediately gets logged out
- Console shows 401 errors on refresh-tokens endpoint
- Cookie not visible in browser DevTools

### Debug Steps

1. **Check cookie domain matches**
   ```
   Frontend: https://example.com
   Browser cookie domain: .example.com or example.com ✅
   Browser cookie domain: localhost or empty ❌
   ```

2. **Check CORS headers**
   - Open DevTools → Network tab
   - Look for `/v2/auth/refresh-tokens` request
   - Check response headers for `Access-Control-Allow-Credentials: true`

3. **Check axios config**
   - Frontend must have `withCredentials: true` ✅ (already configured)
   - Backend must have CORS configured correctly

## Docker Deployment

For Docker deployments, use build args:

```bash
docker build \
  --build-arg VITE_SERVER_BASE_URL=https://your-domain.com \
  --build-arg VITE_SERVER_VERSION=v2 \
  -t your-app:latest .

docker run -e NODE_ENV=production \
  -e JWT_COOKIE_DOMAIN=your-domain.com \
  -e CORS_ORIGINS=your-domain\\.com \
  your-app:latest
```

## After Deployment Checklist

- [ ] Test sign-in works
- [ ] Verify cookies are being set
- [ ] Check `/v2/auth/refresh-tokens` returns 200 (not 401)
- [ ] Test creating new models
- [ ] Test creating prototypes
- [ ] Test dashboard widgets load
- [ ] Check browser DevTools console for errors
- [ ] Verify no 401 or CORS errors in console

---

**Remember:** The most common sign-in failure is a mismatch between:
1. Frontend domain
2. Backend `CORS_ORIGINS`
3. Backend `JWT_COOKIE_DOMAIN`

All three must match your production domain!
