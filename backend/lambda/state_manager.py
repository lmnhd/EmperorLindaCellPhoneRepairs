"""
State Manager Lambda: Admin API for managing Brandon's status.
Handles GET, POST/PUT, DELETE operations on Brandon_State_Log.
"""

import os
import json
import logging
from datetime import datetime
from urllib.parse import parse_qs

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# DynamoDB resource
dynamodb = boto3.resource('dynamodb', region_name=os.environ.get('DYNAMODB_REGION', 'us-east-1'))
BRANDON_STATE_LOG_TABLE = os.environ.get('BRANDON_STATE_LOG_TABLE', 'Brandon_State_Log')


def create_response(status_code: int, body: dict) -> dict:
    """Create standard Lambda HTTP response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps(body)
    }


def get_state() -> dict:
    """GET: Retrieve Brandon's current state"""
    try:
        table = dynamodb.Table(BRANDON_STATE_LOG_TABLE)
        response = table.get_item(Key={'state_id': 'CURRENT'})
        
        if 'Item' in response:
            logger.info(f"Retrieved state: {response['Item']}")
            return create_response(200, {
                'status': 'success',
                'state': response['Item']
            })
        else:
            logger.warning("No state found, returning default")
            default_state = {
                'state_id': 'CURRENT',
                'status': 'available',
                'location': 'shop',
                'notes': 'Default state',
                'updated_at': int(datetime.utcnow().timestamp())
            }
            return create_response(200, {
                'status': 'success',
                'state': default_state
            })
    
    except Exception as e:
        logger.error(f"Error retrieving state: {e}", exc_info=True)
        return create_response(500, {
            'status': 'error',
            'message': f"Error retrieving state: {str(e)}"
        })


def update_state(state_data: dict) -> dict:
    """POST/PUT: Update Brandon's state"""
    try:
        table = dynamodb.Table(BRANDON_STATE_LOG_TABLE)
        
        # Ensure required fields
        if not state_data.get('status') and not state_data.get('location') and not state_data.get('notes'):
            return create_response(400, {
                'status': 'error',
                'message': 'At least one of status, location, or notes must be provided'
            })
        
        # Fetch current state
        response = table.get_item(Key={'state_id': 'CURRENT'})
        current_state = response.get('Item', {})
        
        # Update with new values
        current_state['state_id'] = 'CURRENT'
        if 'status' in state_data:
            current_state['status'] = state_data['status']
        if 'location' in state_data:
            current_state['location'] = state_data['location']
        if 'notes' in state_data:
            current_state['notes'] = state_data['notes']
        
        current_state['updated_at'] = int(datetime.utcnow().timestamp())
        
        # Write updated state
        table.put_item(Item=current_state)
        logger.info(f"Updated state: {current_state}")
        
        return create_response(200, {
            'status': 'success',
            'message': 'State updated',
            'state': current_state
        })
    
    except Exception as e:
        logger.error(f"Error updating state: {e}", exc_info=True)
        return create_response(500, {
            'status': 'error',
            'message': f"Error updating state: {str(e)}"
        })


def delete_state() -> dict:
    """DELETE: Reset state to default"""
    try:
        table = dynamodb.Table(BRANDON_STATE_LOG_TABLE)
        
        # Reset to default state
        default_state = {
            'state_id': 'CURRENT',
            'status': 'available',
            'location': 'shop',
            'notes': 'Reset to default',
            'updated_at': int(datetime.utcnow().timestamp())
        }
        
        table.put_item(Item=default_state)
        logger.info(f"Reset state to default: {default_state}")
        
        return create_response(200, {
            'status': 'success',
            'message': 'State reset to default',
            'state': default_state
        })
    
    except Exception as e:
        logger.error(f"Error resetting state: {e}", exc_info=True)
        return create_response(500, {
            'status': 'error',
            'message': f"Error resetting state: {str(e)}"
        })


def handler(event, context):
    """
    Main Lambda handler for admin state management.
    Supports GET, POST/PUT, DELETE, OPTIONS methods.
    """
    logger.info(f"Event: {json.dumps(event)}")
    
    try:
        method = event.get('httpMethod', 'GET').upper()
        
        # Handle CORS preflight
        if method == 'OPTIONS':
            return create_response(200, {'status': 'ok'})
        
        # Parse request body for POST/PUT/DELETE
        body = event.get('body', '')
        state_data = {}
        
        if body and method in ['POST', 'PUT']:
            if event.get('isBase64Encoded'):
                import base64
                body = base64.b64decode(body).decode('utf-8')
            
            # Try JSON first
            try:
                state_data = json.loads(body)
            except json.JSONDecodeError:
                # Try form-encoded
                params = parse_qs(body)
                state_data = {key: params[key][0] for key in params}
        
        # Route by method
        if method == 'GET':
            return get_state()
        elif method in ['POST', 'PUT']:
            return update_state(state_data)
        elif method == 'DELETE':
            return delete_state()
        else:
            return create_response(405, {
                'status': 'error',
                'message': f"Method {method} not allowed"
            })
    
    except Exception as e:
        logger.error(f"Error in state_manager: {e}", exc_info=True)
        return create_response(500, {
            'status': 'error',
            'message': f"Internal server error: {str(e)}"
        })
