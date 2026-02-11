"""
Flask server to test Twilio inbound SMS webhooks
Usage: python backend/test_twilio_webhook_server.py
"""

from flask import Flask, request
from datetime import datetime

app = Flask(__name__)

@app.route('/webhook/sms', methods=['POST'])
def sms_webhook():
    """Handle incoming SMS from Twilio"""
    
    # Extract Twilio webhook parameters
    from_number = request.form.get('From', 'Unknown')
    to_number = request.form.get('To', 'Unknown')
    body = request.form.get('Body', '')
    message_sid = request.form.get('MessageSid', 'Unknown')
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    print("\n" + "="*60)
    print(f"📥 INCOMING SMS - {timestamp}")
    print("="*60)
    print(f"From: {from_number}")
    print(f"To: {to_number}")
    print(f"Message SID: {message_sid}")
    print(f"Body: {body}")
    print("="*60 + "\n")
    
    # Return empty 200 OK (Twilio requires 2xx response)
    return '', 200

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return {'status': 'healthy', 'service': 'LINDA Webhook Test Server'}, 200

if __name__ == '__main__':
    print("="*60)
    print("🚀 LINDA Webhook Test Server Starting")
    print("="*60)
    print("Webhook endpoint: http://localhost:5000/webhook/sms")
    print("Health check: http://localhost:5000/health")
    print()
    print("⚠️  NEXT STEPS:")
    print("1. Keep this server running")
    print("2. In a NEW terminal, run: ngrok http 5000")
    print("3. Copy the ngrok HTTPS URL (e.g., https://abc123.ngrok-free.app)")
    print("4. Go to Twilio Console > Phone Numbers > your number")
    print("5. Under 'Messaging Configuration' > 'A message comes in':")
    print("   Set webhook URL to: https://YOUR-NGROK-URL.ngrok-free.app/webhook/sms")
    print("6. Save the configuration")
    print("7. Reply to the test SMS you sent earlier")
    print("8. Watch this terminal for the incoming message!")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
