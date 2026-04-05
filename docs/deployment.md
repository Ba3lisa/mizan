# Deployment Guide -- mizanmasr.com

## DNS Setup (Cloudflare)

1. Log into Cloudflare dashboard
2. Add site: mizanmasr.com
3. Add DNS records:
   - A record: `@` -> DigitalOcean app IP (or CNAME to DO app URL)
   - CNAME: `www` -> `mizanmasr.com`
4. Enable: Proxied (orange cloud)
5. SSL/TLS: Full (strict)
6. Page Rules:
   - `www.mizanmasr.com/*` -> 301 redirect to `https://mizanmasr.com/$1`

## Cloudflare Settings

- SSL: Full (strict)
- Always Use HTTPS: ON
- Minimum TLS: 1.2
- Auto Minify: JS, CSS, HTML
- Brotli: ON
- Caching Level: Standard
- Browser Cache TTL: 4 hours
- Edge Cache TTL: 2 hours (ISR pages revalidate)

## DigitalOcean Setup

1. Create App from GitHub repo: Ba3lisa/mizan
2. Source directory: /app
3. Build command: `npm ci --legacy-peer-deps && npm run build`
4. Run command: `npm start`
5. Environment variables:
   - `NEXT_PUBLIC_CONVEX_URL` = production Convex URL
   - `NODE_ENV` = production
6. Add custom domain: mizanmasr.com

## Convex Production

1. Create production deployment: `npx convex deploy --prod`
2. Set environment variables in Convex dashboard:
   - `ANTHROPIC_API_KEY` = (your key)
3. The 6-hour cron job will start automatically
4. Seed production data: `npx convex run --prod seedData:seed`

## GitHub Secrets Required

Set these in Ba3lisa/mizan -> Settings -> Secrets:

| Secret | Source |
|--------|--------|
| `NEXT_PUBLIC_CONVEX_URL` | Production Convex URL from Convex dashboard |
| `CONVEX_DEPLOY_KEY` | Convex dashboard -> Settings -> Deploy key |
| `DIGITALOCEAN_ACCESS_TOKEN` | DigitalOcean -> API -> Personal access tokens |
