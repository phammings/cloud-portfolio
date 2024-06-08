terraform {
  required_providers {
    aws = {
      version = "3.74.0"
      source  = "hashicorp/aws"
    }
  }
}

provider "aws" {
  profile = "default"
  region  = "ca-central-1"
}
