import json
from pathlib import Path
from io import StringIO
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pandas as pd
from seleniumbase import Driver

OUTPUT_PATH = Path('wnba_bio_2025.csv')
SEASON = '2026'
MIN_EXPECTED_ROWS = 80
EXPECTED_COLUMNS = [
	'Player', 'Team', 'Age', 'Height', 'Weight', 'College', 'Country',
	'GP', 'PTS', 'REB', 'AST', 'NetRtg', 'OREB%', 'DREB%', 'USG%', 'TS%', 'AST%',
]

API_COLUMN_MAP = {
	'PLAYER_NAME': 'Player',
	'TEAM_ABBREVIATION': 'Team',
	'AGE': 'Age',
	'PLAYER_HEIGHT': 'Height',
	'PLAYER_WEIGHT': 'Weight',
	'COLLEGE': 'College',
	'COUNTRY': 'Country',
	'GP': 'GP',
	'PTS': 'PTS',
	'REB': 'REB',
	'AST': 'AST',
	'NET_RATING': 'NetRtg',
	'OREB_PCT': 'OREB%',
	'DREB_PCT': 'DREB%',
	'USG_PCT': 'USG%',
	'TS_PCT': 'TS%',
	'AST_PCT': 'AST%',
}


def normalize_frame(df: pd.DataFrame) -> pd.DataFrame:
	if isinstance(df.columns, pd.MultiIndex):
		df.columns = [col[-1] for col in df.columns]

	df = df.rename(columns=API_COLUMN_MAP)
	if 'Player' not in df.columns:
		raise ValueError('Bio table did not include a Player column')

	for column in EXPECTED_COLUMNS:
		if column not in df.columns:
			df[column] = '-'

	df = df[EXPECTED_COLUMNS].dropna(subset=['Player']).reset_index(drop=True)
	df = df.fillna('-')

	if 'Age' in df.columns:
		df['Age'] = df['Age'].apply(lambda value: str(int(value)) if isinstance(value, float) and value.is_integer() else value)

	for column in ('OREB%', 'DREB%', 'USG%', 'TS%', 'AST%'):
		df[column] = df[column].apply(format_percent)

	return df


def format_percent(value):
	if value == '-' or value == '':
		return value
	if isinstance(value, str) and value.endswith('%'):
		return value
	try:
		number = float(value)
	except (TypeError, ValueError):
		return value
	if abs(number) <= 1:
		number *= 100
	return f'{number:.1f}%'


def validate_frame(df: pd.DataFrame, source: str) -> pd.DataFrame:
	if len(df) < MIN_EXPECTED_ROWS:
		raise ValueError(f'{source} returned only {len(df)} rows; expected at least {MIN_EXPECTED_ROWS}')
	return df


def stats_api_url() -> str:
	params = {
		'College': '', 'Conference': '', 'Country': '', 'DateFrom': '', 'DateTo': '',
		'Division': '', 'DraftPick': '', 'DraftYear': '', 'GameScope': '', 'GameSegment': '',
		'Height': '', 'LastNGames': 0, 'LeagueID': '10', 'Location': '', 'MeasureType': 'Base',
		'Month': 0, 'OpponentTeamID': 0, 'Outcome': '', 'PORound': 0, 'PaceAdjust': 'N',
		'PerMode': 'PerGame', 'Period': 0, 'PlayerExperience': '', 'PlayerPosition': '',
		'PlusMinus': 'N', 'Rank': 'N', 'Season': SEASON, 'SeasonSegment': '',
		'SeasonType': 'Regular Season', 'ShotClockRange': '', 'StarterBench': '', 'TeamID': 0,
		'VsConference': '', 'VsDivision': '', 'Weight': '',
	}
	return f'https://stats.wnba.com/stats/leaguedashplayerbiostats?{urlencode(params)}'


def frame_from_payload(payload: dict) -> pd.DataFrame:
	result_set = payload['resultSets'][0]
	df = pd.DataFrame(result_set['rowSet'], columns=result_set['headers'])
	return normalize_frame(df)


def fetch_from_stats_api() -> pd.DataFrame:
	url = stats_api_url()
	request = Request(url, headers={
		'Accept': 'application/json, text/plain, */*',
		'Origin': 'https://stats.wnba.com',
		'Referer': 'https://stats.wnba.com/players/bio/',
		'User-Agent': 'Mozilla/5.0',
		'x-nba-stats-origin': 'stats',
		'x-nba-stats-token': 'true',
	})
	with urlopen(request, timeout=20) as response:
		payload = json.loads(response.read().decode('utf-8'))

	return validate_frame(frame_from_payload(payload), 'stats API')


def fetch_from_browser_api() -> pd.DataFrame:
	driver = Driver(uc=True, headless=True)
	try:
		driver.get('https://stats.wnba.com/players/bio/')
		driver.sleep(5)
		result = driver.execute_async_script(
			'''
			const done = arguments[arguments.length - 1];
			fetch(arguments[0], {
			  headers: {
			    'Accept': 'application/json, text/plain, */*',
			    'x-nba-stats-origin': 'stats',
			    'x-nba-stats-token': 'true'
			  }
			})
			  .then(response => response.text().then(text => done({ status: response.status, text })))
			  .catch(error => done({ error: String(error) }));
			''',
			stats_api_url(),
		)
		if result.get('error'):
			raise RuntimeError(result['error'])
		if result.get('status') != 200:
			raise RuntimeError(f"HTTP {result.get('status')}: {result.get('text', '')[:200]}")
		return validate_frame(frame_from_payload(json.loads(result['text'])), 'browser stats API')
	finally:
		driver.quit()


def scrape_from_page() -> pd.DataFrame:
	url = 'https://stats.wnba.com/players/bio/'
	driver = Driver(uc=True, headless=True)
	try:
		driver.get(url)
		driver.sleep(5)

		for selector in ('select', '.stats-table-pagination__select'):
			elements = driver.find_elements('css selector', selector)
			if elements:
				driver.execute_script(
					"arguments[0].selectedIndex = 0; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
					elements[0],
				)
				driver.sleep(2)
				break

		html_candidates = [driver.page_source]
		for selector in ('nba-stat-table', '.nba-stat-table__overflow', 'table'):
			for element in driver.find_elements('css selector', selector):
				html_candidates.append(element.get_attribute('outerHTML'))

		for html in html_candidates:
			for table in pd.read_html(StringIO(html)):
				try:
					df = normalize_frame(table)
					return validate_frame(df, 'stats page')
				except ValueError:
					continue

		raise ValueError('Could not find a usable player bio table on stats.wnba.com')
	finally:
		driver.quit()


def main() -> None:
	errors = []

	for label, loader in (
		('stats API', fetch_from_stats_api),
		('browser stats API', fetch_from_browser_api),
		('stats page', scrape_from_page),
	):
		try:
			df = loader()
			df.to_csv(OUTPUT_PATH, index=False)
			print(f'Refreshed {len(df)} player bio rows from {label}.')
			print(df.head())
			return
		except Exception as exc:
			errors.append(f'{label}: {exc}')
			print(f'[warn] Player bio refresh via {label} failed: {exc}')

	if OUTPUT_PATH.exists():
		df = pd.read_csv(OUTPUT_PATH)
		if len(df) < MIN_EXPECTED_ROWS:
			raise RuntimeError(
				f'Player bio refresh failed and existing CSV has only {len(df)} rows. '
				+ ' | '.join(errors)
			)
		print('[warn] Live player bio refresh failed; keeping existing CSV so the pipeline can continue.')
		print('\n'.join(f' - {error}' for error in errors))
		print(df.head())
		return

	raise RuntimeError('Player bio refresh failed and no existing CSV is available. ' + ' | '.join(errors))


if __name__ == '__main__':
	main()