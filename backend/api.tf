locals {
  allowed_origins = [
    "https://ryanlepham.com",
    "https://www.ryanlepham.com",
    "http://localhost:5173",
  ]
}

resource "aws_dynamodb_table" "portfolio" {
  name         = "portfolio"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # Site content lives only here now, so keep restore points.
  point_in_time_recovery {
    enabled = true
  }
}

data "archive_file" "api" {
  type        = "zip"
  source_file = "${path.module}/api/handler.py"
  output_path = "${path.module}/api/handler.zip"
}

resource "aws_iam_role" "api" {
  name = "portfolio-api"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "api_logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "api_table" {
  name = "portfolio-table"
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:Query", "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem"]
      Resource = aws_dynamodb_table.portfolio.arn
    }]
  })
}

resource "aws_lambda_function" "api" {
  function_name    = "portfolio-api"
  role             = aws_iam_role.api.arn
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.14"
  architectures    = ["arm64"]
  timeout          = 10

  environment {
    variables = {
      TABLE_NAME        = aws_dynamodb_table.portfolio.name
      MEDIA_BUCKET      = local.site_bucket
      COGNITO_CLIENT_ID = aws_cognito_user_pool_client.admin.id
    }
  }
}

resource "aws_apigatewayv2_api" "api" {
  name          = "portfolio-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = local.allowed_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 86400
  }
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "public" {
  for_each  = toset(["GET /content", "POST /views", "POST /login"])
  api_id    = aws_apigatewayv2_api.api.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  # Caps abuse of the public counter route.
  default_route_settings {
    throttling_burst_limit = 50
    throttling_rate_limit  = 20
  }

  # Login gets its own tight limit so password guessing can't eat the shared budget.
  route_settings {
    route_key              = "POST /login"
    throttling_burst_limit = 5
    throttling_rate_limit  = 1
  }

  depends_on = [aws_apigatewayv2_route.public]
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

output "api_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}
