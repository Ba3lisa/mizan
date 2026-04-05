# Mizan Infrastructure

Terraform configuration for deploying Mizan to production.

## Prerequisites

- Terraform >= 1.5
- Cloudflare account with mizanmasr.com zone
- DigitalOcean account
- GitHub personal access token

## Setup

1. Copy `terraform.tfvars.example` to `terraform.tfvars`
2. Fill in all values
3. Initialize: `terraform init`
4. Plan: `terraform plan`
5. Apply: `terraform apply`

## What gets created

- Cloudflare DNS records (A + CNAME)
- Cloudflare SSL/TLS settings
- Cloudflare page rules (www redirect, static cache)
- DigitalOcean App Platform (Next.js)
- GitHub Actions secrets
- GitHub branch protection
- GitHub issue labels

## Manual steps after apply

1. Set Convex production env vars:
   - `npx convex deploy --prod` (from app/ directory)
   - Set `ANTHROPIC_API_KEY` in Convex dashboard
   - Set `GITHUB_TOKEN` in Convex dashboard
2. Seed production data: `npx convex run --prod seedData:seed`
3. Verify site at https://mizanmasr.com
