#!/usr/bin/env python3
"""
Test Twilio account connectivity and configuration.
Phase 5: Twilio Account Setup & Configuration

Note: Supports API Key authentication (recommended) or Auth Token (legacy)
"""

import os
import sys
from dotenv import load_dotenv
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# Load environment variables
load_dotenv()

def test_twilio_connection():
    """Test connection to Twilio and verify account details using API Key or Auth Token."""
    
    print("🔌 Testing Twilio Connection...\n")
    
    # Get credentials from environment
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    api_key_sid = os.getenv('TWILIO_API_KEY_SID')
    api_key_secret = os.getenv('TWILIO_API_KEY_SECRET')
    client_id = os.getenv('TWILIO_CLIENT_ID')
    client_secret = os.getenv('TWILIO_CLIENT_SECRET')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    phone_number = os.getenv('TWILIO_PHONE_NUMBER')
    
    # Validate credentials exist
    if not account_sid:
        print("❌ Error: TWILIO_ACCOUNT_SID not found in .env")
        return False
    
    # Try to find valid credentials in priority order
    auth_username = None
    auth_password = None
    auth_method = None
    
    # Priority 1: Auth Token (most common for REST API)
    if auth_token and not auth_token.startswith('your-'):
        print("✅ Found Auth Token")
        auth_username = account_sid
        auth_password = auth_token
        auth_method = "Auth Token"
    # Priority 2: API Key
    elif api_key_sid and api_key_secret and not api_key_secret.startswith('<'):
        print("✅ Found API Key credentials")
        auth_username = api_key_sid
        auth_password = api_key_secret
        auth_method = "API Key"
    # Priority 3: OAuth CLIENT credentials (less common for REST API)
    elif client_id and client_secret:
        print("✅ Found OAuth CLIENT_ID and CLIENT_SECRET")
        print("   Attempting to use with Account SID...")
        # Try Account SID + Client Secret
        auth_username = account_sid
        auth_password = client_secret
        auth_method = "Account SID + Client Secret"
    else:
        print("❌ Error: No valid authentication credentials found")
        print("   Available but unusable:")
        if api_key_secret and api_key_secret.startswith('<'):
            print("   - API Key Secret is placeholder")
        if auth_token and auth_token.startswith('your-'):
            print("   - Auth Token is placeholder")
        return False
    
    if not phone_number:
        print("❌ Error: TWILIO_PHONE_NUMBER not found in .env")
        return False
    
    print(f"✅ Credentials loaded:")
    print(f"   Account SID: {account_sid[:10]}... (truncated)")
    print(f"   Auth Method: {auth_method}")
    print(f"   Phone Number: {phone_number}\n")
    
    # Step 1: Create Twilio client
    print("Step 1: Creating Twilio client...")
    try:
        client = Client(auth_username, auth_password)
        print(f"✅ Twilio client created\n")
    except Exception as e:
        print(f"❌ Error creating client: {e}")
        return False
    
    # Test 1: Verify credentials by listing phone numbers (simpler than account fetch)
    print("=" * 60)
    print("TEST 1: Verify Phone Number Ownership")
    print("=" * 60)
    
    try:
        numbers = client.incoming_phone_numbers.list()
        
        if len(numbers) == 0:
            print("❌ No phone numbers found in account")
            return False
        
        print(f"✅ Credentials verified!")
        print(f"✅ Found {len(numbers)} phone number(s):")
        
        number_found = False
        for num in numbers:
            print(f"   - {num.phone_number}")
            if num.phone_number == phone_number:
                number_found = True
                print(f"   ✅ MATCH: {num.phone_number} is in your account")
        
        if not number_found:
            print(f"\n⚠️  WARNING: {phone_number} from .env not found in account")
            print(f"   Please update TWILIO_PHONE_NUMBER in .env to match one of the numbers above")
            return False
            
    except TwilioRestException as e:
        print(f"❌ Twilio API Error:")
        print(f"   Code: {e.code}")
        print(f"   Message: {e.msg}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    # Test 2: Check SMS capability
    print("\n" + "=" * 60)
    print("TEST 2: Check SMS Capability")
    print("=" * 60)
    
    try:
        number_details = client.incoming_phone_numbers.list(phone_number=phone_number)
        
        if len(number_details) == 0:
            print(f"❌ Could not fetch details for {phone_number}")
            return False
        
        number = number_details[0]
        
        print(f"✅ Capabilities for {phone_number}:")
        print(f"   SMS: {'✅ Enabled' if number.capabilities['sms'] else '❌ Disabled'}")
        print(f"   Voice: {'✅ Enabled' if number.capabilities['voice'] else '❌ Disabled'}")
        
        if not number.capabilities['sms']:
            print("\n⚠️  WARNING: SMS not enabled")
            return False
            
    except TwilioRestException as e:
        print(f"❌ Error: {e.msg}")
        return False
    
    # Final summary
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print("✅ All tests passed!")
    print(f"\n✅ Twilio account verified: {account_sid}")
    print(f"✅ Phone number configured: {phone_number}")
    print(f"✅ SMS capability: Enabled")
    print("\n🎉 Twilio setup complete! Ready for Phase 6 (SMS testing)")
    
    return True

if __name__ == "__main__":
    success = test_twilio_connection()
    sys.exit(0 if success else 1)
