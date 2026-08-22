from seleniumbase import Driver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
import logging
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the desired column headers
columns_list = [
    "TEAM", "GP", "W", "L", "MIN", "OPP FGM", "OPP FGA", "OPP FG_PCT",
    "OPP FG3M", "OPP FG3A", "OPP FG3_PCT", "OPP FTM", "OPP FTA", "OPP FT_PCT",
    "OPP OREB", "OPP DREB", "OPP REB", "OPP AST", "OPP TOV", "OPP STL",
    "OPP BLK", "OPP BLKA", "OPP PF", "OPP PFD", "OPP PTS", "PLUS_MINUS"
]

url = "https://stats.wnba.com/teams/opponent/?sort=W&dir=-1&Season=2026&SeasonType=Regular%20Season&PlayerPosition=C"

def scrape_wnba_data(max_retries=3):
    attempt = 1
    while attempt <= max_retries:
        driver = None
        try:
            driver = Driver(uc=True, headless=True)
            driver.maximize_window()
            logger.info("Navigating to URL: %s", url)
            driver.get(url)
            driver.sleep(5)  # Initial wait for page load

            # Smooth scroll to trigger lazy loading
            logger.info("Performing smooth scroll")
            driver.execute_script("""
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                    }
                }, 100);
            """)
            driver.sleep(5)  # Wait after scrolling

            # Wait for table to be visible
            table_selectors = [
                '//div[contains(@class, "nba-stat-table")]//table',
                '//div[contains(@class, "table-responsive")]//table',
                '//table'
            ]
            table = None
            for xpath in table_selectors:
                try:
                    table = WebDriverWait(driver, 30).until(
                        EC.visibility_of_element_located((By.XPATH, xpath))
                    )
                    logger.info("Found table with XPath: %s", xpath)
                    break
                except:
                    continue

            if not table:
                driver.save_screenshot(f"error_screenshot_attempt_{attempt}.png")
                with open(f"error_page_attempt_{attempt}.html", "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
                raise ValueError("Table element not found with any selector")

            # Scrape table data
            df = pd.read_html(table.get_attribute('outerHTML'))[0]
            logger.info("Scraped columns: %s", df.columns.tolist())

            # Create and populate DataFrame
            wnba_df = pd.DataFrame(columns=columns_list)
            scraped_columns = df.columns.str.lower()
            desired_columns = [col.lower() for col in columns_list]
            column_mapping = {}
            for i, scraped_col in enumerate(scraped_columns):
                if scraped_col in desired_columns:
                    mapped_col = columns_list[desired_columns.index(scraped_col)]
                    column_mapping[df.columns[i]] = mapped_col
                else:
                    logger.warning("Column '%s' not found in desired columns.", scraped_col)

            df.rename(columns=column_mapping, inplace=True)
            for col in columns_list:
                wnba_df[col] = df[col] if col in df.columns else pd.NA

            wnba_df = wnba_df[columns_list].sort_values(by="TEAM")
            wnba_df.to_csv('wnbaCENTERdvp.csv', index=False)
            logger.info("First 5 rows of the DataFrame:\n%s", wnba_df.head())

            return True

        except Exception as e:
            logger.error("Error on attempt %d: %s", attempt, str(e))
            attempt += 1
            if attempt > max_retries:
                logger.error("Max retries reached.")
                return False
            driver.sleep(2 ** attempt)  # Exponential backoff
        finally:
            if driver:
                driver.quit()

def main():
    success = scrape_wnba_data()
    if not success:
        logger.error("Scraping failed after all retries.")

if __name__ == "__main__":
    main()