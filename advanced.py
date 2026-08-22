from google.oauth2 import service_account
from seleniumbase import Driver
import pandas as pd
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

url = "https://stats.wnba.com/teams/advanced/?sort=W&dir=-1"

driver = Driver(uc=True, headless=True)

driver.get(url)
driver.sleep(2)

driver.wait_for_element('xpath', '/html/body/main/div[2]/div/div[2]/div/div/nba-stat-table/div[2]')
driver.sleep(2)


driver.execute_script("window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });")
driver.sleep(5)

# Scrape table data with corrected XPath
table = driver.find_element('xpath', '/html/body/main/div[2]/div/div[2]/div/div/nba-stat-table/div[2]')
df = pd.read_html(table.get_attribute('outerHTML'))[0]

# Save to CSV
df.to_csv('wnba_advanced_stats.csv', index=False)
print(df.head())

driver.quit()