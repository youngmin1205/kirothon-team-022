#!/usr/bin/env bash
# 밥은 먹었니 — EC2 데모 서버 재배포 (팀 계정 767398015333, us-west-2)
#
# 지금 작업 트리(커밋 안 된 변경 포함, .env 제외)를 빌드해서 S3 에 올리고,
# SSM 으로 서버에 받아 서비스만 재시작한다. SSH 키·22번 포트는 쓰지 않는다.
#
#   사용: AWS_PROFILE=<팀 계정 프로필> deploy/redeploy-ec2.sh
#
# 자원 (2026-11-14 생성)
#   EC2         i-08d65295cc85c0a55 (t3.small, Name=bab-demo)
#   주소        https://d19xe2a33mtra6.cloudfront.net/?feature=bab
#   IAM 역할    bab-demo-ec2 (Sonnet 5.5 호출 + S3 번들 읽기 + SSM)
#   보안 그룹   sg-00b804c47a550b7b2 (80번, CloudFront 에서만)
#   S3          bab-demo-767398015333-usw2/bab.tgz
#
# 주의: 세션은 서버 메모리에 있다. 재배포하면 이미 보낸 부모님 링크는 열리지 않는다.
set -euo pipefail
cd "$(dirname "$0")/.."

export AWS_REGION=us-west-2
IID=i-08d65295cc85c0a55
BUCKET=bab-demo-767398015333-usw2

pnpm build
{ git ls-files -co --exclude-standard | grep -v '^\.env$'; find backend/static_dist -type f; } | sort -u > /tmp/bab-files.txt
COPYFILE_DISABLE=1 tar czf /tmp/bab.tgz -T /tmp/bab-files.txt
aws s3 cp /tmp/bab.tgz "s3://$BUCKET/bab.tgz" --quiet

CID=$(aws ssm send-command --instance-ids "$IID" --document-name AWS-RunShellScript \
  --parameters 'commands=["set -e","aws s3 cp s3://'"$BUCKET"'/bab.tgz /tmp/bab.tgz --region us-west-2 --quiet","cp /opt/bab/.env /tmp/bab.env","tar xzf /tmp/bab.tgz -C /opt/bab","cp /tmp/bab.env /opt/bab/.env","cd /opt/bab && HOME=/root UV_PYTHON_INSTALL_DIR=/opt/uv-python /usr/local/bin/uv sync --no-dev -q","systemctl restart bab","sleep 4","curl -s localhost/api/health | head -c 120"]' \
  --query Command.CommandId --output text)
sleep 20
aws ssm get-command-invocation --command-id "$CID" --instance-id "$IID" --query '[Status,StandardOutputContent]' --output text
