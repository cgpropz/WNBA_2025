import json
import os

import requests
import pandas
from bs4 import BeautifulSoup
import gspread
from google.oauth2 import service_account

url = "https://www.rotowire.com/wnba/lineups.php"
soup = BeautifulSoup(requests.get(url).text, "html.parser")

# Lists to store player data
names = []
teams = []
positions = []

# Find all lineup boxes
lineup_boxes = soup.find_all(class_='lineup__box')

for box in lineup_boxes:
    # Get visiting team
    visit_team_elem = box.find(class_='lineup__team is-visit')
    if not visit_team_elem:
        print("Skipping box: No visiting team found")
        continue
    visit_team = visit_team_elem.find(class_='lineup__abbr')
    if not visit_team:
        print("Skipping box: No visiting team abbreviation found")
        continue
    visit_team = visit_team.text

    # Get home team
    home_team_elem = box.find(class_='lineup__team is-home')
    if not home_team_elem:
        print("Skipping box: No home team found")
        continue
    home_team = home_team_elem.find(class_='lineup__abbr')
    if not home_team:
        print("Skipping box: No home team abbreviation found")
        continue
    home_team = home_team.text

    # Get visiting team players (100%, 75%, and 50% probability)
    visit_list = box.find(class_='lineup__list is-visit')
    if visit_list:
        visit_players = visit_list.find_all(class_=['lineup__player is-pct-play-100', 'lineup__player is-pct-play-75', 'lineup__player is-pct-play-50'])
        for player in visit_players:
            name_elem = player.find('a')
            pos_elem = player.find(class_='lineup__pos')
            if name_elem and pos_elem:
                names.append(name_elem['title'])
                teams.append(visit_team)
                positions.append(pos_elem.text)
            else:
                print(f"Skipping player in {visit_team}: Missing name or position")

    # Get home team players (100%, 75%, and 50% probability)
    home_list = box.find(class_='lineup__list is-home')
    if home_list:
        home_players = home_list.find_all(class_=['lineup__player is-pct-play-100', 'lineup__player is-pct-play-75', 'lineup__player is-pct-play-50'])
        for player in home_players:
            name_elem = player.find('a')
            pos_elem = player.find(class_='lineup__pos')
            if name_elem and pos_elem:
                names.append(name_elem['title'])
                teams.append(home_team)
                positions.append(pos_elem.text)
            else:
                print(f"Skipping player in {home_team}: Missing name or position")

# Create DataFrame
df = pandas.DataFrame({'Player': names, 'Team': teams, 'Position': positions})

df.to_csv('Daily_WNBA_lineups.csv', index=False)
print('Data Saved to Daily_WNBA_lineups.csv for all teams on the current slate.')
print(df)

def upload_to_google_sheets(df, spreadsheet_id='14sXJ4m6x6Dtl1vh4QsHv1SOpvlLQCG0lNRj7RaEvdSg', worksheet_name='Daily Lineups'):
    """
    Uploads DataFrame to Google Sheets, clearing cells A1:C before updating.

    Args:
        df: pandas DataFrame with lineup data
        spreadsheet_id: Google Sheets spreadsheet ID
        worksheet_name: Name of the worksheet to update
    """
    # Define scope for Google Sheets API
    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']

    service_account_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    if service_account_json:
        creds = service_account.Credentials.from_service_account_info(
            json.loads(service_account_json), scopes=scope
        )
    else:
        creds = service_account.Credentials.from_service_account_file('creds3.json', scopes=scope)
    client = gspread.authorize(creds)

    # Open the spreadsheet and select the worksheet
    spreadsheet = client.open_by_key(spreadsheet_id)
    worksheet = spreadsheet.worksheet(worksheet_name)

    # Clear cells A1:C
    worksheet.batch_clear(['A1:C'])

    # Prepare data: Convert DataFrame to list of lists, including headers
    data = [df.columns.values.tolist()] + df.values.tolist()

    # Update the worksheet with new data starting at A1
    worksheet.update('A1', data)
    print(f'Data uploaded to Google Sheets: {worksheet_name}')

if os.environ.get('SKIP_SHEETS', '').strip():
    print('SKIP_SHEETS is set; skipping Google Sheets upload.')
else:
    upload_to_google_sheets(df)