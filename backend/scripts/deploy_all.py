#!/usr/bin/env python3
"""
LINDA Backend Full Deployment Script
Deploys: IAM Role, Lambda Functions (x3), API Gateway (HTTP API)
Outputs: API Gateway Invoke URL
"""

import os
import sys
import json
import time
import zipfile
import tempfile
import shutil
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

REGION = "us-east-1"
ACCOUNT_ID = "622703699030"
ROLE_NAME = "LINDALambdaExecutionRole"
ROLE_ARN = f"arn:aws:iam::{ACCOUNT_ID}:role/{ROLE_NAME}"
LAMBDA_FUNCTIONS = {
    "LINDA-dispatcher": {
        "handler": "dispatcher.handler",
        "source": "dispatcher.py",
        "description": "Twilio webhook handler for SMS and voice to OpenAI",
    },
    "LINDA-state-manager": {
        "handler": "state_manager.handler",
        "source": "state_manager.py",
        "description": "Admin API for Brandon state management",
    },
    "LINDA-scheduler": {
        "handler": "scheduler.handler",
        "source": "scheduler.py",
        "description": "Booking API for customer appointments",
    },
}

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = SCRIPT_DIR.parent
LAMBDA_DIR = BACKEND_DIR / "lambda"
DEPLOY_DIR = BACKEND_DIR / "deploy"

# ---------------------------------------------------------------------------
# Load env
# ---------------------------------------------------------------------------

# Load .env but do NOT override existing env vars (like AWS credentials)
load_dotenv(BACKEND_DIR / ".env", override=False)

# Remove placeholder AWS creds that would override real CLI config
for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"):
    val = os.environ.get(key, "")
    if "EXAMPLE" in val:
        del os.environ[key]

ENV_VARS = {
    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", ""),
    "TWILIO_ACCOUNT_SID": os.getenv("TWILIO_ACCOUNT_SID", ""),
    "TWILIO_AUTH_TOKEN": os.getenv("TWILIO_AUTH_TOKEN", ""),
    "TWILIO_PHONE_NUMBER": os.getenv("TWILIO_PHONE_NUMBER", ""),
    "DYNAMODB_REGION": REGION,
    "REPAIRS_LEAD_LOG_TABLE": os.getenv("REPAIRS_LEAD_LOG_TABLE", "Repairs_Lead_Log"),
    "BRANDON_STATE_LOG_TABLE": os.getenv("BRANDON_STATE_LOG_TABLE", "Brandon_State_Log"),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    """Run a command and return result."""
    result = subprocess.run(cmd, capture_output=True, text=True)
    if check and result.returncode != 0:
        # Some AWS CLI errors are expected (e.g., resource already exists)
        pass
    return result


def aws(*args: str) -> subprocess.CompletedProcess:
    """Run an AWS CLI command."""
    return run(["aws", "--region", REGION, "--output", "json", *args], check=False)


def aws_json(*args: str):
    """Run AWS CLI command and parse JSON output."""
    result = aws(*args)
    if result.stdout.strip():
        return json.loads(result.stdout)
    return None


# ---------------------------------------------------------------------------
# Step 1: Verify IAM Role
# ---------------------------------------------------------------------------

def ensure_iam_role():
    print("\n" + "=" * 60)
    print("STEP 1: IAM Execution Role")
    print("=" * 60)

    result = aws("iam", "get-role", "--role-name", ROLE_NAME)
    if result.returncode == 0:
        print(f"  ✅ Role exists: {ROLE_ARN}")
    else:
        print(f"  ❌ Role not found — creating...")
        trust_policy = json.dumps({
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }],
        })
        result = aws("iam", "create-role",
                      "--role-name", ROLE_NAME,
                      "--assume-role-policy-document", trust_policy)
        if result.returncode != 0:
            print(f"  ❌ Failed to create role: {result.stderr}")
            sys.exit(1)
        print(f"  ✅ Created role: {ROLE_ARN}")

    # Attach policies
    for policy_arn in [
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    ]:
        result = aws("iam", "attach-role-policy",
                      "--role-name", ROLE_NAME,
                      "--policy-arn", policy_arn)
        policy_name = policy_arn.split("/")[-1]
        if result.returncode == 0 or "already" in result.stderr.lower():
            print(f"  ✅ Policy attached: {policy_name}")
        else:
            print(f"  ⚠️  Policy attach issue ({policy_name}): {result.stderr.strip()}")

    # Wait for role propagation
    print("  ⏳ Waiting 10s for IAM role propagation...")
    time.sleep(10)


# ---------------------------------------------------------------------------
# Step 2: Package Lambda Functions
# ---------------------------------------------------------------------------

def package_lambdas() -> dict[str, str]:
    """Package each Lambda function into a zip. Returns {name: zip_path}."""
    print("\n" + "=" * 60)
    print("STEP 2: Package Lambda Functions")
    print("=" * 60)

    DEPLOY_DIR.mkdir(exist_ok=True)

    # Install deps once into a temp location
    deps_dir = Path(tempfile.mkdtemp(prefix="linda_deps_"))
    print(f"  📦 Installing dependencies...")
    result = run([
        sys.executable, "-m", "pip", "install",
        "-r", str(BACKEND_DIR / "requirements.txt"),
        "-t", str(deps_dir),
        "--quiet",
    ])
    if result.returncode != 0:
        print(f"  ⚠️  pip install warnings: {result.stderr[:200]}")

    zips = {}
    for func_name, config in LAMBDA_FUNCTIONS.items():
        zip_path = DEPLOY_DIR / f"{func_name}.zip"
        print(f"  📦 Packaging {func_name}...")

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            # Add the handler source
            source_path = LAMBDA_DIR / config["source"]
            zf.write(source_path, config["source"])

            # Add shared utils
            utils_path = LAMBDA_DIR / "utils.py"
            zf.write(utils_path, "utils.py")

            # Add dependencies
            for root, dirs, files in os.walk(deps_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = str(file_path.relative_to(deps_dir))
                    zf.write(file_path, arcname)

        size_mb = zip_path.stat().st_size / (1024 * 1024)
        print(f"     > {zip_path.name} ({size_mb:.1f} MB)")
        zips[func_name] = str(zip_path)

    # Cleanup
    shutil.rmtree(deps_dir, ignore_errors=True)
    return zips


# ---------------------------------------------------------------------------
# Step 3: Deploy Lambda Functions
# ---------------------------------------------------------------------------

def deploy_lambdas(zips: dict[str, str]):
    print("\n" + "=" * 60)
    print("STEP 3: Deploy Lambda Functions")
    print("=" * 60)

    env_string = json.dumps({"Variables": ENV_VARS})

    for func_name, config in LAMBDA_FUNCTIONS.items():
        zip_path = zips[func_name]
        print(f"\n  🚀 Deploying {func_name}...")

        # Check if function exists
        result = aws("lambda", "get-function", "--function-name", func_name)

        # Always try to update code first (handles both existing and recently-created functions)
        print(f"     Updating code...")
        result = aws("lambda", "update-function-code",
                      "--function-name", func_name,
                      "--zip-file", f"fileb://{zip_path}")

        if result.returncode != 0 and "ResourceNotFoundException" in result.stderr:
            # Function doesn't exist — create it
            print(f"     Creating new function...")
            result = aws("lambda", "create-function",
                          "--function-name", func_name,
                          "--runtime", "python3.11",
                          "--role", ROLE_ARN,
                          "--handler", config["handler"],
                          "--description", config["description"],
                          "--zip-file", f"fileb://{zip_path}",
                          "--timeout", "60",
                          "--memory-size", "512",
                          "--environment", env_string)
        elif result.returncode == 0:
            # Code updated — now update config
            print(f"     Waiting for code update...")
            aws("lambda", "wait", "function-updated", "--function-name", func_name)
            print(f"     Updating configuration...")
            result = aws("lambda", "update-function-configuration",
                          "--function-name", func_name,
                          "--timeout", "60",
                          "--memory-size", "512",
                          "--environment", env_string)
        else:
            print(f"     ❌ Code update failed: {result.stderr[:200]}")
            continue

        if result.returncode == 0:
            print(f"     ✅ {func_name} deployed")
        else:
            print(f"     ❌ Failed: {result.stderr[:300]}")

        # Wait for function to be active
        print(f"     Waiting for function to be active...")
        aws("lambda", "wait", "function-active-v2", "--function-name", func_name)


# ---------------------------------------------------------------------------
# Step 4: Create Lambda Function URLs (replaces API Gateway)
# ---------------------------------------------------------------------------

def create_function_urls() -> dict[str, str]:
    """Create public Function URLs for each Lambda. Returns {name: url}."""
    print("\n" + "=" * 60)
    print("STEP 4: Lambda Function URLs")
    print("=" * 60)

    urls = {}
    for func_name in LAMBDA_FUNCTIONS:
        print(f"\n  Setting up URL for {func_name}...")

        # Check if URL config already exists
        result = aws("lambda", "get-function-url-config", "--function-name", func_name)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            url = data["FunctionUrl"]
            print(f"     URL already exists: {url}")
        else:
            # Create function URL with NONE auth (public) and CORS
            cors_json = json.dumps({
                "AllowOrigins": ["*"],
                "AllowMethods": ["*"],
                "AllowHeaders": ["*"],
                "MaxAge": 86400,
            })
            result = aws("lambda", "create-function-url-config",
                          "--function-name", func_name,
                          "--auth-type", "NONE",
                          "--cors", cors_json)
            if result.returncode != 0:
                print(f"     Failed: {result.stderr[:200]}")
                continue
            data = json.loads(result.stdout)
            url = data["FunctionUrl"]
            print(f"     Created URL: {url}")

        urls[func_name] = url

        # Grant public invoke permission (required for NONE auth)
        statement_id = "FunctionURLAllowPublicAccess"
        # Remove existing permission first (idempotent)
        aws("lambda", "remove-permission",
            "--function-name", func_name,
            "--statement-id", statement_id)

        result = aws("lambda", "add-permission",
                      "--function-name", func_name,
                      "--statement-id", statement_id,
                      "--action", "lambda:InvokeFunctionUrl",
                      "--principal", "*",
                      "--function-url-auth-type", "NONE")
        if result.returncode == 0:
            print(f"     Public access granted")
        else:
            if "ResourceConflictException" in result.stderr:
                print(f"     Public access already configured")
            else:
                print(f"     Permission issue: {result.stderr[:150]}")

    return urls


# ---------------------------------------------------------------------------
# Step 5: Verify
# ---------------------------------------------------------------------------

def verify(urls: dict[str, str]):
    print("\n" + "=" * 60)
    print("STEP 5: Verification")
    print("=" * 60)

    import urllib.request

    # Test state endpoint
    state_url = urls.get("LINDA-state-manager", "")
    if state_url:
        print(f"\n  Testing GET {state_url} ...")
        try:
            req = urllib.request.Request(state_url)
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode("utf-8", errors="replace")
                print(f"  State response: {body[:300]}")
        except Exception as e:
            print(f"  State test failed (may need a moment): {e}")

    # Test scheduler endpoint
    scheduler_url = urls.get("LINDA-scheduler", "")
    if scheduler_url:
        test_url = f"{scheduler_url.rstrip('/')}?date=2026-02-11"
        print(f"\n  Testing GET {test_url} ...")
        try:
            req = urllib.request.Request(test_url)
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode("utf-8", errors="replace")
                print(f"  Scheduler response: {body[:300]}")
        except Exception as e:
            print(f"  Scheduler test failed: {e}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=" * 60)
    print("  LINDA Backend Deployment")
    print(f"  Account: {ACCOUNT_ID} | Region: {REGION}")
    print("=" * 60)

    # Validate env
    if not ENV_VARS["OPENAI_API_KEY"]:
        print("OPENAI_API_KEY not found in backend/.env")
        sys.exit(1)
    print(f"  OpenAI Key: ...{ENV_VARS['OPENAI_API_KEY'][-8:]}")
    print(f"  Twilio SID: {ENV_VARS['TWILIO_ACCOUNT_SID'][:8]}...")

    ensure_iam_role()
    zips = package_lambdas()
    deploy_lambdas(zips)
    urls = create_function_urls()

    print("\n" + "=" * 60)
    print("  DEPLOYMENT COMPLETE")
    print("=" * 60)
    print(f"\n  Lambda Function URLs:")
    for name, url in urls.items():
        print(f"     {name}: {url}")

    # Save URLs to a file for easy reference
    url_file = BACKEND_DIR / "LAMBDA_URLS.json"
    url_file.write_text(json.dumps(urls, indent=2))
    print(f"\n  URLs saved to: {url_file}")

    verify(urls)

    print("\n\n  NEXT STEP: Update frontend/.env.local with:")
    for name, url in urls.items():
        short = name.replace("LINDA-", "").upper()
        print(f"     NEXT_PUBLIC_{short}_URL={url}")
    print()


if __name__ == "__main__":
    main()
