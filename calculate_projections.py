import pandas as pd
import json

# Load data
per_min_df = pd.read_csv('wnba_perMin_stats.csv')
projections_df = pd.read_csv('wnba_projections.csv')
center_dvp_df = pd.read_csv('wnba_center_dvp.csv')
forward_dvp_df = pd.read_csv('wnba_forward_dvp.csv')
guard_dvp_df = pd.read_csv('wnba_guard_dvp.csv')

# Load mappings
with open('mappings/player_positions.json', 'r') as f:
    positions = json.load(f)

# Function to get DVP scale for team and position
def get_dvp_scale(team, position):
    if position == 'Center':
        df = center_dvp_df
    elif position == 'Forward':
        df = forward_dvp_df
    elif position == 'Guard':
        df = guard_dvp_df
    else:
        return 1.0  # default

    team_row = df[df['TEAM'] == team]
    if not team_row.empty:
        opp_pts = team_row['OPP PTS'].values[0]
        # Normalize: assume average OPP PTS is 80, scale accordingly
        scale = opp_pts / 80.0
        return scale
    return 1.0

# Calculate projections
results = []
for _, row in projections_df.iterrows():
    player = row['name']
    team = row['team']
    position = positions.get(player, 'Unknown')
    pts_per_min = per_min_df[per_min_df['PLAYER'] == player]['PTS'].values[0] if not per_min_df[per_min_df['PLAYER'] == player].empty else 0
    expected_min = row.get('minutes', 30)  # default 30 if not in projections
    dvp_scale = get_dvp_scale(team, position)
    projected_points = pts_per_min * expected_min * dvp_scale

    results.append({
        'name': player,
        'team': team,
        'projected_points': projected_points,
        'position': position
    })

# Save to CSV
output_df = pd.DataFrame(results)
output_df.to_csv('wnba_calculated_projections.csv', index=False)
print("Projections calculated and saved.")