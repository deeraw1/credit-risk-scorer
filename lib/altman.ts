import type { AltmanInput, AltmanResult } from './types'

// Altman Z-Score (1968, revised 1995 for private firms)
// Public:  Z = 1.2X1 + 1.4X2 + 3.3X3 + 0.6X4 + 1.0X5
// Private: Z'= 0.717X1 + 0.847X2 + 3.107X3 + 0.420X4 + 0.998X5

export function altman(input: AltmanInput): AltmanResult {
  const { workingCapital, totalAssets, retainedEarnings,
          ebit, marketCapEquity, totalLiabilities, revenue, listed } = input

  const safe = (n: number, d: number) => d !== 0 ? n / d : 0

  const x1 = safe(workingCapital,   totalAssets)
  const x2 = safe(retainedEarnings, totalAssets)
  const x3 = safe(ebit,             totalAssets)
  const x4 = safe(marketCapEquity,  totalLiabilities)
  const x5 = safe(revenue,          totalAssets)

  const z = listed
    ? 1.2*x1 + 1.4*x2 + 3.3*x3 + 0.6*x4 + 1.0*x5
    : 0.717*x1 + 0.847*x2 + 3.107*x3 + 0.420*x4 + 0.998*x5

  const safeZone = listed ? 2.99 : 2.9
  const distressZone = listed ? 1.81 : 1.23

  let zone: AltmanResult['zone'], zoneColor: string, grade: string, pd: number
  if (z >= safeZone) {
    zone = 'Safe';     zoneColor = '#17c082'; grade = 'Investment Grade'; pd = 1.5
  } else if (z >= distressZone) {
    zone = 'Grey';     zoneColor = '#f59e0b'; grade = 'Speculative';      pd = 15
  } else {
    zone = 'Distress'; zoneColor = '#e74c3c'; grade = 'Distressed';       pd = 55
  }

  const narrative: string[] = [
    `Altman Z-Score: ${z.toFixed(3)} — ${zone} Zone (${listed ? 'public' : 'private'} firm model).`,
    `X1 (Working Capital / Total Assets): ${x1.toFixed(3)} — ${x1 >= 0.2 ? 'healthy liquidity buffer' : 'liquidity concern'}.`,
    `X2 (Retained Earnings / Total Assets): ${x2.toFixed(3)} — ${x2 >= 0.2 ? 'strong earnings retention' : 'limited retained earnings'}.`,
    `X3 (EBIT / Total Assets): ${x3.toFixed(3)} — ${x3 >= 0.1 ? 'good asset productivity' : 'weak asset returns'}.`,
    `X4 (Equity / Liabilities): ${x4.toFixed(3)} — ${x4 >= 1 ? 'equity well covers liabilities' : 'leveraged — liabilities exceed equity'}.`,
    `X5 (Revenue / Total Assets): ${x5.toFixed(3)} — asset utilisation ${x5 >= 1 ? 'efficient' : 'could be improved'}.`,
    `Estimated probability of financial distress: ${pd}%. Classified as ${grade}.`,
  ]

  return {
    x1: parseFloat(x1.toFixed(4)),
    x2: parseFloat(x2.toFixed(4)),
    x3: parseFloat(x3.toFixed(4)),
    x4: parseFloat(x4.toFixed(4)),
    x5: parseFloat(x5.toFixed(4)),
    z:  parseFloat(z.toFixed(3)),
    zone, zoneColor, grade, pd, narrative,
  }
}
