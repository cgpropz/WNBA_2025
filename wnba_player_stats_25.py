import pandas as pd
import requests
import time
import os
from pathlib import Path
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Fetch WNBA stats
url = "https://stats.wnba.com/stats/leagueLeaders?LeagueID=10&PerMode=PerGame&Scope=S&Season=2025&SeasonType=Regular+Season&StatCategory=PTS"
headers = {
    'User-Agent': 'Mozilla/5.0',
    'Referer': 'https://stats.wnba.com/',
    'Origin': 'https://stats.wnba.com',
    'Accept': 'application/json, text/plain, */*',
}

response = None
csv_path = Path('wnba_player_stats_25.csv')

for attempt in range(1, 4):
    try:
        response = requests.get(url, headers=headers, timeout=45)
        print(f"Attempt {attempt}: {response.status_code}")
        response.raise_for_status()
        break
    except requests.RequestException as exc:
        if attempt == 3:
            print(f"Request failed after 3 attempts: {exc}")
            response = None
            break
        print(f"Attempt {attempt} failed: {exc}. Retrying...")
        time.sleep(2)

if response is None or response.status_code != 200:
    if not csv_path.exists():
        raise SystemExit('Stats endpoint unavailable and no local CSV fallback found.')
    print('Stats endpoint unavailable. Using local fallback CSV: wnba_player_stats_25.csv')
    df = pd.read_csv(csv_path)
else:
    data = response.json()

    # Access the correct key: 'resultSet' (singular)
    player_data = data['resultSet']['rowSet']
    columns = data['resultSet']['headers']
    print("Columns:", columns)

    # Create DataFrame
    df = pd.DataFrame(player_data, columns=columns)

    # Save to CSV
    df.to_csv(csv_path, index=False)

# Read and analyze
print(df.head())
print(df.columns)
print(df.info())
print(df.describe())
print("Mean PTS:", df['PTS'].mean())
print("Max PTS:", df['PTS'].max())
print("Min PTS:", df['PTS'].min())
print("STD PTS:", df['PTS'].std())
print("Median PTS:", df['PTS'].median())

if os.environ.get('SKIP_SHEETS', '').strip():
    print('SKIP_SHEETS is set; skipping Google Sheets upload.')
    raise SystemExit(0)

# Google Sheets API setup
# Path to your service account credentials JSON file
SERVICE_ACCOUNT_FILE = 'Credentials.json'  # Replace with the path to your credentials.json file
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# Authenticate with the service account
credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)

# Build the Google Sheets API service
service = build('sheets', 'v4', credentials=credentials)

# Spreadsheet ID from your URL
SPREADSHEET_ID = '14sXJ4m6x6Dtl1vh4QsHv1SOpvlLQCG0lNRj7RaEvdSg'  # Extracted from your URL
SHEET_NAME = 'Player Per Game Stats'  # Name of the sheet you want to update
# Clear the existing content in the sheet
RANGE_NAME = f'{SHEET_NAME}!A1'  # Start at cell A1

# Prepare data for Google Sheets
# Convert DataFrame to a list of lists (including headers)
values = [df.columns.tolist()] + df.values.tolist()

# Clear the existing content in the sheet
service.spreadsheets().values().clear(
    spreadsheetId=SPREADSHEET_ID,
    range=SHEET_NAME
).execute()

# Update the sheet with the new data
body = {
    'values': values
}
result = service.spreadsheets().values().update(
    spreadsheetId=SPREADSHEET_ID,
    range=RANGE_NAME,
    valueInputOption='RAW',
    body=body
).execute()

print(f"Updated {result.get('updatedCells')} cells in Google Sheets.")