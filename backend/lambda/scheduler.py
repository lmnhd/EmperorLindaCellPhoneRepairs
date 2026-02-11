"""
Scheduler Lambda: Booking API for customer appointments.
Handles GET (availability check) and POST (create booking).
"""

import os
import json
import logging
from datetime import datetime
from urllib.parse import parse_qs

from utils import (
    create_lambda_response,
    get_available_slots,
    query_leads_for_date,
    create_lead,
    DecimalEncoder
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def check_availability(date: str) -> dict:
    """GET: Check availability for a given date"""
    try:
        if not date:
            return create_lambda_response(400, {
                'status': 'error',
                'message': 'Date parameter required in YYYY-MM-DD format'
            })
        
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return create_lambda_response(400, {
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            })
        
        slots = get_available_slots(date)
        
        logger.info(f"Availability for {date}: {len(slots)} slots available")
        
        return create_lambda_response(200, {
            'status': 'success',
            'date': date,
            'available_slots': slots,
            'available_count': len(slots)
        })
    
    except Exception as e:
        logger.error(f"Error checking availability: {e}", exc_info=True)
        return create_lambda_response(500, {
            'status': 'error',
            'message': f"Error checking availability: {str(e)}"
        })


def book_appointment(booking_data: dict) -> dict:
    """POST: Create a new booking"""
    try:
        # Validate required fields
        required_fields = ['phone', 'date', 'time', 'repair_type']
        for field in required_fields:
            if not booking_data.get(field):
                return create_lambda_response(400, {
                    'status': 'error',
                    'message': f"Missing required field: {field}"
                })
        
        phone = booking_data.get('phone')
        date = booking_data.get('date')
        time = booking_data.get('time')
        repair_type = booking_data.get('repair_type')
        device = booking_data.get('device', 'Unknown Device')
        customer_name = booking_data.get('customer_name', 'Unknown')
        
        # Validate date format
        try:
            datetime.strptime(date, '%Y-%m-%d')
        except ValueError:
            return create_lambda_response(400, {
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            })
        
        # Check if slot is available
        available_slots = get_available_slots(date)
        if time not in available_slots:
            return create_lambda_response(409, {
                'status': 'error',
                'message': f"Time slot {time} is not available on {date}. Available slots: {available_slots}"
            })
        
        # Create booking
        lead_id = create_lead(phone, repair_type, device, date, time)
        
        logger.info(f"Booking created: {lead_id} for {phone} on {date} at {time}")
        
        return create_lambda_response(201, {
            'status': 'success',
            'message': 'Booking confirmed',
            'lead_id': lead_id,
            'date': date,
            'time': time,
            'repair_type': repair_type,
            'device': device,
            'phone': phone,
            'customer_name': customer_name
        })
    
    except Exception as e:
        logger.error(f"Error creating booking: {e}", exc_info=True)
        return create_lambda_response(500, {
            'status': 'error',
            'message': f"Error creating booking: {str(e)}"
        })


def handler(event, context):
    """
    Main Lambda handler for scheduler API.
    Supports GET (check availability) and POST (create booking).
    """
    logger.info(f"Event: {json.dumps(event)}")
    
    try:
        method = event.get('httpMethod', 'GET').upper()
        path = event.get('path', '/')
        
        # Handle CORS preflight
        if method == 'OPTIONS':
            return create_lambda_response(200, {'status': 'ok'})
        
        # Parse query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        
        # Parse request body
        body = event.get('body', '')
        body_data = {}
        
        if body and method in ['POST', 'PUT']:
            if event.get('isBase64Encoded'):
                import base64
                body = base64.b64decode(body).decode('utf-8')
            
            # Try JSON first
            try:
                body_data = json.loads(body)
            except json.JSONDecodeError:
                # Try form-encoded
                params = parse_qs(body)
                body_data = {key: params[key][0] for key in params}
        
        # Route by method
        if method == 'GET':
            date = query_params.get('date') or body_data.get('date')
            return check_availability(date)
        
        elif method == 'POST':
            return book_appointment(body_data)
        
        else:
            return create_lambda_response(405, {
                'status': 'error',
                'message': f"Method {method} not allowed"
            })
    
    except Exception as e:
        logger.error(f"Error in scheduler: {e}", exc_info=True)
        return create_lambda_response(500, {
            'status': 'error',
            'message': f"Internal server error: {str(e)}"
        })
