"""
Dispatcher Lambda: Twilio webhook handler for customer SMS/voice interactions.
Routes messages to OpenAI with function calling.
"""

import os
import json
import logging
from urllib.parse import parse_qs
from twilio.twiml.messaging_response import MessagingResponse
from openai import OpenAI

from utils import (
    create_lambda_response,
    get_brandon_state,
    create_lead,
    get_available_slots,
    query_leads_for_date,
    DecimalEncoder
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Load function schemas inline
FUNCTION_SCHEMAS = [
    {
        "type": "function",
        "name": "check_availability",
        "description": "Check if a repair slot is available on a given date. Returns available time slots.",
        "parameters": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "Date to check availability for, in YYYY-MM-DD format (e.g., '2026-02-11')"
                }
            },
            "required": ["date"],
            "additionalProperties": False
        }
    },
    {
        "type": "function",
        "name": "book_slot",
        "description": "Book a repair appointment slot for a customer. Records lead in DynamoDB.",
        "parameters": {
            "type": "object",
            "properties": {
                "date": {
                    "type": "string",
                    "description": "Appointment date in YYYY-MM-DD format"
                },
                "time": {
                    "type": "string",
                    "description": "Appointment time (e.g., '2:00 PM', '3:30 PM')"
                },
                "phone": {
                    "type": "string",
                    "description": "Customer phone number in E.164 format (e.g., '+19042520927')"
                },
                "repair_type": {
                    "type": "string",
                    "description": "Type of repair (e.g., 'screen', 'battery', 'charging_port', 'other')"
                },
                "device": {
                    "type": "string",
                    "description": "Device model (e.g., 'iPhone 14 Pro', 'Samsung Galaxy S23')"
                }
            },
            "required": ["date", "time", "phone", "repair_type"],
            "additionalProperties": False
        }
    },
    {
        "type": "function",
        "name": "authorize_discount",
        "description": "Request authorization for a customer discount. Brandon must approve discounts over 15%.",
        "parameters": {
            "type": "object",
            "properties": {
                "discount_percent": {
                    "type": "number",
                    "description": "Discount percentage requested (e.g., 10, 15, 20)"
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for discount (e.g., 'repeat_customer', 'referral', 'bulk_repair', 'service_recovery')"
                },
                "phone": {
                    "type": "string",
                    "description": "Customer phone number"
                }
            },
            "required": ["discount_percent", "reason", "phone"],
            "additionalProperties": False
        }
    },
    {
        "type": "function",
        "name": "log_upsell",
        "description": "Log an upsell attempt (screen protector, phone case, etc.). Tracks conversion metrics.",
        "parameters": {
            "type": "object",
            "properties": {
                "upsell_item": {
                    "type": "string",
                    "description": "Item offered (e.g., 'screen_protector', 'phone_case', 'warranty_extension')"
                },
                "accepted": {
                    "type": "boolean",
                    "description": "Whether customer accepted the upsell"
                },
                "phone": {
                    "type": "string",
                    "description": "Customer phone number"
                }
            },
            "required": ["upsell_item", "accepted", "phone"],
            "additionalProperties": False
        }
    }
]


def execute_function(function_name: str, arguments: dict) -> dict:
    """Execute a function based on name and arguments"""
    logger.info(f"Executing function: {function_name} with args: {arguments}")
    
    try:
        if function_name == "check_availability":
            date = arguments.get("date")
            slots = get_available_slots(date)
            return {
                "success": True,
                "date": date,
                "available_slots": slots,
                "message": f"Available slots on {date}: {', '.join(slots)}"
            }
        
        elif function_name == "book_slot":
            date = arguments.get("date")
            time = arguments.get("time")
            phone = arguments.get("phone")
            repair_type = arguments.get("repair_type")
            device = arguments.get("device", "Unknown Device")
            
            lead_id = create_lead(phone, repair_type, device, date, time)
            return {
                "success": True,
                "lead_id": lead_id,
                "date": date,
                "time": time,
                "phone": phone,
                "message": f"Booking confirmed! Lead ID: {lead_id}. Appointment: {date} at {time}"
            }
        
        elif function_name == "authorize_discount":
            discount_percent = arguments.get("discount_percent")
            reason = arguments.get("reason")
            phone = arguments.get("phone")
            
            # For demo: approve discounts <= 15%, ask Brandon for > 15%
            if discount_percent <= 15:
                return {
                    "success": True,
                    "approved": True,
                    "discount_percent": discount_percent,
                    "message": f"Discount of {discount_percent}% approved ({reason})"
                }
            else:
                return {
                    "success": True,
                    "approved": False,
                    "discount_percent": discount_percent,
                    "message": f"Discount of {discount_percent}% requires Brandon's approval ({reason})"
                }
        
        elif function_name == "log_upsell":
            upsell_item = arguments.get("upsell_item")
            accepted = arguments.get("accepted")
            phone = arguments.get("phone")
            
            return {
                "success": True,
                "upsell_item": upsell_item,
                "accepted": accepted,
                "phone": phone,
                "message": f"Upsell logged: {upsell_item} ({'accepted' if accepted else 'declined'})"
            }
        
        else:
            return {
                "success": False,
                "message": f"Unknown function: {function_name}"
            }
    
    except Exception as e:
        logger.error(f"Error executing function {function_name}: {e}", exc_info=True)
        return {
            "success": False,
            "message": f"Error executing {function_name}: {str(e)}"
        }


def handler(event, context):
    """
    Main Lambda handler for Twilio webhook.
    Processes incoming SMS/voice and routes to OpenAI.
    """
    logger.info(f"Event: {json.dumps(event)}")
    
    try:
        # Parse Twilio webhook data
        if event.get('isBase64Encoded'):
            import base64
            body = base64.b64decode(event['body']).decode('utf-8')
        else:
            body = event.get('body', '')
        
        twilio_params = parse_qs(body)
        from_phone = twilio_params.get('From', [''])[0]
        message_body = twilio_params.get('Body', [''])[0]
        message_sid = twilio_params.get('MessageSid', [''])[0]
        
        logger.info(f"SMS from {from_phone}: {message_body}")
        
        if not from_phone or not message_body:
            logger.error("Missing From or Body in Twilio webhook")
            return create_lambda_response(400, {'error': 'Missing required parameters'})
        
        # Fetch Brandon's current state for context
        brandon_state = get_brandon_state()
        logger.info(f"Brandon state: {brandon_state}")
        
        # Prepare context for OpenAI
        context_prompt = f"""
You are LINDA, an AI assistant for EmperorLinda Cell Phone Repairs.
Brandon's current status: {brandon_state.get('status', 'available')}
Brandon's location: {brandon_state.get('location', 'shop')}
Brandon's notes: {brandon_state.get('notes', 'None')}

Customer message: {message_body}
Customer phone: {from_phone}

Use available functions to:
1. Check booking availability
2. Book appointments
3. Offer upsells (screen protectors, cases)
4. Log upsells and requests

Respond naturally and helpfully. If booking, always confirm the details.
"""
        
        # Call OpenAI with function calling
        response = openai_client.beta.assistants.messages.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": context_prompt}
            ],
            tools=[
                {"type": "function", "function": schema}
                for schema in FUNCTION_SCHEMAS
            ]
        )
        
        # Extract response text (may have multiple content blocks)
        response_text = ""
        for block in response.content:
            if hasattr(block, 'text'):
                response_text = block.text
                break
        
        # Handle tool use if present
        for block in response.content:
            if block.type == "tool_use":
                func_name = block.name
                args = json.loads(block.input) if isinstance(block.input, str) else block.input
                
                func_result = execute_function(func_name, args)
                logger.info(f"Function result: {func_result}")
                
                # Update response with function result
                if 'message' in func_result:
                    response_text += f"\n{func_result['message']}"
        
        # Prepare TwiML response
        twiml_response = MessagingResponse()
        twiml_response.message(response_text)
        
        logger.info(f"Response: {response_text}")
        
        return {
            'statusCode': 200,
            'body': str(twiml_response),
            'headers': {
                'Content-Type': 'text/xml'
            }
        }
    
    except Exception as e:
        logger.error(f"Error in dispatcher: {e}", exc_info=True)
        
        # Return TwiML error response
        twiml_error = MessagingResponse()
        twiml_error.message("Sorry, I encountered an error. Please try again later.")
        
        return {
            'statusCode': 500,
            'body': str(twiml_error),
            'headers': {
                'Content-Type': 'text/xml'
            }
        }
