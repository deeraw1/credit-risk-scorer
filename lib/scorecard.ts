import type { RetailInput, RetailResult, ScorecardFactor } from './types'

// ── EMI (equal monthly instalment) ───────────────────────────────────────────
function emi(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months
  const r = annualRate / 100 / 12
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

// ── Grade & PD table ──────────────────────────────────────────────────────────
const GRADE_TABLE = [
  { min: 90, grade: 'AAA', pd: 0.2  },
  { min: 80, grade: 'AA',  pd: 0.5  },
  { min: 70, grade: 'A',   pd: 1.0  },
  { min: 60, grade: 'BBB', pd: 2.5  },
  { min: 50, grade: 'BB',  pd: 5.0  },
  { min: 38, grade: 'B',   pd: 10.0 },
  { min: 25, grade: 'CCC', pd: 20.0 },
  { min: 0,  grade: 'D',   pd: 45.0 },
]

function gradeFromScore(score: number) {
  return GRADE_TABLE.find(g => score >= g.min) ?? GRADE_TABLE[GRADE_TABLE.length - 1]
}

// ── Scoring factors (each returns points out of max) ─────────────────────────
function scoreDTI(dti: number): ScorecardFactor {
  const factor = 'Debt-to-Income Ratio'
  const max    = 20
  let points: number, comment: string
  if      (dti <= 20) { points = 20; comment = 'Excellent — low debt burden' }
  else if (dti <= 30) { points = 16; comment = 'Good' }
  else if (dti <= 40) { points = 11; comment = 'Moderate — manageable' }
  else if (dti <= 50) { points = 6;  comment = 'Elevated — monitor closely' }
  else                { points = 0;  comment = 'High — debt burden excessive' }
  return { factor, points, max, comment }
}

function scoreDSCR(dscr: number): ScorecardFactor {
  const factor = 'Debt Service Coverage'
  const max    = 20
  let points: number, comment: string
  if      (dscr >= 2.0) { points = 20; comment = 'Strong — income well covers obligations' }
  else if (dscr >= 1.5) { points = 16; comment = 'Good coverage' }
  else if (dscr >= 1.2) { points = 11; comment = 'Adequate — limited buffer' }
  else if (dscr >= 1.0) { points = 5;  comment = 'Thin — barely covers debt service' }
  else                   { points = 0;  comment = 'Insufficient — income below obligations' }
  return { factor, points, max, comment }
}

function scoreLTV(ltv: number, secured: boolean): ScorecardFactor {
  const factor = 'Loan-to-Value (Collateral)'
  const max    = 15
  if (!secured) return { factor, points: 5, max, comment: 'Unsecured — no collateral' }
  let points: number, comment: string
  if      (ltv <= 50) { points = 15; comment = 'Strong collateral cover' }
  else if (ltv <= 70) { points = 12; comment = 'Good collateral' }
  else if (ltv <= 80) { points = 8;  comment = 'Adequate' }
  else if (ltv <= 90) { points = 4;  comment = 'Weak — over-leveraged against asset' }
  else                { points = 1;  comment = 'Very weak collateral cover' }
  return { factor, points, max, comment }
}

function scoreCreditHistory(h: RetailInput['creditHistory']): ScorecardFactor {
  const factor = 'Credit History'
  const max    = 20
  const map: Record<string, [number, string]> = {
    excellent: [20, 'Clean record — no delinquencies'],
    good:      [15, 'Mostly clean with minor issues'],
    fair:      [9,  'Some late payments on record'],
    poor:      [3,  'Significant delinquencies'],
    none:      [7,  'No credit history — thin file risk'],
  }
  const [points, comment] = map[h] ?? [0, 'Unknown']
  return { factor, points, max, comment }
}

function scoreDefaults(n: number): ScorecardFactor {
  const factor = 'Prior Defaults'
  const max    = 10
  let points: number, comment: string
  if      (n === 0) { points = 10; comment = 'No prior defaults' }
  else if (n === 1) { points = 4;  comment = '1 prior default — elevated risk' }
  else              { points = 0;  comment = `${n} prior defaults — high risk` }
  return { factor, points, max, comment }
}

function scoreEmployment(type: RetailInput['employmentType'], years: number): ScorecardFactor {
  const factor = 'Employment Stability'
  const max    = 15
  let base: number, comment: string
  if      (type === 'salaried')     { base = 10; comment = 'Salaried' }
  else if (type === 'self-employed'){ base = 7;  comment = 'Self-employed' }
  else if (type === 'contract')     { base = 5;  comment = 'Contract' }
  else                               { base = 0;  comment = 'Unemployed' }
  const tenure = years >= 5 ? 5 : years >= 3 ? 3 : years >= 1 ? 2 : 0
  const points = Math.min(base + tenure, max)
  comment += years >= 3 ? ` · ${years} yrs tenure (stable)` : ` · ${years} yrs tenure (short)`
  return { factor, points, max, comment }
}

// ── Narrative builder ─────────────────────────────────────────────────────────
function buildNarrative(input: RetailInput, r: Omit<RetailResult,'narrative'>): string[] {
  const lines: string[] = []
  lines.push(`Borrower requests ₦${r.emi.toLocaleString('en-NG', { maximumFractionDigits:0 })} monthly (EMI) over ${input.tenureMonths} months at ${input.interestRate}% p.a.`)
  lines.push(`DTI of ${r.dti.toFixed(1)}% — ${r.dti <= 35 ? 'within acceptable range' : 'exceeds recommended 35% threshold'}.`)
  lines.push(`DSCR of ${r.dscr.toFixed(2)}x — income ${r.dscr >= 1.2 ? 'adequately' : 'insufficiently'} covers total debt obligations.`)
  if (input.collateralValue > 0)
    lines.push(`LTV of ${r.ltv.toFixed(1)}% — collateral ${r.ltv <= 80 ? 'provides adequate security' : 'provides insufficient coverage'}.`)
  else
    lines.push('Loan is unsecured — no collateral provided.')
  lines.push(`Credit history rated "${input.creditHistory}" with ${input.priorDefaults} prior default(s).`)
  lines.push(`Estimated probability of default: ${r.pd.toFixed(1)}%. Credit grade: ${r.grade}.`)
  return lines
}

// ── Main export ───────────────────────────────────────────────────────────────
export function score(input: RetailInput): RetailResult {
  const monthlyEmi   = emi(input.loanAmount, input.interestRate, input.tenureMonths)
  const totalDebt    = input.monthlyDebt + monthlyEmi
  const dti          = input.monthlyIncome > 0 ? (totalDebt / input.monthlyIncome) * 100 : 999
  const dscr         = totalDebt > 0 ? input.monthlyIncome / totalDebt : 0
  const ltv          = input.collateralValue > 0 ? (input.loanAmount / input.collateralValue) * 100 : 0
  const secured      = input.collateralValue > 0

  const factors = [
    scoreDTI(dti),
    scoreDSCR(dscr),
    scoreLTV(ltv, secured),
    scoreCreditHistory(input.creditHistory),
    scoreDefaults(input.priorDefaults),
    scoreEmployment(input.employmentType, input.yearsEmployed),
  ]

  const raw   = factors.reduce((s,f) => s + f.points, 0)
  const maxPts = factors.reduce((s,f) => s + f.max, 0)
  const totalScore = Math.round((raw / maxPts) * 100)

  const { grade, pd } = gradeFromScore(totalScore)

  const decision: RetailResult['decision'] =
    totalScore >= 60 ? 'Approve' : totalScore >= 38 ? 'Review' : 'Decline'
  const decisionColor =
    decision === 'Approve' ? '#17c082' : decision === 'Review' ? '#f59e0b' : '#e74c3c'

  const base = { dti, ltv, dscr, emi: monthlyEmi, factors, totalScore, grade, pd, decision, decisionColor }
  return { ...base, narrative: buildNarrative(input, base) }
}
