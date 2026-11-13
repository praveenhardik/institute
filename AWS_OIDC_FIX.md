# Fix the GitHub Actions AWS OIDC check

The red ❌ on a commit means a GitHub Actions check failed. The workflow log supplied for this repository shows AWS STS rejecting the OIDC token during `AssumeRoleWithWebIdentity`. The workflow itself cannot repair an AWS IAM provider or role trust policy.

This project ZIP does not contain AWS credentials or the live AWS role configuration. It contains a trust-policy template and a workflow that prints the non-secret identifiers needed to configure the trust policy. The workflow fails clearly if AWS authentication fails; it does not convert a failed connection into a successful check.

This package was prepared from the supplied `institute.zip`. That archive's recorded `origin/main` is `45b6ce1`, while the screenshot shows the newer GitHub commit `00aefa58`. This ZIP omits `.git` history and is not a replacement for the current GitHub branch. Merge the workflow and documentation changes into the current clone; do not overwrite the remote branch with this archive.

## 1. Check the GitHub Actions variables

In GitHub, open **Settings → Secrets and variables → Actions → Variables**. Confirm these repository variables are set:

| Variable | Value |
| --- | --- |
| `AWS_ROLE_ARN` | ARN of the deploy role in the AWS account |
| `AWS_REGION` | Region used by the deployment resources |
| `DEPLOY_BUCKET` | Private S3 deployment bucket |
| `EC2_INSTANCE_ID` | EC2 instance managed by Systems Manager |
| `SSM_ENV_PARAMETER` | Name of the SecureString parameter containing the production environment |

The OIDC role should have only the permissions needed for this deployment. Do not add long-lived AWS access keys to GitHub.

## 2. Check the AWS OIDC identity provider

In the same AWS account named in `AWS_ROLE_ARN`, open **IAM → Identity providers** and verify there is an OIDC provider with:

- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

The URL, audience, and account must match the values used by the workflow. A missing provider or wrong audience can make STS reject the token before the role trust conditions are evaluated.

## 3. Match the role trust policy to this workflow

Open **IAM → Roles → your GitHub Actions deployment role → Trust relationships**. The federated principal must refer to the provider in the same AWS account:

```text
arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com
```

The trust policy must allow `sts:AssumeRoleWithWebIdentity` and restrict both `aud` and `sub`. Use the exact subject printed by the workflow step **Show OIDC trust identifiers**. The supplied [`role-trust-policy.json`](role-trust-policy.json) is a template; replace every `REPLACE_WITH_...` value before using it.

GitHub supports two subject formats:

- Legacy: `repo:praveenhardik/institute:ref:refs/heads/main`
- Immutable: `repo:praveenhardik@<OWNER_ID>/institute@<REPOSITORY_ID>:ref:refs/heads/main`

Use the format your repository actually issues. GitHub uses the immutable format for repositories created on or after July 15, 2026, and for repositories that opted in to immutable subject claims. Do not use `*` in place of the IDs; keep the trust limited to this repository and the `main` branch.

## 4. Rerun the failed check

After updating IAM, open **Actions**, select the failed run, and choose **Re-run all jobs**. A green check appears only after AWS authentication and deployment both succeed. If it still fails, inspect the `AssumeRoleWithWebIdentity` event in AWS CloudTrail and use its error code to distinguish token validation from a role trust-condition denial.

## Keep `.env` out of Git

The supplied ZIP intentionally omits `.env`; it includes `.env.example` for local setup. In an existing Git clone, remove the tracked file from the index while keeping your local copy:

```powershell
git rm --cached -- .env
git add .gitignore
git commit -m "Stop tracking environment file"
```

If a real password, token, or key was committed to the public repository, rotate it. Removing `.env` in a later commit does not erase old copies from Git history.
