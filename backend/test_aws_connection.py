#!/usr/bin/env python3
"""
Test AWS connectivity and DynamoDB access.
Phase 2: AWS Credentials & Basic Connectivity
"""

import os
import sys
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

# Load environment variables
load_dotenv()

def test_aws_connection():
    """Test basic AWS connectivity and DynamoDB access."""
    
    print("🔍 Testing AWS Connection...\n")
    
    # Step 1: Check environment variables
    print("Step 1: Checking environment variables...")
    aws_region = os.getenv('AWS_REGION') or os.getenv('DYNAMODB_REGION')
    access_key = os.getenv('AWS_ACCESS_KEY_ID')
    secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    
    if not aws_region:
        print("❌ AWS_REGION not set in .env file")
        return False
    
    if not access_key or not secret_key:
        print("⚠️  AWS credentials not in .env, checking AWS CLI config...")
    else:
        print(f"✅ AWS credentials found in .env")
    
    print(f"✅ Region: {aws_region}\n")
    
    # Step 2: Create DynamoDB client
    print("Step 2: Creating DynamoDB client...")
    try:
        dynamodb = boto3.client(
            'dynamodb',
            region_name=aws_region,
            aws_access_key_id=access_key if access_key else None,
            aws_secret_access_key=secret_key if secret_key else None
        )
        print("✅ DynamoDB client created\n")
    except Exception as e:
        print(f"❌ Failed to create DynamoDB client: {e}")
        return False
    
    # Step 3: Test connection by listing tables
    print("Step 3: Testing connection (listing DynamoDB tables)...")
    try:
        response = dynamodb.list_tables()
        tables = response.get('TableNames', [])
        
        if tables:
            print(f"✅ Connected! Found {len(tables)} existing table(s):")
            for table in tables:
                print(f"   - {table}")
        else:
            print("✅ Connected! No tables found (expected for new account)")
        
        print(f"\n✅ Connected to AWS - Region: {aws_region}")
        print("✅ DynamoDB access verified")
        return True
        
    except NoCredentialsError:
        print("❌ No AWS credentials found!")
        print("   Please configure AWS credentials in .env or via 'aws configure'")
        return False
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'UnrecognizedClientException':
            print("❌ Invalid AWS credentials")
        elif error_code == 'AccessDeniedException':
            print("❌ Access denied - check IAM permissions for DynamoDB")
        else:
            print(f"❌ AWS Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_aws_connection()
    sys.exit(0 if success else 1)
