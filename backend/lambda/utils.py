"""
Shared utilities for LINDA Lambda functions.
DynamoDB helpers, logging, and common functions.
"""

import os
import json
import logging
from datetime import datetime
from decimal import Decimal
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('DYNAMODB_REGION', 'us-east-1'))

REPAIRS_LEAD_LOG_TABLE = os.environ.get('REPAIRS_LEAD_LOG_TABLE', 'Repairs_Lead_Log')
BRANDON_STATE_LOG_TABLE = os.environ.get('BRANDON_STATE_LOG_TABLE', 'Brandon_State_Log')


class DecimalEncoder(json.JSONEncoder):
    """Helper class to convert DynamoDB Decimal types to float for JSON serialization"""
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)


def create_lambda_response(status_code: int, body: dict) -> dict:
    """Create a standard Lambda HTTP response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }


def get_brandon_state() -> dict:
    """Retrieve Brandon's current state from DynamoDB"""
    try:
        table = dynamodb.Table(BRANDON_STATE_LOG_TABLE)
        response = table.get_item(Key={'state_id': 'CURRENT'})
        
        if 'Item' in response:
            logger.info(f"Retrieved Brandon state: {response['Item']}")
            return response['Item']
        else:
            logger.warning("No state found for Brandon, returning default state")
            return {
                'state_id': 'CURRENT',
                'status': 'available',
                'location': 'shop',
                'notes': 'Default state',
                'updated_at': int(datetime.utcnow().timestamp())
            }
    except Exception as e:
        logger.error(f"Error retrieving Brandon state: {e}", exc_info=True)
        raise


def update_brandon_state(state_data: dict) -> dict:
    """Update Brandon's state in DynamoDB (overwrites existing)"""
    try:
        table = dynamodb.Table(BRANDON_STATE_LOG_TABLE)
        
        # Add/update timestamp
        state_data['state_id'] = 'CURRENT'
        state_data['updated_at'] = int(datetime.utcnow().timestamp())
        
        response = table.put_item(Item=state_data)
        logger.info(f"Updated Brandon state: {state_data}")
        return state_data
    except Exception as e:
        logger.error(f"Error updating Brandon state: {e}", exc_info=True)
        raise


def create_lead(phone: str, repair_type: str, device: str, date: str, time: str) -> str:
    """Create a new repair lead in DynamoDB and return lead_id"""
    try:
        table = dynamodb.Table(REPAIRS_LEAD_LOG_TABLE)
        
        # Generate lead_id: LEAD-YYYYMMDD-HHMMSS
        now = datetime.utcnow()
        lead_id = f"LEAD-{now.strftime('%Y%m%d-%H%M%S')}"
        
        lead_item = {
            'lead_id': lead_id,
            'timestamp': int(now.timestamp()),
            'phone': phone,
            'repair_type': repair_type,
            'device': device,
            'appointment_date': date,
            'appointment_time': time,
            'status': 'booked',
            'created_at': int(now.timestamp())
        }
        
        response = table.put_item(Item=lead_item)
        logger.info(f"Created lead: {lead_id} for phone {phone}")
        return lead_id
    except Exception as e:
        logger.error(f"Error creating lead: {e}", exc_info=True)
        raise


def query_leads_for_date(date: str) -> list:
    """Query all leads for a specific date (using filter)"""
    try:
        table = dynamodb.Table(REPAIRS_LEAD_LOG_TABLE)
        
        # Scan with filter (partition key is lead_id, so we can't query by date)
        response = table.scan(
            FilterExpression='appointment_date = :date',
            ExpressionAttributeValues={':date': date}
        )
        
        logger.info(f"Found {len(response.get('Items', []))} leads for {date}")
        return response.get('Items', [])
    except Exception as e:
        logger.error(f"Error querying leads for date {date}: {e}", exc_info=True)
        raise


def get_available_slots(date: str) -> list:
    """
    Get available time slots for a given date.
    Currently returns mock slots; in production would check actual calendar.
    """
    # Mock available slots (9 AM to 5 PM, 1-hour blocks)
    all_slots = [
        '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
    ]
    
    try:
        # Get booked slots for this date
        booked_leads = query_leads_for_date(date)
        booked_times = [lead.get('appointment_time', '') for lead in booked_leads]
        
        # Return slots that are not booked
        available = [slot for slot in all_slots if slot not in booked_times]
        logger.info(f"Available slots for {date}: {available}")
        return available
    except Exception as e:
        logger.error(f"Error getting available slots: {e}", exc_info=True)
        # Return all slots if there's an error
        return all_slots
