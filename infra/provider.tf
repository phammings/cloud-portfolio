terraform {
  required_providers {
    aws = {
      version = ">=4.9.0"
      source  = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region  = "ca-central-1"
  access_key = "AKIA6GBMCE76OL73AH7R"
  secret_key = "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"
}
