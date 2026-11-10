terraform {
  backend "s3" {
    bucket       = "ryanpham-portfolio-tfstate"
    key          = "portfolio/terraform.tfstate"
    region       = "ca-central-1"
    use_lockfile = true
  }

  required_providers {
    aws = {
      version = "~> 6.0"
      source  = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "ca-central-1"
}
