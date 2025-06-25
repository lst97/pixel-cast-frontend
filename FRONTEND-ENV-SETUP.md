# Frontend Environment Configuration

## ✅ Environment Files Created

Your frontend now has proper environment configuration:

### Files Created:
- ✅ **`.env.local`** - Active development configuration
- ✅ **`env.template`** - Template for other developers
- ✅ **`lib/config.ts`** - Updated to use environment variables

## Environment Variables

### Backend Configuration:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### SRS Server Configuration:
```env
NEXT_PUBLIC_SRS_API_URL=http://158.179.18.186:1985
NEXT_PUBLIC_SRS_WEBRTC_URL=http://158.179.18.186:8000
NEXT_PUBLIC_SRS_HTTP_URL=http://158.179.18.186:8080
```

### Application Configuration:
```env
NEXT_PUBLIC_APP_NAME=PixelCast
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

### WebRTC Configuration:
```env
NEXT_PUBLIC_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
```

## How It Works

### 1. Environment Loading:
- Next.js automatically loads `.env.local` during development
- Variables with `NEXT_PUBLIC_` prefix are available in the browser
- Non-prefixed variables are only available server-side

### 2. Configuration Usage:
```typescript
// lib/config.ts now uses environment variables
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001",
  SRS_DIRECT: {
    API: process.env.NEXT_PUBLIC_SRS_API_URL || "http://158.179.18.186:1985",
    // ...
  }
}
```

### 3. Component Usage:
```typescript
import { API_CONFIG } from "@/lib/config";

// Automatically uses environment variables
const response = await fetch(buildApiUrl(ENDPOINTS.TOKEN));
```

## Development vs Production

### Development (Current):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_SRS_API_URL=http://158.179.18.186:1985
```

### Production Example:
```env
NEXT_PUBLIC_BACKEND_URL=https://api.your-domain.com
NEXT_PUBLIC_SRS_API_URL=https://srs.your-domain.com:1985
```

## Security Notes

### ⚠️ Important:
- **NEXT_PUBLIC_** variables are exposed to the browser
- Never put secrets (API keys, passwords) in NEXT_PUBLIC_ variables
- SRS URLs are safe to expose as they're needed for WebRTC connections

### Safe to Expose:
- ✅ Backend API URLs
- ✅ SRS server URLs (for WebRTC)
- ✅ STUN server URLs
- ✅ Application configuration

### Never Expose:
- ❌ Database credentials
- ❌ API keys/secrets
- ❌ Private tokens

## Quick Commands

```bash
# Check current environment variables
cat .env.local

# Copy template for new environment
cp env.template .env.production

# Restart Next.js to reload environment
pnpm dev
```

## Deployment

### For Production:
1. Create `.env.production.local` with production values
2. Update `NEXT_PUBLIC_BACKEND_URL` to your production backend
3. Update SRS URLs if using different production SRS server
4. Set `NEXT_PUBLIC_DEBUG_MODE=false` for production

### Environment Priority (Next.js):
1. `.env.local` (highest priority)
2. `.env.development` / `.env.production`
3. `.env`

## Benefits

### ✅ **Flexibility**:
- Easy to switch between environments
- No hardcoded URLs in code
- Team-specific configurations

### ✅ **Security**:
- Environment-specific secrets
- No accidental commits of sensitive data

### ✅ **Maintainability**:
- Centralized configuration
- Easy debugging and testing
- Clear separation of concerns

🎉 **Your frontend now has proper environment configuration!** 