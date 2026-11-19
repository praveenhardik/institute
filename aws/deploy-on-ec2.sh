#!/usr/bin/env bash
set -Eeuo pipefail

PARAMETER_NAME="${1:-}"
AWS_REGION="${2:-${AWS_REGION:-ap-south-1}}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd -- "$SCRIPT_DIR/.." && pwd)}"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.aws.yml"
ENV_FILE="$PROJECT_DIR/.env"

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

[[ -n "$PARAMETER_NAME" ]] || fail "Usage: $0 <SSM SecureString parameter name> [AWS region]"
[[ -f "$COMPOSE_FILE" ]] || fail "Cannot find $COMPOSE_FILE; run this script from the extracted project."
command -v aws >/dev/null 2>&1 || fail "AWS CLI v2 is required on this EC2 instance."
command -v docker >/dev/null 2>&1 || fail "Docker Engine is required on this EC2 instance."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required (docker compose)."

printf 'Checking the EC2 instance role and AWS region %s...\n' "$AWS_REGION"
aws sts get-caller-identity --region "$AWS_REGION" >/dev/null \
  || fail "AWS credentials are unavailable. Attach an instance profile to EC2."

tmp_env="$(mktemp "$PROJECT_DIR/.env.tmp.XXXXXX")"
cleanup() { rm -f -- "$tmp_env"; }
trap cleanup EXIT
chmod 600 "$tmp_env"
printf 'Loading production settings from Systems Manager Parameter Store...\n'
aws ssm get-parameter \
  --name "$PARAMETER_NAME" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text \
  --region "$AWS_REGION" > "$tmp_env" \
  || fail "Could not read the SecureString. Check its name and EC2 IAM permissions."

for required_key in DATABASE_URL JWT_SECRET_KEY SMTP_USER SMTP_PASSWORD; do
  grep -Eq "^${required_key}=.+$" "$tmp_env" \
    || fail "SecureString is missing $required_key. No service has been restarted."
done

chmod 600 "$tmp_env"
mv -f -- "$tmp_env" "$ENV_FILE"
trap - EXIT

cd "$PROJECT_DIR"
printf 'Building backend image...\n'
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build backend

printf 'Checking SMTP connection and authentication (no email is sent)...\n'
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps backend \
  python -m backend.check_smtp

printf 'Starting backend and frontend...\n'
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

printf 'Waiting for backend health check...\n'
for attempt in $(seq 1 30); do
  container_id="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q backend 2>/dev/null || true)"
  state="$(if [[ -n "$container_id" ]]; then docker inspect --format '{{.State.Health.Status}}' "$container_id" 2>/dev/null || true; fi)"
  if [[ "$state" == "healthy" ]]; then
    printf 'Deployment is healthy. Backend and frontend are running.\n'
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
    exit 0
  fi
  sleep 5
done

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 backend
fail "Backend did not become healthy. Review the logs above."
