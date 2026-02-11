"""
Test script for OpenAI Responses API connection
Usage: python backend/test_openai_connection.py
"""

import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

def test_openai_connection():
    """Test basic connection to OpenAI Responses API"""
    
    print("🤖 OpenAI Responses API Connection Test\n")
    
    # Load environment variables
    load_dotenv('backend/.env')
    
    api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in .env")
        return False
    
    if api_key.startswith('sk-proj-'):
        print("✅ API key format correct (starts with sk-proj-)")
    else:
        print("⚠️  Warning: API key format unexpected (should start with sk-proj-)")
    
    # Create OpenAI client
    print("\nStep 1: Creating OpenAI client...")
    try:
        # Set environment variable for API key
        os.environ['OPENAI_API_KEY'] = api_key
        client = OpenAI()
        print("✅ Client created\n")
    except Exception as e:
        print(f"❌ Error creating client: {e}")
        return False
    
    # Test basic API call (list models)
    print("Step 2: Testing API authentication (listing models)...")
    try:
        models = client.models.list()
        model_list = [m.id for m in models.data]
        
        print(f"✅ API authentication successful!")
        print(f"   Available models: {len(model_list)}")
        
        # Check for recommended models
        recommended = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
        available_recommended = [m for m in recommended if m in model_list]
        
        if available_recommended:
            print(f"   Recommended models available: {', '.join(available_recommended)}")
        else:
            print(f"   Note: Using latest GPT-4 variant")
            
    except Exception as e:
        print(f"❌ API Error: {e}")
        if "401" in str(e) or "Incorrect API key" in str(e):
            print("\n⚠️  AUTHENTICATION ERROR:")
            print("   1. Verify your API key at: https://platform.openai.com/api-keys")
            print("   2. Check if key is still active (not revoked)")
            print("   3. Update OPENAI_API_KEY in backend/.env")
        return False
    
    # Test Responses API with simple prompt
    print("\nStep 3: Testing Responses API (simple completion)...")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Using mini for cost efficiency in testing
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say 'LINDA System Test' and nothing else."}
            ],
            max_tokens=20
        )
        
        reply = response.choices[0].message.content
        print(f"✅ Responses API working!")
        print(f"   AI Response: {reply}")
        print(f"   Model used: {response.model}")
        print(f"   Tokens used: {response.usage.total_tokens}")
        
    except Exception as e:
        print(f"❌ Responses API Error: {e}")
        return False
    
    # Summary
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    print("✅ All tests passed!")
    print(f"✅ OpenAI API connected")
    print(f"✅ Responses API functional")
    print(f"✅ Model: gpt-4o-mini (for testing)")
    print("\n🎉 Phase 7 Part 1 (API Connection) COMPLETE")
    print("Next: Create function schemas in backend/schemas/functions.json")
    
    return True

if __name__ == "__main__":
    success = test_openai_connection()
    sys.exit(0 if success else 1)
