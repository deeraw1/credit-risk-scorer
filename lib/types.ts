// ── Retail Scorecard ──────────────────────────────────────────────────────────
export interface RetailInput {
  // identity
  employmentType:  'salaried' | 'self-employed' | 'contract' | 'unemployed'
  yearsEmployed:   number
  // financials
  monthlyIncome:   number
  monthlyDebt:     number      // existing obligations
  loanAmount:      number
  tenureMonths:    number
  interestRate:    number      // annual %
  collateralValue: number      // 0 = unsecured
  // history
  creditHistory:   'excellent' | 'good' | 'fair' | 'poor' | 'none'
  priorDefaults:   number
}

export interface ScorecardFactor {
  factor:  string
  points:  number
  max:     number
  comment: string
}

export interface RetailResult {
  // ratios
  dti:    number   // debt-to-income %
  ltv:    number   // loan-to-value % (0 if unsecured)
  dscr:   number   // debt service coverage ratio
  emi:    number   // monthly instalment
  // score
  factors:    ScorecardFactor[]
  totalScore: number            // 0–100 (higher = safer)
  grade:      string            // AAA B+ etc.
  pd:         number            // probability of default %
  decision:   'Approve' | 'Review' | 'Decline'
  decisionColor: string
  narrative:  string[]
}

// ── Altman Z-Score ────────────────────────────────────────────────────────────
export interface AltmanInput {
  workingCapital:    number
  totalAssets:       number
  retainedEarnings:  number
  ebit:              number
  marketCapEquity:   number
  totalLiabilities:  number
  revenue:           number
  listed:            boolean
}

export interface AltmanResult {
  x1: number; x2: number; x3: number; x4: number; x5: number
  z:  number
  zone:      'Safe' | 'Grey' | 'Distress'
  zoneColor: string
  grade:     string
  pd:        number
  narrative: string[]
}
