# DNS records
resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  content = digitalocean_app.mizan.default_ingress
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  content = var.domain
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

# SSL/TLS settings
resource "cloudflare_zone_settings_override" "mizan" {
  zone_id = var.cloudflare_zone_id
  settings {
    ssl                      = "full"
    always_use_https         = "on"
    min_tls_version          = "1.2"
    automatic_https_rewrites = "on"
    brotli                   = "on"
    browser_cache_ttl        = 14400 # 4 hours
  }
}

# Redirect www to apex
resource "cloudflare_page_rule" "www_redirect" {
  zone_id  = var.cloudflare_zone_id
  target   = "www.${var.domain}/*"
  priority = 1
  actions {
    forwarding_url {
      url         = "https://${var.domain}/$1"
      status_code = 301
    }
  }
}

# Cache settings for static assets
resource "cloudflare_page_rule" "static_cache" {
  zone_id  = var.cloudflare_zone_id
  target   = "${var.domain}/_next/static/*"
  priority = 2
  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 604800 # 7 days
  }
}
