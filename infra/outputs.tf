output "app_url" {
  value = digitalocean_app.mizan.default_ingress
}

output "app_id" {
  value = digitalocean_app.mizan.id
}

output "domain" {
  value = var.domain
}
