/**
 * Weighted projection formula:
 * For a single stat (example: rebounds), use that stat's per-minute windows only:
 * projStat = (L3_statPerMin * 0.5 + L7_statPerMin * 0.3 + L15_statPerMin * 0.2) * expectedMins * dvpFactor
 *
 * Examples:
 * - Rebounds projection uses REB/min windows
 * - Assists projection uses AST/min windows
 * - Points projection uses PTS/min windows
 */
export function calcProjection(l3ppm, l7ppm, l15ppm, expectedMins, dvpFactor = 1.0) {
  const weightedPPM = l3ppm * 0.5 + l7ppm * 0.3 + l15ppm * 0.2
  return weightedPPM * expectedMins * dvpFactor
}

export function calcAllStats(ppm, expectedMins, dvpFactor = 1.0) {
  const stats = ['pts', 'reb', 'ast', 'fg3m', 'stl', 'blk']
  const result = {}
  for (const stat of stats) {
    const l3 = ppm?.l3?.[stat] ?? 0
    const l7 = ppm?.l7?.[stat] ?? 0
    const l15 = ppm?.l15?.[stat] ?? 0
    result[stat] = calcProjection(l3, l7, l15, expectedMins, dvpFactor)
  }
  return result
}
