# Sign-In Issue - Root Cause Analysis & Fixes

## Problem Summary

After deployment, users cannot sign in. The browser console shows:
```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
/v2/auth/refresh-tokens:1
```

## Root Causes Identified

### 1. **Cookie Domain Hardcoded to 'localhost' in Development** ❌ [FIXED]

**File:** `backend/src/config/config.js`
**Original Code:**
```javascript
domain: envVars.NODE_ENV === 'production' ? envVars.JWT_COOKIE_DOMAIN : 'localhost',
```

**Problem:**
- Cookie domain was always set to 'localhost' in development
- If you accessed the app from any other hostname or IP (e.g., `192.168.1.100`, `app.local`), the browser wouldn't send the cookie
- Result: Every auth request got 401 because no credential cookie was sent

**Fix Applied:**
```javascript
// In dev: don't set domain (use current origin)
// In prod: use the configured domain from env
...(envVars.NODE_ENV === 'production' && envVars.JWT_COOKIE_DOMAIN && { domain: envVars.JWT_COOKIE_DOMAIN }),
```

**Why This Works:**
- In development: No domain specified = browser uses current origin
- In production: Domain set from `JWT_COOKIE_DOMAIN` env variable
- Users can access app from localhost, 127.0.0.1, IP address, or hostname - cookies work everywhere

---

### 2. **Frontend Config Logic Issue** ⚠️ [FIXED]

**File:** `frontend/src/configs/config.ts`
**Original Regex:**
```javascript
const isLocalDevBackend = import.meta.env.DEV && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(serverBaseUrl)
```

**Problem:**
- After deployment (production build), `import.meta.env.DEV` is always `false`
- If `VITE_SERVER_BASE_URL` wasn't properly set in production, frontend would use empty string for API base URL
- This would create relative API calls to the wrong domain

**Fix Applied:**
```javascript
const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(serverBaseUrl)
const shouldUseRelativeUrls = import.meta.env.DEV && isLocalhost
const config: any = {
  serverBaseUrl: shouldUseRelativeUrls ? '' : serverBaseUrl,
```

**Benefits:**
- Clearer logic for when to use relative URLs
- Works in both dev and production builds
- Easier to understand intent

---

### 3. **Duplicate/Wrong JWT Settings in backend/.env** ❌ [FIXED]

**File:** `backend/.env` (and `.env.example`)

**Original (Wrong):**
```bash
JWT_COOKIE_NAME=token              # First definition ✓
...
JWT_COOKIE_NAME=your-token-name    # WRONG - Duplicates and overwrites!
JWT_COOKIE_DOMAIN=your-domain      # Placeholder value
```

**Problem:**
- Second definition overwrote the first
- Placeholder values would cause issues in production
- Confusion about which value was actually being used

**Fix Applied:**
```bash
JWT_COOKIE_NAME=token                  # Single, correct definition
JWT_SECRET=dev_secret_change_me        # Clear development secret
JWT_COOKIE_DOMAIN=                     # Empty for dev, set in production only

# Comments clarifying when to use these
```

---

### 4. **Missing Deployment Configuration Guide** ❌ [FIXED]

**File:** Created `DEPLOYMENT_CONFIG.md`

**Problem:**
- No clear guidance on how to configure environment variables for production
- Users didn't know what values to set for `JWT_COOKIE_DOMAIN` and `CORS_ORIGINS`
- Led to repeated sign-in failures after deployments

**Solution:**
- Comprehensive deployment guide with:
  - Step-by-step checklist
  - Critical environment variables
  - CORS configuration examples
  - Troubleshooting guide
  - Docker deployment instructions

---

## Files Changed

| File | Change | Impact |
|------|--------|--------|
| `backend/src/config/config.js` | Remove hardcoded 'localhost' domain | Cookies work from any hostname/IP |
| `frontend/src/configs/config.ts` | Improve production config logic | Better handling of different deployment scenarios |
| `backend/.env` | Remove duplicates, clean up placeholders | Clearer configuration |
| `backend/.env.example` | Fix template with correct structure | Better guidance for deployments |
| `DEPLOYMENT_CONFIG.md` | New deployment guide | Prevents future sign-in issues |

---

## How to Deploy Successfully

### For Development (Current Setup)

Your development `.env` files are now correct:

**Backend** (`backend/.env`):
```bash
NODE_ENV=development
PORT=3201
JWT_COOKIE_DOMAIN=          # Empty = browser uses current origin
CORS_ORIGINS=localhost:\d+,127\\.0\\.0\\.1:\d+
```

**Frontend** (`frontend/.env`):
```bash
VITE_SERVER_BASE_URL=http://localhost:3201
VITE_SERVER_VERSION=v2
```

### For Production Deployment

**Step 1:** Prepare backend `.env`:
```bash
NODE_ENV=production
PORT=8080  # or your production port
MONGODB_URL=<your-production-mongodb>
JWT_SECRET=<generate-random-secret>
JWT_COOKIE_DOMAIN=your-domain.com  # ← CRITICAL
CORS_ORIGINS=your-domain\\.com,www\\.your-domain\\.com  # ← CRITICAL
CLIENT_BASE_URL=https://your-domain.com
```

**Step 2:** Build frontend with correct URL:
```bash
VITE_SERVER_BASE_URL=https://your-domain.com \
VITE_SERVER_VERSION=v2 \
npm run build
```

**Step 3:** Deploy both with matching domains
- If signfrontend domain is `https://app.example.com`
- Backend `CORS_ORIGINS` must include `app\\.example\\.com`
- Backend `JWT_COOKIE_DOMAIN` must be `. example.com` or `app.example.com`

---

## Testing After Fix

1. **Start backend:** `npm run dev` (in backend folder, port 3201)
2. **Start frontend:** `npm run dev` (in frontend folder, port 3213)
3. **Open browser:** `http://127.0.0.1:3213` or `http://localhost:3213`
4. **Test sign-in:**
   - Click "Sign In"
   - Enter credentials `admin89@email.com` / `789789789`
   - Should sign in successfully without 401 errors
5. **Verify cookie:** DevTools → Application → Cookies → Check for `token` cookie

---

## Why This Error Repeats

The sign-in failure was happening again because:

1. **Development:** Cookie domain hardcoded to 'localhost' broke when accessing from different hostname
2. **After Deployment:** Config wasn't properly set up for production domain
3. **No Documentation:** Users didn't know what environment variables to set

**All three issues are now fixed!** ✅

---

## For Your Next Deployment

1. **Read:** `DEPLOYMENT_CONFIG.md` for complete setup instructions
2. **Update:** Backend `.env` with production values
3. **Build:** Frontend with `VITE_SERVER_BASE_URL` pointing to production domain
4. **Deploy:** Both backend and frontend
5. **Test:** Sign-in should work without 401 errors

---

**Key Takeaway:** The cookie domain must match the domain the browser is accessing from. This is now handled automatically in development and can be configured in production!
