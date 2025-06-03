from flask import Flask, request
from dotenv import load_dotenv
import os
import requests

load_dotenv()
app = Flask(__name__)


VIRUSTOTAL_API_KEY = os.getenv('VIRUSTOTAL_API_KEY')

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']

    file_content = file.read()
    if len(file_content) > 32 * 1024 * 1024:
        return 'File size exceeds 32 MB', 413

    file.seek(0)

    url = "https://www.virustotal.com/api/v3/files"
    headers = {
        "x-apikey": VIRUSTOTAL_API_KEY
    }
    files = {
        "file": file
    }

    response = requests.post(url, headers=headers, files=files)

    return {"analysis_id": response.json().get('data', {}).get('id', '')}, response.status_code


@app.route('/report/<analysis_id>', methods=['GET'])
def get_report(analysis_id):
    url = f"https://www.virustotal.com/api/v3/analyses/{analysis_id}"
    headers = {"x-apikey": VIRUSTOTAL_API_KEY}

    response = requests.get(url, headers=headers)

    if response.status_code == 404:
        return {"error": "Analysis not found"}, 404

    data = response.json()

    attributes = data.get('data', {}).get('attributes', {})
    stats = attributes.get('stats', {})
    status = attributes.get('status', 'unknown')

    return {
        "status": status,
        "stats": stats,
        "is_safe": stats.get('malicious', 0) == 0 and stats.get('suspicious', 0) == 0,
        "scan_date": attributes.get('date'),
        "engines_count": sum(stats.values())
    }

if __name__ == '__main__':
    app.run(debug=True)