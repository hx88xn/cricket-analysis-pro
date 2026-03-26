import requests
import os
from dotenv import load_dotenv

load_dotenv()

project_key = os.getenv('PROJECT_KEY')
api_key = os.getenv('API_KEY')
url = "https://api.sports.roanuz.com/v5/core/{}/auth/".format(project_key)
payload = {
    'api_key': api_key
}
response = requests.post(url, json=payload)

print(response.json())