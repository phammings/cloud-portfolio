locals {
  site_bucket         = "ryanpham-cloud-resume"
  admin_callback_urls = [for origin in local.allowed_origins : "${origin}/admin"]
}

# Only the owner logs in; nobody can sign themselves up.
resource "aws_cognito_user_pool" "admin" {
  name                     = "portfolio-admin"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  deletion_protection      = "ACTIVE"

  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
}

resource "aws_cognito_user_pool_domain" "admin" {
  domain       = "ryanlepham-portfolio"
  user_pool_id = aws_cognito_user_pool.admin.id
}

# Public client for the browser: authorization code flow with PKCE, no secret.
resource "aws_cognito_user_pool_client" "admin" {
  name                                 = "portfolio-admin-web"
  user_pool_id                         = aws_cognito_user_pool.admin.id
  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email"]
  supported_identity_providers         = ["COGNITO"]
  callback_urls                        = local.admin_callback_urls
  logout_urls                          = local.allowed_origins
  explicit_auth_flows                  = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation              = true
  access_token_validity                = 1
  id_token_validity                    = 1
  refresh_token_validity               = 7

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.api.id
  name             = "cognito"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    # Cognito access tokens carry client_id, which API Gateway checks against this audience.
    audience = [aws_cognito_user_pool_client.admin.id]
    issuer   = "https://${aws_cognito_user_pool.admin.endpoint}"
  }
}

resource "aws_apigatewayv2_route" "admin" {
  for_each           = toset(["PUT /items/{type}/{id}", "DELETE /items/{type}/{id}", "POST /uploads"])
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Lets the Lambda sign upload URLs for media/ only.
resource "aws_iam_role_policy" "api_media" {
  name = "portfolio-media"
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:PutObject"
      Resource = "arn:aws:s3:::${local.site_bucket}/media/*"
    }]
  })
}

# Browsers upload straight to S3 with the presigned POST.
resource "aws_s3_bucket_cors_configuration" "site" {
  bucket = local.site_bucket

  cors_rule {
    allowed_methods = ["POST"]
    allowed_origins = local.allowed_origins
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.admin.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.admin.id
}

output "cognito_domain" {
  value = "https://${aws_cognito_user_pool_domain.admin.domain}.auth.ca-central-1.amazoncognito.com"
}
