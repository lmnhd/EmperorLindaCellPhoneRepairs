"""
Test script for sending outbound SMS via Twilio
Usage: python backend/test_twilio_sms.py
"""

import os
import sys
from dotenv import load_dotenv
from twilio.rest import Client

def send_test_sms():
    """Send a test SMS to verify outbound messaging works"""
    
    print("📤 Twilio Outbound SMS Test\n")
    
    # Load environment variables
    load_dotenv('backend/.env')
    
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_number = os.getenv('TWILIO_PHONE_NUMBER')
    
    if not all([account_sid, auth_token, from_number]):
        print("❌ Error: Missing Twilio credentials in .env")
        return False
    
    # For trial accounts, use the Twilio Virtual Phone Number
    print("⚠️  TRIAL ACCOUNT DETECTED")
    print("   Using Twilio Virtual Phone Number for testing (SMS visible in Console)")
    print()
    to_number = "+18777804236"  # Twilio Virtual Phone Number for testing
    print(f"📞 Sending SMS to Twilio Virtual Phone: {to_number}")
    print("   (You'll see it in your Twilio Console > Phone Numbers > Messaging tab)")
    
    # Create Twilio client
    print("\nStep 1: Creating Twilio client...")
    try:
        client = Client(account_sid, auth_token)
        print("✅ Client created\n")
    except Exception as e:
        print(f"❌ Error creating client: {e}")
        return False
    
    # Send test message
    print("Step 2: Sending test SMS...")
    test_message = "🤖 LINDA System Test: This is a test message from your EmperorLinda Chief of Staff system. Reply to this message to test inbound SMS."
    
    try:
        message = client.messages.create(
            body=test_message,
            from_=from_number,
            to=to_number
        )
        print("✅ SMS sent successfully!\n")
        print("="*60)
        print("MESSAGE DETAILS")
        print("="*60)
        print(f"SID: {message.sid}")
        print(f"From: {message.from_}")
        print(f"To: {message.to}")
        print(f"Status: {message.status}")
        print(f"Body: {message.body[:50]}...")
        print("="*60)
        print("\n📱 CHECK YOUR PHONE NOW - you should receive the SMS within seconds")
        print("\n✅ Phase 6 Part 1 (Outbound SMS) COMPLETE")
        return True
        
    except Exception as e:
        print(f"❌ Error sending SMS: {e}")
        if "trial" in str(e).lower():
            print("\n⚠️  TRIAL ACCOUNT ISSUE:")
            print("   1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified")
            print("   2. Click 'Add a new Caller ID'")
            print("   3. Enter your phone number and verify with the code they text you")
            print("   4. Try this script again")
        return False

if __name__ == "__main__":
    success = send_test_sms()
    sys.exit(0 if success else 1)
