import requests
import pandas as pd
from bs4 import BeautifulSoup

# URL of the website to scrape
url = 'https://stats.wnba.com/stats/leaguedashteamstats?Conference=&DateFrom=&DateTo=&Division=&GameScope=&GameSegment=&LastNGames=0&LeagueID=10&Location=&MeasureType=Opponent&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2025&SeasonSegment=&SeasonType=Regular+Season&ShotClockRange=&StarterBench=&TeamID=0&TwoWay=0&VsConference=&VsDivision='



# Request headers
headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Cookie': 'bm_sv=0C223DB3A1D0E9B49B998EA9C0B3AE07~YAAQj+stFysr70yPAQAAz04XkheOHaHkgQMoOprjxUG5j+cozmObAHk/p+39Fe1B4uHV6Ux+xDg8HrJ5H/8/aGcwNCRI7vZ967TZ+345Q6M2YJ3iSyhc6c1vX7vuffCPI1OCxs4lKPpjKrkvxTenIXrL/VJFTFT52mt7EgK3aWHp7YbhJw3UM9Pny4CC1btFf9IvC/lfkgGf41NpGmDDhaVSu9wLcDwnBUEBG5yTwPd1kXwczTTh2w2uDfYqIw==~1; Domain=.wnba.com; Path=/; Expires=Sun, 19 May 2024 20:12:45 GMT; Max-Age=6613; Secure',
    'Host': 'stats.wnba.com',
    'Referer': 'https://stats.wnba.com/teams/opponent/?sort=W&dir=-1&Season=2024&SeasonType=Regular%20Season&PlayerPosition=G',
    'Sec-Ch-Ua': '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'X-Nba-Stats-Origin': 'stats',
    'X-Nba-Stats-Token': 'true'
}

response = requests.get(url, headers=headers)

# Check if the request was successful (status code 200)
if response.status_code == 200:
    # Parse the JSON response
    data = response.json()
    player_info = data['resultSets'][0]['rowSet']

    # Define columns
    columns_list= [
               "TEAM_ID",
                "TEAM_NAME",
                "GP",
                "W",
                "L",
                "W_PCT",
                "MIN",
                "OPP_FGM",
                "OPP_FGA",
                "OPP_FG_PCT",
                "OPP_FG3M",
                "OPP_FG3A",
                "OPP_FG3_PCT",
                "OPP_FTM",
                "OPP_FTA",
                "OPP_FT_PCT",
                "OPP_OREB",
                "OPP_DREB",
                "OPP_REB",
                "OPP_AST",
                "OPP_TOV",
                "OPP_STL",
                "OPP_BLK",
                "OPP_BLKA",
                "OPP_PF",
                "OPP_PFD",
                "OPP_PTS",
                "PLUS_MINUS",
                "GP_RANK",
                "W_RANK",
                "L_RANK",
                "W_PCT_RANK",
                "MIN_RANK",
                "OPP_FGM_RANK",
                "OPP_FGA_RANK",
                "OPP_FG_PCT_RANK",
                "OPP_FG3M_RANK",
                "OPP_FG3A_RANK",
                "OPP_FG3_PCT_RANK",
                "OPP_FTM_RANK",
                "OPP_FTA_RANK",
                "OPP_FT_PCT_RANK",
                "OPP_OREB_RANK",
                "OPP_DREB_RANK",
                "OPP_REB_RANK",
                "OPP_AST_RANK",
                "OPP_TOV_RANK",
                "OPP_STL_RANK",
                "OPP_BLK_RANK",
                "OPP_BLKA_RANK",
                "OPP_PF_RANK",
                "OPP_PFD_RANK",
                "OPP_PTS_RANK",
                "PLUS_MINUS_RANK"
    ]

    # Create DataFrame
    wnba_df = pd.DataFrame(player_info, columns=columns_list)

    # Save DataFrame to CSV file
    wnba_df.to_csv('WNBA_TeamRank2024.csv', index=False)

    # Print DataFrame
    print(wnba_df)
else:
    print("Failed to retrieve data. Status code:", response.status_code)
