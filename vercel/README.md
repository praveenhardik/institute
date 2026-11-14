# Vercel Deployment Configurations

This folder contains all Vercel-related deployment configuration files and guides for the Institute Management & Assessment Portal.

---

### Files in this Directory

1. **`vercel.json`**
   * Root-level Vercel deployment configuration.
   * **Install Command**: `npm ci --prefix frontend`
   * **Build Command**: `npm run build --prefix frontend`
   * **Output Directory**: `frontend/dist`
   * **Rewrites**:
     * Routes `/api/:path*` to the AWS EC2 backend API origin (`http://3.27.170.60:5000/api/:path*`).
     * Routes all client-side page paths `/(.*)` to `/index.html` for single-page React router navigation.

2. **`frontend-vercel.json`**
   * Specialized configuration for when the Vercel project's **Root Directory** is set directly to `frontend/`.
   * Directly routes `/api/:path*` to the backend API origin and handles SPA fallback.

---

### Vercel Environment Variables

Set the following in the Vercel Dashboard under **Project Settings > Environment Variables**:
* **`VITE_API_BASE_URL`**: `http://3.27.170.60:5000` (or your HTTPS load balancer URL)

---

### Live Deployment
* **Vercel Production Domain**: `https://institute-dun.vercel.app`
