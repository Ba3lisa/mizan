resource "digitalocean_app" "mizan" {
  spec {
    name   = "mizan"
    region = "fra" # Frankfurt — closest to Egypt

    service {
      name               = "web"
      instance_size_slug = "professional-xs"
      instance_count     = 1
      http_port          = 3000

      github {
        repo           = "Ba3lisa/mizan"
        branch         = "main"
        deploy_on_push = true
      }

      source_dir    = "app"
      build_command  = "npm ci --legacy-peer-deps && npm run build"
      run_command    = "npm start"
      environment_slug = "node-js"

      env {
        key   = "NEXT_PUBLIC_CONVEX_URL"
        value = var.convex_url
        scope = "RUN_AND_BUILD_TIME"
      }

      env {
        key   = "NODE_ENV"
        value = "production"
        scope = "RUN_AND_BUILD_TIME"
      }

      routes {
        path = "/"
      }

      health_check {
        http_path             = "/"
        initial_delay_seconds = 15
        period_seconds        = 30
        timeout_seconds       = 5
        success_threshold     = 1
        failure_threshold     = 3
      }
    }
  }
}

# Custom domain
resource "digitalocean_app_domain_custom" "mizan" {
  app_id = digitalocean_app.mizan.id
  name   = var.domain
}
