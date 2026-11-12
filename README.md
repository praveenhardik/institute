# Institute Management System

Flask API, React/Vite frontend, and PostgreSQL. The API and production database run in AWS. Vercel builds and serves the frontend; it calls the AWS API over HTTPS using `VITE_API_BASE_URL`.

## Local development

1. Copy `.env.example` to `.env` and replace the local passwords.
2. Run `docker compose up --build` from the repository root.
3. Open `http://localhost` for the frontend. For Vite hot reload, run `npm ci --prefix frontend` and `npm run dev:frontend`; keep the local API running on port 5000.

The local PostgreSQL data lives in the `pgdata` Docker volume. Production data is stored in RDS, not in the source tree.

## AWS production requirements

- An EC2 Ubuntu instance in `ap-south-1` runs the backend container. Install Docker Engine, Docker Compose, AWS CLI, and the SSM Agent. Attach `AmazonSSMManagedInstanceCore` and the scoped policy in `deploy/iam-ec2-runtime-policy.example.json` to the instance profile; replace the `YOUR_*` placeholders. Omit its KMS statement when using the AWS-managed SSM key.
- An RDS for PostgreSQL database is reachable from the EC2 security group on port 5432 only. The database role needs schema/table migration permissions because the app initializes its schema at startup.
- Put an HTTPS Application Load Balancer in front of EC2. Use a domain you control and an ACM certificate for that domain. The load balancer forwards to EC2 port 5000. Allow port 5000 only from the load balancer security group. Allow SSH port 22 only from a trusted administrator IP, or use SSM Session Manager instead.
- The GitHub Actions role uses OIDC and the trust policy is restricted to this repository's `main` branch. The workflow uploads the committed source to S3 and calls SSM to deploy it. It uses no long-lived AWS access key.

The load balancer's HTTPS hostname is the API origin used by Vercel, for example `https://api.example.edu`. The certificate and DNS record must be valid before enabling the Vercel frontend, since browsers cannot call an HTTP API from an HTTPS site safely.

## Configure production secrets

Create a Systems Manager Parameter Store **SecureString** with dotenv-formatted content:

```dotenv
DATABASE_URL=postgresql://APP_USER:URL_ENCODED_PASSWORD@RDS_ENDPOINT:5432/college_live?sslmode=require
JWT_SECRET_KEY=REPLACE_WITH_A_LONG_RANDOM_SECRET
CORS_ORIGINS=https://YOUR_VERCEL_DOMAIN
```

Use the actual RDS endpoint, URL-encode special characters in the database username/password, generate a unique JWT secret, and list the exact Vercel origin(s), comma-separated if using more than one. Never commit this value or put it in GitHub variables.

Create an IAM role for GitHub OIDC using `role-trust-policy.json` and `deploy/iam-github-deployer-policy.example.json` as templates. Replace the `YOUR_*` placeholders. This deployer role does not need account-wide administrator access. Configure GitHub Actions repository variables:

| Variable | Value |
| --- | --- |
| `AWS_ROLE_ARN` | GitHub OIDC deployment role ARN |
| `AWS_REGION` | `ap-south-1` |
| `DEPLOY_BUCKET` | Private S3 release bucket |
| `EC2_INSTANCE_ID` | SSM-managed EC2 instance ID |
| `SSM_ENV_PARAMETER` | SecureString parameter name |

Configure Vercel to use the same GitHub repository, root directory `/`, and production branch `main`. The root `vercel.json` installs/builds `frontend` and publishes `frontend/dist`. Set the Vercel production environment variable `VITE_API_BASE_URL` to the HTTPS load balancer API origin (for example `https://api.example.edu`) and redeploy. The existing API client uses this value directly; Flask CORS must include the Vercel origin in `CORS_ORIGINS`.

After AWS resources, IAM, GitHub variables, DNS/TLS, and Vercel variables are in place, pushes to `main` deploy the backend through GitHub Actions and trigger the connected Vercel frontend deployment.

## Check the deployed URLs from Windows PowerShell

From the repository root, run `.\scripts\check-deployments.ps1`. It prompts for the actual Vercel Production Domain and AWS HTTPS API base URL, then requests the Vercel homepage and the public `GET /api/college-name` backend route. Do not enter example text such as `your-project.vercel.app` or angle-bracket placeholders. This checks that both URLs respond; it does not deploy resources or configure the Vercel environment variable. For frontend-to-backend calls, set Vercel's production `VITE_API_BASE_URL` to the AWS API base URL and set AWS `CORS_ORIGINS` to the exact Vercel origin, then redeploy both sides as needed.

## Backend settings and safety

- `DATABASE_URL` is used directly for RDS connections and supports PostgreSQL TLS options such as `sslmode=require`. Local Compose can use `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` instead.
- `APP_ENV=production` requires `JWT_SECRET_KEY` and rejects wildcard CORS. Set `CORS_ORIGINS` to exact Vercel origins.
- `PGPOOL_MIN_CONN` and `PGPOOL_MAX_CONN` configure each Gunicorn worker's database pool (defaults: 1 and 10). Keep the total across workers below the RDS connection limit.
- Startup no longer deletes accounts by username. The old database dumps and embedded PostgreSQL image were removed; take and verify RDS backups before production use.
