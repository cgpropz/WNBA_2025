import os

import pandas as pd
import requests


URL = 'https://api.props.cash/wnba/projections'
OUTPUT_PATH = 'wnba_projections.csv'


def main() -> None:
    token = os.environ.get('PROPS_CASH_TOKEN', '').strip()
    if not token:
        raise SystemExit('PROPS_CASH_TOKEN is required to refresh projections.')

    response = requests.get(
        URL,
        headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Authorization': f'Bearer {token}',
        },
        timeout=45,
    )
    response.raise_for_status()

    rows = []
    for player in response.json():
        rows.append({
            'name': player.get('name', 'N/A'),
            'team': player.get('team', 'N/A'),
            **player.get('lines', {}),
            **player.get('projections', {}),
        })

    if not rows:
        raise SystemExit('Props.cash returned no projections; preserving the prior output.')

    pd.DataFrame(rows).to_csv(OUTPUT_PATH, index=False)
    print(f'Saved {len(rows)} projections to {OUTPUT_PATH}.')


if __name__ == '__main__':
    main()