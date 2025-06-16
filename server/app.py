from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import requests
from flask_cors import CORS
import time
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

VIRUSTOTAL_API_KEY = os.getenv('VIRUSTOTAL_API_KEY')

# Rate limiting tracking
last_request_time = 0
MIN_REQUEST_INTERVAL = 15  # 15 seconds between requests for free accounts

# Health check endpoint
@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint to verify server is running"""
    return jsonify({
        "status": "running",
        "message": "Virus Scanner Backend is running",
        "api_key_configured": bool(VIRUSTOTAL_API_KEY),
        "timestamp": time.time()
    }), 200

@app.route('/upload', methods=['POST'])
def upload_file():
    """Upload file to VirusTotal for scanning with rate limiting"""
    global last_request_time
    
    try:
        # Check if API key is configured
        if not VIRUSTOTAL_API_KEY:
            return jsonify({
                "error": "VirusTotal API key not configured. Please set VIRUSTOTAL_API_KEY in .env file"
            }), 500

        # Rate limiting check
        current_time = time.time()
        time_since_last_request = current_time - last_request_time
        
        if time_since_last_request < MIN_REQUEST_INTERVAL:
            wait_time = MIN_REQUEST_INTERVAL - time_since_last_request
            return jsonify({
                "error": f"Rate limit: Please wait {int(wait_time)} seconds before uploading another file. Free VirusTotal accounts have strict rate limits."
            }), 429

        # Check if file is present
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Check file size
        file_content = file.read()
        if len(file_content) > 32 * 1024 * 1024:  # 32MB limit
            return jsonify({"error": "File size exceeds 32 MB"}), 413

        # Reset file pointer
        file.seek(0)

        print(f"Uploading file: {file.filename}, Size: {len(file_content)} bytes")
        print(f"Time since last request: {time_since_last_request:.1f} seconds")

        # Update last request time
        last_request_time = current_time

        # Upload to VirusTotal
        url = "https://www.virustotal.com/api/v3/files"
        headers = {"x-apikey": VIRUSTOTAL_API_KEY}
        files = {"file": file}

        print(f"Sending request to VirusTotal...")
        response = requests.post(url, headers=headers, files=files, timeout=60)
        
        print(f"VirusTotal response status: {response.status_code}")
        
        # Handle specific error codes
        if response.status_code == 401:
            return jsonify({
                "error": "Invalid VirusTotal API key. Please check your API key in .env file"
            }), 401
        elif response.status_code == 409:
            return jsonify({
                "error": "VirusTotal is busy processing other files. Free accounts can only scan one file at a time. Please wait 2-3 minutes and try again."
            }), 409
        elif response.status_code == 429:
            return jsonify({
                "error": "VirusTotal API rate limit exceeded. Free accounts are limited to 4 requests per minute. Please wait and try again."
            }), 429
        elif response.status_code == 413:
            return jsonify({
                "error": "File too large for VirusTotal. Maximum size is 32MB for free accounts."
            }), 413
        elif response.status_code != 200:
            error_detail = ""
            try:
                error_data = response.json()
                error_detail = error_data.get('error', {}).get('message', response.text)
            except:
                error_detail = response.text
            
            return jsonify({
                "error": f"VirusTotal API error ({response.status_code}): {error_detail}"
            }), response.status_code

        try:
            response_data = response.json()
        except json.JSONDecodeError:
            return jsonify({
                "error": "Invalid response from VirusTotal"
            }), 500
        
        analysis_id = response_data.get('data', {}).get('id', '')
        
        if not analysis_id:
            return jsonify({
                "error": "No analysis ID received from VirusTotal"
            }), 500

        print(f"Analysis ID received: {analysis_id}")

        return jsonify({
            "analysis_id": analysis_id,
            "message": "File uploaded successfully"
        }), 200

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "Timeout uploading to VirusTotal. The service might be busy. Please try again in a few minutes."
        }), 408
    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "Cannot connect to VirusTotal. Please check your internet connection."
        }), 503
    except Exception as e:
        print(f"Upload error: {str(e)}")
        return jsonify({
            "error": f"Upload failed: {str(e)}"
        }), 500


@app.route('/report/<analysis_id>', methods=['GET'])
def get_report(analysis_id):
    """Get scan report from VirusTotal"""
    try:
        if not VIRUSTOTAL_API_KEY:
            return jsonify({
                "error": "VirusTotal API key not configured"
            }), 500

        print(f"Checking report for analysis ID: {analysis_id}")

        url = f"https://www.virustotal.com/api/v3/analyses/{analysis_id}"
        headers = {"x-apikey": VIRUSTOTAL_API_KEY}

        response = requests.get(url, headers=headers, timeout=30)
        
        print(f"Report response status: {response.status_code}")

        if response.status_code == 401:
            return jsonify({
                "error": "Invalid VirusTotal API key"
            }), 401
        elif response.status_code == 404:
            return jsonify({
                "error": "Analysis not found. The scan might have failed or expired."
            }), 404
        elif response.status_code == 429:
            return jsonify({
                "error": "VirusTotal API rate limit exceeded. Please wait a moment."
            }), 429
        elif response.status_code != 200:
            return jsonify({
                "error": f"VirusTotal API error: {response.status_code}"
            }), response.status_code

        try:
            data = response.json()
        except json.JSONDecodeError:
            return jsonify({
                "error": "Invalid response from VirusTotal"
            }), 500

        attributes = data.get('data', {}).get('attributes', {})
        stats = attributes.get('stats', {})
        status = attributes.get('status', 'unknown')

        print(f"Scan status: {status}, Stats: {stats}")

        # Handle different statuses
        if status == 'queued':
            return jsonify({
                "status": "queued",
                "message": "File is queued for scanning"
            }), 200
        elif status == 'running':
            return jsonify({
                "status": "running", 
                "message": "File is being scanned"
            }), 200

        # Extract statistics for completed scans
        malicious = stats.get('malicious', 0)
        suspicious = stats.get('suspicious', 0)
        undetected = stats.get('undetected', 0)
        harmless = stats.get('harmless', 0)
        
        # Calculate totals
        engines_count = malicious + suspicious + undetected + harmless
        threats_found = malicious + suspicious
        clean = undetected + harmless

        result = {
            "status": "completed",
            "is_safe": threats_found == 0,
            "engines_count": engines_count,
            "threats_found": threats_found,
            "malicious": malicious,
            "suspicious": suspicious,
            "clean": clean
        }

        print(f"Returning result: {result}")
        return jsonify(result), 200

    except requests.exceptions.Timeout:
        return jsonify({
            "error": "Timeout getting report from VirusTotal"
        }), 408
    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "Cannot connect to VirusTotal"
        }), 503
    except Exception as e:
        print(f"Report error: {str(e)}")
        return jsonify({
            "error": f"Failed to get report: {str(e)}"
        }), 500

# Add endpoint to check rate limit status
@app.route('/status', methods=['GET'])
def get_status():
    """Get current rate limiting status"""
    global last_request_time
    current_time = time.time()
    time_since_last = current_time - last_request_time
    can_upload = time_since_last >= MIN_REQUEST_INTERVAL
    wait_time = max(0, MIN_REQUEST_INTERVAL - time_since_last)
    
    return jsonify({
        "can_upload": can_upload,
        "wait_time_seconds": int(wait_time),
        "last_request_ago": int(time_since_last),
        "min_interval": MIN_REQUEST_INTERVAL
    }), 200

if __name__ == '__main__':
    print("Starting Virus Scanner Backend...")
    print(f"API Key configured: {bool(VIRUSTOTAL_API_KEY)}")
    print(f"Rate limiting: {MIN_REQUEST_INTERVAL} seconds between requests")
    if VIRUSTOTAL_API_KEY:
        print(f"API Key preview: {VIRUSTOTAL_API_KEY[:8]}...")
    else:
        print("WARNING: No VirusTotal API key found in .env file!")
    
    app.run(debug=True, host='0.0.0.0', port=5000)