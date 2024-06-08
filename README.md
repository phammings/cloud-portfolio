# AWS Cloud Resume Challenge
<a name="readme-top"></a>
<!-- PROJECT LOGO -->
<br />
<div align="center">

<h3 align="center">AWS Cloud Resume Challenge</h3>

  <p align="center">
    This is my attempt at cloud resume challenge in AWS.
    What is Cloud Resume Challenge? - [The Cloud Resume Challenge](https://cloudresumechallenge.dev/) is a multiple-step resume project which helps build and demonstrate skills fundamental to pursuing a career in Cloud. The project was published by Forrest Brazeal and the webiste was built using React.
  </p>
</div>


<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#architecture">Architecture Diagram</a></li>
  </ol>
</details>


<!-- ABOUT THE PROJECT -->
## About The Project


This project is my submission for the Cloud Resume Challenge, showcasing my skills in AWS services and GitHub Actions. I've created a full stack ecommerce application for a clothing store using AWS services such as S3 for storage, AWS CloudFront for content delivery, Certificate Manager for SSL/TLS certificates, AWS Lambda for serverless functions, and DynamoDB for database management.

For the CI/CD process, I've implemented GitHub Actions workflows for both the frontend and backend. The workflows use Terraform to manage infrastructure as code, enabling automated deployment and scaling of the application.

Overall, this project demonstrates my proficiency in leveraging AWS services and implementing CI/CD pipelines using GitHub Actions for building modern web applications.


<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

* [![React][React]][React-url]
* [![S3][S3]][S3-url]
* [![AWS CloudFront][AWS CloudFront]][AWS CloudFront-url]
* [![Certificate Manager][Certificate Manager]][Certificate Manager-url]
* [![AWS Lambda][AWS Lambda]][AWS Lambda-url]
* [![DynamoDB][DynamoDB]][DynamoDB-url]
* [![GitHub Actions][GitHub Actions]][GitHub Actions-url]
* [![Terraform][Terraform]][Terraform-url]

### Tested With

* [![Postman][Postman]][Postman-url]


<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- ✔️ Create a static React website for your resume
- ✔️ Ensure the S3 website URL uses HTTPS with Amazon CloudFront
- ✔️ Point a custom DNS domain name to the CloudFront distribution
- ✔️ Implement a visitor counter on the webpage using JavaScript
- ✔️ Store and update the visitor count in Amazon DynamoDB
- ✔️ Create an API with AWS API Gateway and Lambda for DynamoDB interaction
- ✔️ Write Python code for the Lambda function using boto3
- ✔️ Include tests for your Python code
- ✔️ Define API resources in an AWS SAM template for easy deployment
- ✔️ Use GitHub for version control of your backend code
- ✔️ Set up GitHub Actions for Python tests and SAM application deployment
- ✔️ Create a separate GitHub repository for your website code
- ✔️ Set up actions to update the S3 bucket automatically for frontend changes
- ✔️ Ensure AWS credentials are not committed to source control



<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- DIAGRAM -->
![Architecture Diagram](/img/AWS-Architecture-Cloud-resume-challenge.png)

<p align="right">(<a href="#readme-top">back to top</a>)</p>


[React]: https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB
[React-url]: https://reactjs.org/
[S3]: https://img.shields.io/badge/S3-569A31?style=for-the-badge&logo=amazon-s3&logoColor=white
[S3-url]: https://aws.amazon.com/s3/
[AWS CloudFront]: https://img.shields.io/badge/AWS%20CloudFront-FF9900?style=for-the-badge&logo=amazon-cloudfront&logoColor=white
[AWS CloudFront-url]: https://aws.amazon.com/cloudfront/
[Certificate Manager]: https://img.shields.io/badge/Certificate%20Manager-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white
[Certificate Manager-url]: https://aws.amazon.com/certificate-manager/
[AWS Lambda]: https://img.shields.io/badge/AWS%20Lambda-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white
[AWS Lambda-url]: https://aws.amazon.com/lambda/
[DynamoDB]: https://img.shields.io/badge/DynamoDB-4053D6?style=for-the-badge&logo=amazon-dynamodb&logoColor=white
[DynamoDB-url]: https://aws.amazon.com/dynamodb/
[GitHub Actions]: https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white
[GitHub Actions-url]: https://github.com/features/actions
[Terraform]: https://img.shields.io/badge/Terraform-623CE4?style=for-the-badge&logo=terraform&logoColor=white
[Terraform-url]: https://www.terraform.io/