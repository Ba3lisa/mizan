# Repository settings
resource "github_repository" "mizan" {
  name        = "mizan"
  description = "ميزان — Egypt's government, made visible. Open-source civic transparency platform."
  visibility  = "public"

  has_issues   = true
  has_projects = false
  has_wiki     = false

  topics = ["egypt", "government", "transparency", "open-data", "civic-tech", "arabic"]

  # Already exists — import rather than create
  lifecycle {
    prevent_destroy = true
  }
}

# GitHub Actions secrets
resource "github_actions_secret" "convex_url" {
  repository      = "mizan"
  secret_name     = "NEXT_PUBLIC_CONVEX_URL"
  plaintext_value = var.convex_url
}

resource "github_actions_secret" "convex_deploy_key" {
  repository      = "mizan"
  secret_name     = "CONVEX_DEPLOY_KEY"
  plaintext_value = var.convex_deploy_key
}

resource "github_actions_secret" "do_token" {
  repository      = "mizan"
  secret_name     = "DIGITALOCEAN_ACCESS_TOKEN"
  plaintext_value = var.digitalocean_token
}

# Branch protection
resource "github_branch_protection" "main" {
  repository_id = github_repository.mizan.node_id
  pattern       = "main"

  required_status_checks {
    strict = true
    contexts = ["lint-and-build"]
  }

  enforce_admins = false

  required_pull_request_reviews {
    required_approving_review_count = 0
  }
}

# Issue labels
resource "github_issue_label" "data_correction" {
  repository = "mizan"
  name       = "data-correction"
  color      = "D4A843"
}

resource "github_issue_label" "stale_data" {
  repository = "mizan"
  name       = "stale-data"
  color      = "E5484D"
}

resource "github_issue_label" "verified" {
  repository = "mizan"
  name       = "verified"
  color      = "2EC4B6"
}

resource "github_issue_label" "feature_request" {
  repository = "mizan"
  name       = "feature-request"
  color      = "6C8EEF"
}

resource "github_issue_label" "council_approved" {
  repository  = "mizan"
  name        = "council-approved"
  color       = "30A46C"
  description = "Data correction approved by the LLM Council"
}

resource "github_issue_label" "council_rejected" {
  repository  = "mizan"
  name        = "council-rejected"
  color       = "E5484D"
  description = "Data correction rejected by the LLM Council"
}

resource "github_issue_label" "needs_human_review" {
  repository  = "mizan"
  name        = "needs-human-review"
  color       = "F5A623"
  description = "Requires manual review by a maintainer"
}

resource "github_issue_label" "ui_issue" {
  repository  = "mizan"
  name        = "ui-issue"
  color       = "8B5CF6"
  description = "UI/UX suggestion or improvement"
}

resource "github_issue_label" "estimated_data" {
  repository  = "mizan"
  name        = "estimated-data"
  color       = "FFB224"
  description = "Data from non-governmental source, marked as estimated"
}

resource "github_issue_label" "spam" {
  repository  = "mizan"
  name        = "spam"
  color       = "6E7781"
  description = "Issue identified as spam by the AI agent"
}
