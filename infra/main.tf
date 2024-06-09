# Check if the IAM role already exists
data "aws_iam_role" "existing_iam_for_lambda" {
  name = "iam_for_lambda"
}

resource "aws_iam_role" "iam_for_lambda" {
  count = length(data.aws_iam_role.existing_iam_for_lambda.arn) == 0 ? 1 : 0

  name = "iam_for_lambda"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

# Check if the IAM policy already exists
data "aws_iam_policy" "existing_iam_policy_for_resume_project" {
  name = "aws_iam_policy_for_terraform_resume_project_policy"
}

resource "aws_iam_policy" "iam_policy_for_resume_project" {
  count = length(data.aws_iam_policy.existing_iam_policy_for_resume_project.arn) == 0 ? 1 : 0

  name        = "aws_iam_policy_for_terraform_resume_project_policy"
  path        = "/"
  description = "AWS IAM Policy for managing the resume project role"
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Action" : [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource" : "arn:aws:logs:*:*:*",
        "Effect" : "Allow"
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
          "dynamodb:PutItem"
        ],
        "Resource" : "arn:aws:dynamodb:*:*:table/cloudresume-test"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_iam_policy_to_iam_role" {
  count = length(data.aws_iam_role.existing_iam_for_lambda.arn) == 0 && length(data.aws_iam_policy.existing_iam_policy_for_resume_project.arn) == 0 ? 1 : 0

  role      = coalesce(data.aws_iam_role.existing_iam_for_lambda.name, aws_iam_role.iam_for_lambda[0].name)
  policy_arn = coalesce(data.aws_iam_policy.existing_iam_policy_for_resume_project.arn, aws_iam_policy.iam_policy_for_resume_project[0].arn)
}

data "archive_file" "zip_the_python_code" {
  type        = "zip"
  source_file = "${path.module}/lambda/func.py"
  output_path = "${path.module}/lambda/func.zip"
}

resource "aws_lambda_function" "myfunc" {
  filename         = data.archive_file.zip_the_python_code.output_path
  source_code_hash = data.archive_file.zip_the_python_code.output_base64sha256
  function_name    = "myfunc"
  role             = coalesce(data.aws_iam_role.existing_iam_for_lambda.arn, aws_iam_role.iam_for_lambda[0].arn)
  handler          = "func.lambda_handler"
  runtime          = "python3.8"
}

resource "aws_lambda_function_url" "url1" {
  function_name      = aws_lambda_function.myfunc.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = true
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["date", "keep-alive"]
    expose_headers    = ["keep-alive", "date"]
    max_age           = 86400
  }
}

# Debug Outputs
output "iam_role_arn" {
  value = coalesce(data.aws_iam_role.existing_iam_for_lambda.arn, aws_iam_role.iam_for_lambda[0].arn)
}

output "iam_policy_arn" {
  value = coalesce(data.aws_iam_policy.existing_iam_policy_for_resume_project.arn, aws_iam_policy.iam_policy_for_resume_project[0].arn)
}

data "local_file" "lambda_zip" {
  filename = "${path.module}/lambda/func.zip"
}

output "lambda_zip_content" {
  value = data.local_file.lambda_zip.content
}
