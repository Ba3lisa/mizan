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
   - `ANTHROPIC_API_KEY` = (your key) -- used with model `claude-haiku-4-5-20251001` (Claude Haiku 4.5) for all data extraction and LLM Council tasks
   - `GITHUB_TOKEN` = GitHub personal access token with `issues:write` permission on `Ba3lisa/mizan` (required for the GitHub Issues AI agent to read and comment on community data corrections)
3. The 12-hour cron job will start automatically
4. Seed production data: `npx convex run --prod seedData:seed`

### External Dependencies (convex.json)

The `pdf-parse` package is listed as an external dependency in `convex.json` because it is used server-side by the constitution agent to extract text from the Egyptian constitution PDF (`faolex.fao.org/docs/pdf/egy127542e.pdf`). Ensure it is installed in `node_modules` before deploying:

```bash
npm install pdf-parse --legacy-peer-deps
```

If `pdf-parse` is missing at runtime, the constitution refresh step will fail gracefully and log an error, but all other pipeline steps will continue.

### GitHub Token Setup

The `GITHUB_TOKEN` is used by `convex/agents/githubAgent.ts` to:
- Read open issues labelled `data-correction` or `stale-data`
- Post automated verification comments
- Apply the `verified` label when a correction is confirmed

Create a fine-grained personal access token at https://github.com/settings/tokens and grant it **Read and Write** access to Issues on the `Ba3lisa/mizan` repository. If the token is absent the GitHub agent skips all operations gracefully without failing.

## GitHub Secrets Required

Set these in Ba3lisa/mizan -> Settings -> Secrets:

| Secret | Source |
|--------|--------|
| `NEXT_PUBLIC_CONVEX_URL` | Production Convex URL from Convex dashboard |
| `CONVEX_DEPLOY_KEY` | Convex dashboard -> Settings -> Deploy key |
| `DIGITALOCEAN_ACCESS_TOKEN` | DigitalOcean -> API -> Personal access tokens |
