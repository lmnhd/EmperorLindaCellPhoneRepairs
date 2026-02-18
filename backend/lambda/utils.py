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
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('DYNAMODB_REGION', 'us-east-1'))

REPAIRS_LEAD_LOG_TABLE = os.environ.get('REPAIRS_LEAD_LOG_TABLE', 'Repairs_Lead_Log')
BRANDON_STATE_LOG_TABLE = os.environ.get('BRANDON_STATE_LOG_TABLE', 'Brandon_State_Log')
SCHEDULE_TABLE = os.environ.get('SCHEDULE_TABLE', 'Repairs_Schedule')

DEFAULT_DAILY_SLOTS = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
]


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


def _generate_lead_id() -> str:
    """Generate a lead ID with second-level timestamp and millisecond entropy."""
    now = datetime.utcnow()
    return f"LEAD-{now.strftime('%Y%m%d-%H%M%S')}-{int(now.microsecond / 1000):03d}"


def create_lead(phone: str, repair_type: str, device: str, date: str, time: str, lead_id: str | None = None) -> str:
    """Create a new repair lead in DynamoDB and return lead_id"""
    try:
        table = dynamodb.Table(REPAIRS_LEAD_LOG_TABLE)
        
        now = datetime.utcnow()
        resolved_lead_id = lead_id or _generate_lead_id()
        
        lead_item = {
            'lead_id': resolved_lead_id,
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
                logger.info(f"Created lead: {resolved_lead_id} for phone {phone}")
                return resolved_lead_id
    except Exception as e:
        logger.error(f"Error creating lead: {e}", exc_info=True)
        raise


        def ensure_schedule_seeded(date: str) -> None:
            """Ensure all default slots exist for a given date in the schedule table."""
            schedule_table = dynamodb.Table(SCHEDULE_TABLE)
            now_ts = int(datetime.utcnow().timestamp())

            for slot_time in DEFAULT_DAILY_SLOTS:
                try:
                    schedule_table.put_item(
                        Item={
                            'schedule_date': date,
                            'slot_time': slot_time,
                            'status': 'available',
                            'created_at': now_ts,
                            'updated_at': now_ts,
                        },
                        ConditionExpression='attribute_not_exists(schedule_date) AND attribute_not_exists(slot_time)',
                    )
                except ClientError as error:
                    if error.response.get('Error', {}).get('Code') != 'ConditionalCheckFailedException':
                        raise


        def get_schedule_for_date(date: str) -> list[dict]:
            """Get full schedule rows for a date from persistent schedule table."""
            ensure_schedule_seeded(date)
            schedule_table = dynamodb.Table(SCHEDULE_TABLE)

            response = schedule_table.query(
                KeyConditionExpression=Key('schedule_date').eq(date),
                ScanIndexForward=True,
            )

            items = response.get('Items', [])
            items.sort(key=lambda item: DEFAULT_DAILY_SLOTS.index(item['slot_time']) if item['slot_time'] in DEFAULT_DAILY_SLOTS else 999)
            return items


        def reserve_slot(date: str, time: str, lead_id: str, phone: str, repair_type: str, device: str) -> bool:
            """Atomically reserve a slot. Returns False when slot is unavailable."""
            ensure_schedule_seeded(date)
            schedule_table = dynamodb.Table(SCHEDULE_TABLE)
            now_ts = int(datetime.utcnow().timestamp())

            try:
                schedule_table.update_item(
                    Key={
                        'schedule_date': date,
                        'slot_time': time,
                    },
                    UpdateExpression='SET #status = :booked, lead_id = :lead_id, phone = :phone, repair_type = :repair_type, device = :device, updated_at = :updated_at',
                    ConditionExpression='#status = :available',
                    ExpressionAttributeNames={
                        '#status': 'status',
                    },
                    ExpressionAttributeValues={
                        ':available': 'available',
                        ':booked': 'booked',
                        ':lead_id': lead_id,
                        ':phone': phone,
                        ':repair_type': repair_type,
                        ':device': device,
                        ':updated_at': now_ts,
                    },
                )
                return True
            except ClientError as error:
                if error.response.get('Error', {}).get('Code') == 'ConditionalCheckFailedException':
                    return False
                raise


        def release_slot(date: str, time: str, lead_id: str) -> None:
            """Release a booked slot if a booking transaction fails after reservation."""
            schedule_table = dynamodb.Table(SCHEDULE_TABLE)
            now_ts = int(datetime.utcnow().timestamp())

            try:
                schedule_table.update_item(
                    Key={
                        'schedule_date': date,
                        'slot_time': time,
                    },
                    UpdateExpression='SET #status = :available, updated_at = :updated_at REMOVE lead_id, phone, repair_type, device',
                    ConditionExpression='lead_id = :lead_id',
                    ExpressionAttributeNames={
                        '#status': 'status',
                    },
                    ExpressionAttributeValues={
                        ':available': 'available',
                        ':lead_id': lead_id,
                        ':updated_at': now_ts,
                    },
                )
            except ClientError as error:
                if error.response.get('Error', {}).get('Code') != 'ConditionalCheckFailedException':
                    raise


        def create_booking(phone: str, repair_type: str, device: str, date: str, time: str) -> str:
            """Create booking with slot reservation + lead persistence as a single flow."""
            lead_id = _generate_lead_id()

            reserved = reserve_slot(
                date=date,
                time=time,
                lead_id=lead_id,
                phone=phone,
                repair_type=repair_type,
                device=device,
            )

            if not reserved:
                raise ValueError(f"Time slot {time} is not available on {date}")

            try:
                create_lead(
                    phone=phone,
                    repair_type=repair_type,
                    device=device,
                    date=date,
                    time=time,
                    lead_id=lead_id,
                )
                return lead_id
            except Exception:
                release_slot(date=date, time=time, lead_id=lead_id)
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
    Uses persistent schedule table and returns available slot times.
    """
    try:
        schedule_rows = get_schedule_for_date(date)
        available = [row['slot_time'] for row in schedule_rows if row.get('status') == 'available']
        logger.info(f"Available slots for {date}: {available}")
        return available
    except Exception as e:
        logger.error(f"Error getting available slots: {e}", exc_info=True)
        return DEFAULT_DAILY_SLOTS
