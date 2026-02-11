#!/usr/bin/env python3
"""
Test DynamoDB CRUD operations for LINDA system.
Phase 4: DynamoDB Read/Write Testing
"""

import os
import sys
import time
import uuid
from datetime import datetime
from decimal import Decimal
from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError

# Load environment variables
load_dotenv()

def test_dynamodb_operations():
    """Test CRUD operations on both DynamoDB tables."""
    
    print("🧪 Testing DynamoDB CRUD Operations...\n")
    
    # Get configuration
    region = os.getenv('AWS_REGION') or os.getenv('DYNAMODB_REGION', 'us-east-1')
    repairs_table = os.getenv('REPAIRS_LEAD_LOG_TABLE', 'Repairs_Lead_Log')
    state_table = os.getenv('BRANDON_STATE_LOG_TABLE', 'Brandon_State_Log')
    
    print(f"Region: {region}")
    print(f"Testing tables: {repairs_table}, {state_table}\n")
    
    # Create DynamoDB resource (for easier item operations)
    dynamodb = boto3.resource('dynamodb', region_name=region)
    
    # Get table objects
    repairs = dynamodb.Table(repairs_table)
    state = dynamodb.Table(state_table)
    
    # ===============================================================
    # TEST 1: Brandon State - Write CURRENT state
    # ===============================================================
    print("=" * 60)
    print("TEST 1: Write Brandon State (CURRENT)")
    print("=" * 60)
    
    current_state = {
        'state_id': 'CURRENT',
        'mode': 'WORK',
        'last_updated': int(time.time()),
        'availability': 'Available for repairs until 6 PM',
        'voice_note': 'Test mode - system initialization'
    }
    
    try:
        state.put_item(Item=current_state)
        print(f"✅ Wrote Brandon state:")
        for key, value in current_state.items():
            print(f"   {key}: {value}")
    except ClientError as e:
        print(f"❌ Error writing state: {e}")
        return False
    
    # ===============================================================
    # TEST 2: Brandon State - Read CURRENT state back
    # ===============================================================
    print("\n" + "=" * 60)
    print("TEST 2: Read Brandon State")
    print("=" * 60)
    
    try:
        response = state.get_item(Key={'state_id': 'CURRENT'})
        if 'Item' in response:
            item = response['Item']
            print(f"✅ Read Brandon state:")
            for key, value in item.items():
                print(f"   {key}: {value}")
            
            # Verify data matches
            if item['mode'] == current_state['mode']:
                print("✅ Data verification: PASS")
            else:
                print("❌ Data verification: FAIL")
                return False
        else:
            print("❌ No item found with state_id='CURRENT'")
            return False
    except ClientError as e:
        print(f"❌ Error reading state: {e}")
        return False
    
    # ===============================================================
    # TEST 3: Brandon State - Update mode to GYM
    # ===============================================================
    print("\n" + "=" * 60)
    print("TEST 3: Update Brandon State (mode: WORK → GYM)")
    print("=" * 60)
    
    try:
        response = state.update_item(
            Key={'state_id': 'CURRENT'},
            UpdateExpression='SET #mode = :new_mode, last_updated = :timestamp',
            ExpressionAttributeNames={'#mode': 'mode'},
            ExpressionAttributeValues={
                ':new_mode': 'GYM',
                ':timestamp': int(time.time())
            },
            ReturnValues='ALL_NEW'
        )
        
        updated_item = response['Attributes']
        print(f"✅ Updated Brandon state:")
        print(f"   mode: {updated_item['mode']}")
        print(f"   last_updated: {updated_item['last_updated']}")
        
        if updated_item['mode'] == 'GYM':
            print("✅ Update verification: PASS")
        else:
            print("❌ Update verification: FAIL")
            return False
            
    except ClientError as e:
        print(f"❌ Error updating state: {e}")
        return False
    
    # ===============================================================
    # TEST 4: Repairs Lead Log - Write a mock lead
    # ===============================================================
    print("\n" + "=" * 60)
    print("TEST 4: Write Lead Entry")
    print("=" * 60)
    
    lead_id = str(uuid.uuid4())
    timestamp = int(time.time())
    
    lead_entry = {
        'lead_id': lead_id,
        'timestamp': timestamp,
        'phone': '+12025551234',
        'message': 'Do you do screen repairs for iPhone 14?',
        'response': 'Yes! I can fix iPhone 14 screens. When works for you?',
        'state': 'GYM',
        'metadata': {
            'source': 'test_script',
            'test_run': True
        }
    }
    
    try:
        repairs.put_item(Item=lead_entry)
        print(f"✅ Wrote lead entry:")
        print(f"   lead_id: {lead_id}")
        print(f"   timestamp: {timestamp} ({datetime.fromtimestamp(timestamp)})")
        print(f"   phone: {lead_entry['phone']}")
        print(f"   message: {lead_entry['message']}")
        print(f"   state: {lead_entry['state']}")
    except ClientError as e:
        print(f"❌ Error writing lead: {e}")
        return False
    
    # ===============================================================
    # TEST 5: Repairs Lead Log - Read lead back
    # ===============================================================
    print("\n" + "=" * 60)
    print("TEST 5: Read Lead Entry")
    print("=" * 60)
    
    try:
        response = repairs.get_item(
            Key={
                'lead_id': lead_id,
                'timestamp': timestamp
            }
        )
        
        if 'Item' in response:
            item = response['Item']
            print(f"✅ Read lead entry:")
            print(f"   lead_id: {item['lead_id']}")
            print(f"   phone: {item['phone']}")
            print(f"   message: {item['message']}")
            
            # Verify data matches
            if item['phone'] == lead_entry['phone']:
                print("✅ Data verification: PASS")
            else:
                print("❌ Data verification: FAIL")
                return False
        else:
            print("❌ No item found")
            return False
            
    except ClientError as e:
        print(f"❌ Error reading lead: {e}")
        return False
    
    # ===============================================================
    # TEST 6: Repairs Lead Log - Query by lead_id
    # ===============================================================
    print("\n" + "=" * 60)
    print("TEST 6: Query Lead by lead_id")
    print("=" * 60)
    
    try:
        response = repairs.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('lead_id').eq(lead_id)
        )
        
        items = response.get('Items', [])
        print(f"✅ Query returned {len(items)} item(s)")
        
        if len(items) > 0:
            print(f"   First item timestamp: {items[0]['timestamp']}")
            print("✅ Query verification: PASS")
        else:
            print("❌ Query verification: FAIL (no items)")
            return False
            
    except ClientError as e:
        print(f"❌ Error querying leads: {e}")
        return False
    
    # ===============================================================
    # TEST 7: Write another lead entry (same lead_id, different timestamp)
    # ===============================================================
    print("\n" + "=" * 60)
    print("TEST 7: Write Second Lead Entry (same lead_id)")
    print("=" * 60)
    
    time.sleep(1)  # Ensure different timestamp
    timestamp2 = int(time.time())
    
    lead_entry2 = {
        'lead_id': lead_id,
        'timestamp': timestamp2,
        'phone': '+12025551234',
        'message': 'Tomorrow at 2pm works for me',
        'response': 'Perfect! Booked for 2pm tomorrow.',
        'state': 'WORK',
        'metadata': {
            'source': 'test_script',
            'test_run': True,
            'follow_up': True
        }
    }
    
    try:
        repairs.put_item(Item=lead_entry2)
        print(f"✅ Wrote second lead entry:")
        print(f"   lead_id: {lead_id}")
        print(f"   timestamp: {timestamp2}")
        print(f"   message: {lead_entry2['message']}")
    except ClientError as e:
        print(f"❌ Error writing second lead: {e}")
        return False
    
    # ===============================================================
    # TEST 8: Query conversation history (all entries for this lead)
    # ===============================================================
    print("\n" + "=" * 60)
    print("TEST 8: Query Conversation History")
    print("=" * 60)
    
    try:
        response = repairs.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('lead_id').eq(lead_id)
        )
        
        items = response.get('Items', [])
        print(f"✅ Found {len(items)} conversation entries:")
        
        for idx, item in enumerate(items, 1):
            print(f"\n   Entry {idx}:")
            timestamp_val = int(item['timestamp']) if isinstance(item['timestamp'], Decimal) else item['timestamp']
            print(f"   - Timestamp: {item['timestamp']} ({datetime.fromtimestamp(timestamp_val)})")
            print(f"   - Message: {item['message']}")
        
        if len(items) == 2:
            print("\n✅ Conversation history verification: PASS (2 entries)")
        else:
            print(f"\n❌ Conversation history verification: FAIL (expected 2, got {len(items)})")
            return False
            
    except ClientError as e:
        print(f"❌ Error querying conversation: {e}")
        return False
    
    # ===============================================================
    # FINAL SUMMARY
    # ===============================================================
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print("✅ All tests passed!")
    print(f"\nBrandon State Table ({state_table}):")
    print("   ✅ Write operation")
    print("   ✅ Read operation")
    print("   ✅ Update operation")
    print(f"\nRepairs Lead Log Table ({repairs_table}):")
    print("   ✅ Write single entry")
    print("   ✅ Read single entry")
    print("   ✅ Query by partition key")
    print("   ✅ Write multiple entries (same partition key)")
    print("   ✅ Query conversation history")
    print("\n🎉 DynamoDB CRUD operations fully functional!")
    
    return True

if __name__ == "__main__":
    success = test_dynamodb_operations()
    sys.exit(0 if success else 1)
