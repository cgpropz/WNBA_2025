from google.oauth2 import service_account
from io import StringIO
from seleniumbase import Driver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import pandas as pd
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging
import time

try:
    from playwright.sync_api import sync_playwright
except Exception:  # pragma: no cover - optional dependency
    sync_playwright = None

BASE_URL = "https://stats.wnba.com/players/boxscores-traditional/?SeasonType=Regular%20Season&Season={season}"
SEASONS = [2025, 2026]
OUTPUT_CSV = 'wnba_boxscores_2025_2026.csv'
TABLE_XPATHS = [
    '//div[contains(@class, "nba-stat-table")]//table',
    '//div[contains(@class, "table-responsive")]//table',
    '//table',
]
SELECT_XPATHS = [
    '//nba-stat-table//select',
    '//div[contains(@class, "DropDown") or contains(@class, "dropdown")]//select',
    '//select',
]


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def wait_for_first_visible(driver, xpaths, timeout=25):
    for xpath in xpaths:
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.visibility_of_element_located((By.XPATH, xpath))
            )
            logger.info('Found element with XPath: %s', xpath)
            return element
        except Exception:
            continue
    raise ValueError(f'Could not find visible element for any selector: {xpaths}')


def set_rows_to_all_if_available(driver):
    try:
        select = wait_for_first_visible(driver, SELECT_XPATHS, timeout=10)
    except Exception:
        logger.info('Rows-per-page dropdown not found; continuing with default page size.')
        return

    options = select.find_elements(By.TAG_NAME, 'option')
    if not options:
        logger.info('Rows-per-page dropdown has no options; continuing with default page size.')
        return

    target_option = None
    for option in options:
        label = option.text.strip().lower()
        if 'all' in label:
            target_option = option
            break

    if target_option is None:
        target_option = options[0]

    try:
        target_option.click()
    except Exception:
        value = target_option.get_attribute('value')
        if value is not None:
            driver.execute_script(
                "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
                select,
                value,
            )

    driver.sleep(2)

def normalize_gamelog_frame(season_df, season):
    season_df.columns = [str(column).replace('\xa0', ' ').strip() for column in season_df.columns]
    if 'Season' not in season_df.columns:
        season_df['Season'] = season
    else:
        season_df['Season'] = season_df['Season'].replace('', pd.NA).fillna(season)
    return season_df


def fetch_with_selenium(season):
    driver = Driver(uc=True, headless=True)
    try:
        logger.info('Loading season %s via Selenium', season)
        driver.get(BASE_URL.format(season=season))
        driver.sleep(4)

        set_rows_to_all_if_available(driver)

        # Trigger lazy rendering before reading table HTML.
        driver.execute_script('window.scrollTo(0, document.body.scrollHeight);')
        driver.sleep(3)
        driver.execute_script('window.scrollTo(0, 0);')
        driver.sleep(1)

        table = wait_for_first_visible(driver, TABLE_XPATHS, timeout=30)
        season_df = pd.read_html(StringIO(table.get_attribute('outerHTML')))[0]
        return normalize_gamelog_frame(season_df, season)
    finally:
        driver.quit()


def fetch_with_playwright(season):
    if sync_playwright is None:
        raise RuntimeError('playwright is not installed')

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            logger.info('Loading season %s via Playwright', season)
            page = browser.new_page()
            page.goto(BASE_URL.format(season=season), wait_until='domcontentloaded', timeout=120000)
            page.wait_for_timeout(4000)

            try:
                page.locator('select').first.wait_for(timeout=5000)
                page.locator('select').first.select_option(label='All')
            except Exception:
                logger.info('No page-size selector was available for season %s', season)

            page.wait_for_selector('table', timeout=30000)
            html = page.content()
            tables = pd.read_html(StringIO(html))
            if not tables:
                raise ValueError('No tables found in Playwright page content')
            return normalize_gamelog_frame(tables[0], season)
        finally:
            browser.close()


def fetch_gamelog_for_season(season, max_retries=3):
    for attempt in range(1, max_retries + 1):
        logger.info('Loading season %s (attempt %s/%s)', season, attempt, max_retries)
        for loader_name, loader in (
            ('selenium', lambda: fetch_with_selenium(season)),
            ('playwright', lambda: fetch_with_playwright(season)),
        ):
            try:
                return loader()
            except Exception as exc:
                logger.warning('Season %s %s path failed: %s', season, loader_name, exc)
        if attempt == max_retries:
            raise RuntimeError(f'Unable to scrape season {season} with Selenium or Playwright')
        time.sleep(2 ** attempt)

season_frames = [fetch_gamelog_for_season(season) for season in SEASONS]
df = pd.concat(season_frames, ignore_index=True)
df['Game Date Sort'] = pd.to_datetime(df['Game Date'], format='%m/%d/%Y', errors='coerce')
df = df.sort_values('Game Date Sort', ascending=False, na_position='last').drop(columns=['Game Date Sort'])

# Save combined CSV
df.to_csv(OUTPUT_CSV, index=False)
print(df.head())

# Google Sheets API setup
SERVICE_ACCOUNT_FILE = 'Credentials2.json'
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']


def build_service():
    service_account_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '').strip()
    if service_account_json:
        import json
        credentials = service_account.Credentials.from_service_account_info(
            json.loads(service_account_json), scopes=SCOPES
        )
        return build('sheets', 'v4', credentials=credentials)

    if os.path.exists(SERVICE_ACCOUNT_FILE):
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        return build('sheets', 'v4', credentials=credentials)

    raise FileNotFoundError(
        'Google Sheets credentials are unavailable. Set GOOGLE_SERVICE_ACCOUNT_JSON or provide Credentials2.json.'
    )

# Authenticate with the service account
try:
    service = build_service()

    # Spreadsheet ID and sheet details
    SPREADSHEET_ID = '14sXJ4m6x6Dtl1vh4QsHv1SOpvlLQCG0lNRj7RaEvdSg'
    SHEET_NAME = 'Gamelogs'
    RANGE_NAME = f'{SHEET_NAME}!A1:Z'

    # Prepare data for Google Sheets
    # Replace NaN with empty string to ensure JSON compatibility
    df_cleaned = df.fillna('')
    values = [df_cleaned.columns.tolist()] + df_cleaned.values.tolist()

    # Log the data being sent to Google Sheets for debugging
    print("Data prepared for Google Sheets (first 2 rows):")
    print(values[:2])

    # Clear the specified range A1:Z
    service.spreadsheets().values().clear(
        spreadsheetId=SPREADSHEET_ID,
        range=RANGE_NAME
    ).execute()
    print(f"Cleared range {RANGE_NAME} in Google Sheets.")

    # Update the sheet with the new data
    body = {'values': values}
    result = service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=RANGE_NAME,
        valueInputOption='USER_ENTERED',
        body=body
    ).execute()
    print(f"Updated {result.get('updatedCells')} cells in Google Sheets.")

except HttpError as error:
    print(f"An error occurred with Google Sheets API: {error}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")