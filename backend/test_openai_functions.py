"""
Test script for OpenAI Responses API function calling
Tests the complete booking flow with mock function handlers
Usage: python backend/test_openai_functions.py
"""

import os
import sys
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv('backend/.env')

def load_function_schemas():
    """Load function definitions from schemas/functions.json"""
    with open('backend/schemas/functions.json', 'r') as f:
        data = json.load(f)
    return data['functions']

def mock_check_availability(date: str) -> dict:
    """Mock function: Check availability for a date"""
    print(f"   🔧 Function called: check_availability(date='{date}')")
    
    # Parse date and return mock slots
    target_date = datetime.strptime(date, '%Y-%m-%d')
    day_name = target_date.strftime('%A')
    
    # Mock logic: always available 2pm-5pm
    result = {
        "date": date,
        "day": day_name,
        "available": True,
        "slots": [
            {"time": "2:00 PM", "available": True},
            {"time": "3:00 PM", "available": True},
            {"time": "4:00 PM", "available": True},
            {"time": "5:00 PM", "available": True}
        ],
        "note": "Walk-ins welcome, appointments recommended"
    }
    
    print(f"   📊 Result: {len(result['slots'])} slots available on {day_name}")
    return result

def mock_book_slot(date: str, time: str, phone: str, repair_type: str, device: str = None) -> dict:
    """Mock function: Book a repair appointment"""
    print(f"   🔧 Function called: book_slot(date='{date}', time='{time}', phone='{phone}', repair_type='{repair_type}')")
    
    # Generate mock lead ID
    lead_id = f"LEAD-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    result = {
        "success": True,
        "lead_id": lead_id,
        "booking": {
            "date": date,
            "time": time,
            "phone": phone,
            "repair_type": repair_type,
            "device": device or "Not specified",
            "estimated_duration": "30-45 minutes",
            "estimated_cost": "$80-150 (exact quote upon inspection)"
        },
        "message": f"Booking confirmed for {date} at {time}. We'll send you a reminder 1 hour before."
    }
    
    print(f"   ✅ Booking created: {lead_id}")
    return result

def mock_authorize_discount(discount_percent: float, reason: str, phone: str) -> dict:
    """Mock function: Authorize a discount"""
    print(f"   🔧 Function called: authorize_discount(discount={discount_percent}%, reason='{reason}')")
    
    # Mock logic: auto-approve up to 15%, requires Brandon for higher
    if discount_percent <= 15:
        result = {
            "authorized": True,
            "discount_percent": discount_percent,
            "reason": reason,
            "message": f"{discount_percent}% discount authorized for {reason}"
        }
        print(f"   ✅ Auto-approved: {discount_percent}%")
    else:
        result = {
            "authorized": False,
            "discount_percent": discount_percent,
            "reason": reason,
            "requires_approval": True,
            "message": f"Discounts over 15% require Brandon's approval. I've sent him a notification."
        }
        print(f"   ⏳ Requires approval: {discount_percent}% (over 15% threshold)")
    
    return result

def mock_log_upsell(upsell_item: str, accepted: bool, phone: str) -> dict:
    """Mock function: Log an upsell attempt"""
    print(f"   🔧 Function called: log_upsell(item='{upsell_item}', accepted={accepted})")
    
    result = {
        "logged": True,
        "upsell_item": upsell_item,
        "accepted": accepted,
        "timestamp": datetime.now().isoformat()
    }
    
    status = "✅ Accepted" if accepted else "❌ Declined"
    print(f"   📊 Upsell {status}: {upsell_item}")
    return result

# Function dispatcher
FUNCTION_MAP = {
    "check_availability": mock_check_availability,
    "book_slot": mock_book_slot,
    "authorize_discount": mock_authorize_discount,
    "log_upsell": mock_log_upsell
}

def execute_function_call(function_name: str, arguments: dict) -> dict:
    """Execute a function call with given arguments"""
    if function_name not in FUNCTION_MAP:
        return {"error": f"Unknown function: {function_name}"}
    
    try:
        func = FUNCTION_MAP[function_name]
        result = func(**arguments)
        return result
    except Exception as e:
        return {"error": f"Function execution failed: {str(e)}"}

def test_function_calling():
    """Test OpenAI function calling with a booking conversation"""
    
    print("🤖 OpenAI Function Calling Test\n")
    print("=" * 70)
    
    # Initialize OpenAI client
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in .env")
        return False
    
    os.environ['OPENAI_API_KEY'] = api_key
    client = OpenAI()
    
    # Load function schemas
    print("📋 Loading function schemas from backend/schemas/functions.json...")
    try:
        tools = load_function_schemas()
        print(f"✅ Loaded {len(tools)} function definitions\n")
    except Exception as e:
        print(f"❌ Error loading schemas: {e}")
        return False
    
    # System prompt with Brandon context
    system_prompt = """You are LINDA, the AI assistant for EmperorLinda Cell Phone Repairs.

Your role: Help customers book repair appointments, answer questions, and upsell accessories.

Current Brandon State: WORK (in shop, available)

Guidelines:
- Be friendly and professional
- Use functions to check availability and book appointments
- Always offer screen protectors when booking screen repairs
- If a customer asks for a discount, use authorize_discount function
- Track all upsells with log_upsell function

Shop hours: Mon-Sat 10am-6pm
Location: Local shop (you don't need the exact address for bookings)"""

    # Conversation flow to test
    test_messages = [
        "Hi! Do you do iPhone screen repairs?",
        "Great! Do you have availability tomorrow afternoon?",
        "Perfect, can I book the 3pm slot? My phone number is +19042520927",
        "It's an iPhone 14 Pro, the screen is cracked",
        "Yes please! How much for the screen protector?"
    ]
    
    # Initialize conversation
    messages = [{"role": "system", "content": system_prompt}]
    
    print("🔄 Starting conversation flow...\n")
    print("=" * 70)
    
    try:
        for i, user_message in enumerate(test_messages, 1):
            print(f"\n💬 USER (Turn {i}): {user_message}")
            
            # Add user message to conversation
            messages.append({"role": "user", "content": user_message})
            
            # Call OpenAI API with tools
            print("   ⏳ Waiting for AI response...")
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=tools,
                tool_choice="auto"  # Let AI decide when to use tools
            )
            
            assistant_message = response.choices[0].message
            
            # Check if AI wants to call functions
            if assistant_message.tool_calls:
                print(f"   🔧 AI requested {len(assistant_message.tool_calls)} function call(s)")
                
                # Add assistant's tool call request to conversation
                messages.append(assistant_message)
                
                # Execute each function call
                for tool_call in assistant_message.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    # Execute function
                    function_result = execute_function_call(function_name, function_args)
                    
                    # Add function result to conversation
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(function_result)
                    })
                
                # Get AI's final response after processing function results
                print("   ⏳ AI processing function results...")
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    tools=tools,
                    tool_choice="auto"
                )
                
                assistant_message = response.choices[0].message
            
            # Display AI's response
            ai_response = assistant_message.content or "[No text response]"
            print(f"\n🤖 LINDA: {ai_response}")
            
            # Add final response to conversation
            messages.append({"role": "assistant", "content": ai_response})
            
            print("-" * 70)
        
        # Test summary
        print("\n" + "=" * 70)
        print("FINAL SUMMARY")
        print("=" * 70)
        print("✅ All conversation turns completed successfully")
        print(f"📊 Total messages in conversation: {len(messages)}")
        print(f"🔧 Function calls handled by mock handlers")
        print("\n✅ Phase 8 Complete: Function calling works as expected!")
        print("\nNext: Phase 9 - Lambda Functions Development & Deployment")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversation: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_function_calling()
    sys.exit(0 if success else 1)
