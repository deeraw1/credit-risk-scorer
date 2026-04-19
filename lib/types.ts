// ── ML Retail Input ───────────────────────────────────────────────────────────
export interface RetailInput {
  // personal
  age:              number
  maritalStatus:    'Single' | 'Married' | 'Divorced'
  education:        'HighSchool' | 'Bachelor' | 'Master' | 'PhD'
  // employment
  employmentType:   'Full-time' | 'Part-time' | 'Self-employed' | 'Unemployed'
  yearsEmployed:    number
  // financials
  annualIncome:     number
  monthlyDebt:      number
  loanAmount:       number
  tenureMonths:     number
  interestRate:     number
  creditScore:      number
  numCreditLines:   number
  // loan details
  loanPurpose:      'Home' | 'Auto' | 'Education' | 'Business' | 'Other'
  hasMortgage:      boolean
  hasDependents:    boolean
  hasCoSigner:      boolean
}

export interface ScorecardFactor {
  factor:  string
  points:  number
  max:     number
  comment: string
}

export interface RetailResult {
  // ML output
  defaultProbability: number
  decision:           'Approve' | 'Review' | 'Decline'
  riskLevel:          'Low' | 'Medium' | 'High'
  // derived client-side
  dti:        number
  dscr:       number
  emi:        number
  ltv:        number
  grade:      string
  totalScore: number      // 0–100 safe score (1 - PD)
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
