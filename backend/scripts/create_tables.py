#!/usr/bin/env python3
"""
Create DynamoDB tables for LINDA system.
Phase 3: DynamoDB Tables Creation
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_tables():
    """Create both DynamoDB tables for LINDA."""
    
    print("🔨 Creating DynamoDB Tables for LINDA System...\n")
    
    # Get configuration
    region = os.getenv('AWS_REGION') or os.getenv('DYNAMODB_REGION', 'us-east-1')
    repairs_table = os.getenv('REPAIRS_LEAD_LOG_TABLE', 'Repairs_Lead_Log')
    state_table = os.getenv('BRANDON_STATE_LOG_TABLE', 'Brandon_State_Log')
    schedule_table = os.getenv('SCHEDULE_TABLE', 'Repairs_Schedule')
    
    print(f"Region: {region}")
    print(f"Tables to create: {repairs_table}, {state_table}, {schedule_table}\n")
    
    # Create DynamoDB client
    dynamodb = boto3.client('dynamodb', region_name=region)
    
    # Table 1: Repairs_Lead_Log
    print(f"Creating table: {repairs_table}...")
    try:
        response = dynamodb.create_table(
            TableName=repairs_table,
            KeySchema=[
                {'AttributeName': 'lead_id', 'KeyType': 'HASH'},      # Partition key
                {'AttributeName': 'timestamp', 'KeyType': 'RANGE'}    # Sort key
            ],
            AttributeDefinitions=[
                {'AttributeName': 'lead_id', 'AttributeType': 'S'},
                {'AttributeName': 'timestamp', 'AttributeType': 'N'}
            ],
            BillingMode='PAY_PER_REQUEST',
            Tags=[
                {'Key': 'Project', 'Value': 'LINDA'},
                {'Key': 'Environment', 'Value': 'Development'}
            ]
        )
        print(f"✅ Table '{repairs_table}' creation initiated")
        print(f"   Status: {response['TableDescription']['TableStatus']}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            print(f"⚠️  Table '{repairs_table}' already exists")
        else:
            print(f"❌ Error creating {repairs_table}: {e}")
            return False
    
    # Table 2: Brandon_State_Log
    print(f"\nCreating table: {state_table}...")
    try:
        response = dynamodb.create_table(
            TableName=state_table,
            KeySchema=[
                {'AttributeName': 'state_id', 'KeyType': 'HASH'}     # Partition key only
            ],
            AttributeDefinitions=[
                {'AttributeName': 'state_id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST',
            Tags=[
                {'Key': 'Project', 'Value': 'LINDA'},
                {'Key': 'Environment', 'Value': 'Development'}
            ]
        )
        print(f"✅ Table '{state_table}' creation initiated")
        print(f"   Status: {response['TableDescription']['TableStatus']}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            print(f"⚠️  Table '{state_table}' already exists")
        else:
            print(f"❌ Error creating {state_table}: {e}")
            return False

    # Table 3: Repairs_Schedule
    print(f"\nCreating table: {schedule_table}...")
    try:
        response = dynamodb.create_table(
            TableName=schedule_table,
            KeySchema=[
                {'AttributeName': 'schedule_date', 'KeyType': 'HASH'},
                {'AttributeName': 'slot_time', 'KeyType': 'RANGE'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'schedule_date', 'AttributeType': 'S'},
                {'AttributeName': 'slot_time', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST',
            Tags=[
                {'Key': 'Project', 'Value': 'LINDA'},
                {'Key': 'Environment', 'Value': 'Development'}
            ]
        )
        print(f"✅ Table '{schedule_table}' creation initiated")
        print(f"   Status: {response['TableDescription']['TableStatus']}")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            print(f"⚠️  Table '{schedule_table}' already exists")
        else:
            print(f"❌ Error creating {schedule_table}: {e}")
            return False
    
    # Wait for tables to become ACTIVE
    print("\n⏳ Waiting for tables to become ACTIVE...")
    waiter = dynamodb.get_waiter('table_exists')
    
    try:
        print(f"   Waiting for {repairs_table}...")
        waiter.wait(
            TableName=repairs_table,
            WaiterConfig={'Delay': 2, 'MaxAttempts': 30}
        )
        print(f"   ✅ {repairs_table} is ACTIVE")
        
        print(f"   Waiting for {state_table}...")
        waiter.wait(
            TableName=state_table,
            WaiterConfig={'Delay': 2, 'MaxAttempts': 30}
        )
        print(f"   ✅ {state_table} is ACTIVE")

        print(f"   Waiting for {schedule_table}...")
        waiter.wait(
            TableName=schedule_table,
            WaiterConfig={'Delay': 2, 'MaxAttempts': 30}
        )
        print(f"   ✅ {schedule_table} is ACTIVE")
    except Exception as e:
        print(f"   ⚠️  Timeout waiting for tables: {e}")
        print("   Tables may still be creating. Check AWS Console.")
    
    # Verify tables exist
    print("\n🔍 Verifying tables...")
    try:
        tables = dynamodb.list_tables()['TableNames']
        
        if repairs_table in tables and state_table in tables and schedule_table in tables:
            print(f"✅ Both tables verified:")
            print(f"   - {repairs_table}")
            print(f"   - {state_table}")
            print(f"   - {schedule_table}")
            
            # Get table details
            for table_name in [repairs_table, state_table, schedule_table]:
                desc = dynamodb.describe_table(TableName=table_name)
                table_info = desc['Table']
                print(f"\n📊 {table_name}:")
                print(f"   Status: {table_info['TableStatus']}")
                print(f"   Item Count: {table_info['ItemCount']}")
                print(f"   Size: {table_info['TableSizeBytes']} bytes")
                print(f"   Billing: {table_info['BillingModeSummary']['BillingMode']}")
            
            print("\n✅ DynamoDB tables ready for use!")
            return True
        else:
            print(f"❌ Tables not found in list")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying tables: {e}")
        return False

if __name__ == "__main__":
    success = create_tables()
    sys.exit(0 if success else 1)
