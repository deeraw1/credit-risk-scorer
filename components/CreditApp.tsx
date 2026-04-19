'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { RetailInput, AltmanInput, RetailResult, AltmanResult } from '@/lib/types'
import { altman } from '@/lib/altman'

const ScoreGauge = dynamic(() => import('./ScoreGauge'), { ssr: false })

const ACCENT = '#17c082'
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://credit-risk-api.onrender.com'

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n: number) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })
const fmtN = (n: number) => n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

function emi(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months
  const r = annualRate / 100 / 12
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

function gradeFromPD(pd: number): string {
  if (pd < 3)  return 'AAA'
  if (pd < 7)  return 'AA'
  if (pd < 12) return 'A'
  if (pd < 20) return 'BBB'
  if (pd < 35) return 'BB'
  if (pd < 50) return 'B'
  return 'D'
}

function gradeColor(grade: string): string {
  if (['AAA','AA','A'].includes(grade)) return '#17c082'
  if (['BBB','BB'].includes(grade))     return '#f59e0b'
  return '#e74c3c'
}

function decisionColor(d: string): string {
  if (d === 'Approve') return '#17c082'
  if (d === 'Review')  return '#f59e0b'
  return '#e74c3c'
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label className="field-label">{label}</label>
      {children}
      {hint && <div style={{ fontSize: '0.7rem', color: 'var(--faint)', marginTop: 2 }}>{hint}</div>}
    </div>
  )
}

function KV({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0',
      borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--muted)', fontSize: '0.86rem' }}>{k}</span>
      <span style={{ fontWeight: 600, color: color ?? 'var(--text)', fontSize: '0.9rem' }}>{v}</span>
    </div>
  )
}

// ── defaults ──────────────────────────────────────────────────────────────────
const defaultRetail: RetailInput = {
  age: 32, maritalStatus: 'Single', education: 'Bachelor',
  employmentType: 'Full-time', yearsEmployed: 3,
  annualIncome: 6_000_000, monthlyDebt: 50_000,
  loanAmount: 2_000_000, tenureMonths: 24, interestRate: 22,
  creditScore: 680, numCreditLines: 3,
  loanPurpose: 'Business', hasMortgage: false, hasDependents: false, hasCoSigner: false,
}

const defaultAltman: AltmanInput = {
  workingCapital: 0, totalAssets: 0, retainedEarnings: 0,
  ebit: 0, marketCapEquity: 0, totalLiabilities: 0,
  revenue: 0, listed: false,
}

const inputSt: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border2)',
  borderRadius: 8, color: 'var(--text)', padding: '9px 12px',
  fontSize: '0.9rem', width: '100%', outline: 'none',
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function CreditApp() {
  const [tab,      setTab]      = useState<'retail' | 'corporate'>('retail')
  const [retail,   setRetail]   = useState<RetailInput>(defaultRetail)
  const [altmanIn, setAltman]   = useState<AltmanInput>(defaultAltman)
  const [result,   setResult]   = useState<RetailResult | AltmanResult | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  function setR<K extends keyof RetailInput>(k: K, v: RetailInput[K]) {
    setRetail(p => ({ ...p, [k]: v })); setResult(null)
  }
  function setA<K extends keyof AltmanInput>(k: K, v: AltmanInput[K]) {
    setAltman(p => ({ ...p, [k]: v })); setResult(null)
  }

  async function handleScore() {
    setLoading(true); setError('')
    try {
      if (tab === 'corporate') {
        setResult(altman(altmanIn))
        setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }), 100)
        return
      }

      // Retail — call real ML API
      const monthlyEmi = emi(retail.loanAmount, retail.interestRate, retail.tenureMonths)
      const totalDebt  = retail.monthlyDebt + monthlyEmi
      const monthlyInc = retail.annualIncome / 12
      const dtiRatio   = monthlyInc > 0 ? (totalDebt / monthlyInc) : 0.5

      const payload = {
        Age:            retail.age,
        Income:         retail.annualIncome,
        LoanAmount:     retail.loanAmount,
        CreditScore:    retail.creditScore,
        MonthsEmployed: retail.yearsEmployed * 12,
        NumCreditLines: retail.numCreditLines,
        InterestRate:   retail.interestRate,
        LoanTerm:       retail.tenureMonths,
        DTIRatio:       Math.min(dtiRatio, 1),
        Education:      retail.education,
        EmploymentType: retail.employmentType,
        MaritalStatus:  retail.maritalStatus,
        HasMortgage:    retail.hasMortgage ? 1 : 0,
        HasDependents:  retail.hasDependents ? 1 : 0,
        LoanPurpose:    retail.loanPurpose,
        HasCoSigner:    retail.hasCoSigner ? 1 : 0,
      }

      const res  = await fetch(`${API_BASE}/predict`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'API error')
      }
      const ml = await res.json()

      const pd    = ml.default_probability * 100
      const grade = gradeFromPD(pd)
      const dColor = decisionColor(ml.decision)
      const dscr  = totalDebt > 0 ? monthlyInc / totalDebt : 0
      const ltv   = retail.hasMortgage ? (retail.loanAmount / retail.annualIncome) * 100 : 0

      const narrative = [
        `ML model (trained on 255,000+ loan records) estimates a ${pd.toFixed(1)}% probability of default.`,
        `Annual income of ${fmt(retail.annualIncome)} with a monthly debt obligation of ${fmt(Math.round(totalDebt))}.`,
        `DTI of ${(dtiRatio * 100).toFixed(1)}% — ${dtiRatio <= 0.35 ? 'within acceptable threshold' : 'above recommended 35% threshold'}.`,
        `Debt service coverage of ${dscr.toFixed(2)}x — income ${dscr >= 1.2 ? 'adequately covers' : 'insufficient for'} obligations.`,
        `Credit score of ${retail.creditScore} — ${retail.creditScore >= 700 ? 'strong credit profile' : retail.creditScore >= 600 ? 'moderate credit profile' : 'weak credit profile'}.`,
        `Employment: ${retail.employmentType}, ${retail.yearsEmployed} year(s) tenure. Education: ${retail.education}.`,
        `Decision: ${ml.decision}. Risk tier: ${ml.riskLevel}. Grade: ${grade}.`,
      ]

      setResult({
        defaultProbability: ml.default_probability,
        decision: ml.decision,
        riskLevel: ml.riskLevel,
        dti: dtiRatio * 100,
        dscr, emi: monthlyEmi, ltv,
        grade, totalScore: Math.round((1 - ml.default_probability) * 100),
        decisionColor: dColor, narrative,
      })
      setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }

  const retailResult = tab === 'retail'    && result ? result as RetailResult  : null
  const altmanResult = tab === 'corporate' && result ? result as AltmanResult  : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 1020, margin: '0 auto' }}>

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg,#061a12 0%,#0a2e1e 55%,#0e4a2e 100%)',
          borderRadius: 16, padding: '48px 52px', marginBottom: 36, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: 40, top: -10, fontSize: 180,
            opacity: 0.05, color: '#fff', lineHeight: 1, userSelect: 'none' }}>◆</div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            Credit Default Risk Model
          </h1>
          <p style={{ color: '#8adbb8', fontSize: '1rem', maxWidth: 560 }}>
            ML-powered default prediction for retail borrowers · Altman Z-Score for corporate entities.
            Trained on 255,000+ real loan records — instant PD estimate, grade, and risk narrative.
          </p>
          <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['XGBoost Model','255k Training Records','Probability of Default','Credit Grade','DTI · DSCR','Altman Z-Score'].map(t => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          <button className={`tab ${tab === 'retail' ? 'active' : ''}`}
            onClick={() => { setTab('retail'); setResult(null) }}>
            Retail / Individual
          </button>
          <button className={`tab ${tab === 'corporate' ? 'active' : ''}`}
            onClick={() => { setTab('corporate'); setResult(null) }}>
            Corporate (Altman Z-Score)
          </button>
        </div>

        {/* ── Retail Form ── */}
        {tab === 'retail' && (
          <>
            <div className="section-label">Borrower Profile</div>
            <div className="section-title">ML Credit Assessment</div>

            {/* Personal */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 }}>
              Personal Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 20 }}>
              <Field label="Age">
                <input style={inputSt} type="number" min="18" max="80" value={retail.age}
                  onChange={e => setR('age', +e.target.value)} />
              </Field>
              <Field label="Marital Status">
                <select style={inputSt} value={retail.maritalStatus}
                  onChange={e => setR('maritalStatus', e.target.value as RetailInput['maritalStatus'])}>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </Field>
              <Field label="Education">
                <select style={inputSt} value={retail.education}
                  onChange={e => setR('education', e.target.value as RetailInput['education'])}>
                  <option value="HighSchool">High School</option>
                  <option value="Bachelor">Bachelor's</option>
                  <option value="Master">Master's</option>
                  <option value="PhD">PhD</option>
                </select>
              </Field>
              <Field label="Has Dependents">
                <select style={inputSt} value={retail.hasDependents ? 'yes' : 'no'}
                  onChange={e => setR('hasDependents', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
            </div>

            {/* Employment */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Employment
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 20 }}>
              <Field label="Employment Type">
                <select style={inputSt} value={retail.employmentType}
                  onChange={e => setR('employmentType', e.target.value as RetailInput['employmentType'])}>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Self-employed">Self-Employed</option>
                  <option value="Unemployed">Unemployed</option>
                </select>
              </Field>
              <Field label="Years Employed">
                <input style={inputSt} type="number" min="0" value={retail.yearsEmployed}
                  onChange={e => setR('yearsEmployed', +e.target.value)} />
              </Field>
              <Field label="Annual Income (₦)">
                <input style={inputSt} type="number" min="0" value={retail.annualIncome}
                  onChange={e => setR('annualIncome', +e.target.value)} />
              </Field>
              <Field label="Existing Monthly Debt (₦)" hint="Rent, loan repayments, etc.">
                <input style={inputSt} type="number" min="0" value={retail.monthlyDebt}
                  onChange={e => setR('monthlyDebt', +e.target.value)} />
              </Field>
            </div>

            {/* Loan Details */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Loan Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 20 }}>
              <Field label="Loan Amount (₦)">
                <input style={inputSt} type="number" min="0" value={retail.loanAmount}
                  onChange={e => setR('loanAmount', +e.target.value)} />
              </Field>
              <Field label="Tenure (months)">
                <input style={inputSt} type="number" min="1" value={retail.tenureMonths}
                  onChange={e => setR('tenureMonths', +e.target.value)} />
              </Field>
              <Field label="Interest Rate (% p.a.)">
                <input style={inputSt} type="number" min="0" step="0.1" value={retail.interestRate}
                  onChange={e => setR('interestRate', +e.target.value)} />
              </Field>
              <Field label="Loan Purpose">
                <select style={inputSt} value={retail.loanPurpose}
                  onChange={e => setR('loanPurpose', e.target.value as RetailInput['loanPurpose'])}>
                  <option value="Home">Home</option>
                  <option value="Auto">Auto</option>
                  <option value="Education">Education</option>
                  <option value="Business">Business</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Has Co-Signer">
                <select style={inputSt} value={retail.hasCoSigner ? 'yes' : 'no'}
                  onChange={e => setR('hasCoSigner', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <Field label="Has Mortgage">
                <select style={inputSt} value={retail.hasMortgage ? 'yes' : 'no'}
                  onChange={e => setR('hasMortgage', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
            </div>

            {/* Credit Profile */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Credit Profile
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
              <Field label="Credit Score" hint="300 – 850">
                <input style={inputSt} type="number" min="300" max="850" value={retail.creditScore}
                  onChange={e => setR('creditScore', +e.target.value)} />
              </Field>
              <Field label="Number of Credit Lines">
                <input style={inputSt} type="number" min="0" value={retail.numCreditLines}
                  onChange={e => setR('numCreditLines', +e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {/* ── Altman Form ── */}
        {tab === 'corporate' && (
          <>
            <div className="section-label">Company Financials</div>
            <div className="section-title">Altman Z-Score — Corporate Distress Model</div>

            <div style={{ marginBottom: 16, padding: '11px 16px', background: 'rgba(23,192,130,0.06)',
              border: '1px solid rgba(23,192,130,0.15)', borderRadius: 8,
              color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.8 }}>
              <strong style={{ color: 'var(--text)' }}>Public firms</strong> — use market cap for equity.{' '}
              <strong style={{ color: 'var(--text)' }}>Private firms</strong> — use book value of equity.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16, marginBottom: 24 }}>
              {([
                ['Working Capital (₦)',            'workingCapital'],
                ['Total Assets (₦)',               'totalAssets'],
                ['Retained Earnings (₦)',          'retainedEarnings'],
                ['EBIT (₦)',                       'ebit'],
                ['Market / Book Value of Equity (₦)', 'marketCapEquity'],
                ['Total Liabilities (₦)',          'totalLiabilities'],
                ['Revenue / Sales (₦)',            'revenue'],
              ] as [string, keyof AltmanInput][]).map(([label, key]) => (
                <Field key={key} label={label}>
                  <input style={inputSt} type="number"
                    value={altmanIn[key] as number}
                    onChange={e => setA(key, +e.target.value as AltmanInput[typeof key])} />
                </Field>
              ))}
              <Field label="Company Type">
                <select style={inputSt} value={altmanIn.listed ? 'listed' : 'private'}
                  onChange={e => setA('listed', e.target.value === 'listed')}>
                  <option value="listed">Listed / Public</option>
                  <option value="private">Private / Unlisted</option>
                </select>
              </Field>
            </div>
          </>
        )}

        {error && (
          <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)',
            borderRadius: 8, padding: '11px 16px', color: '#f87171',
            fontSize: '0.85rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button className="btn-primary" onClick={handleScore} disabled={loading}>
          {loading ? 'Scoring…' : tab === 'retail' ? 'Run ML Credit Assessment' : 'Run Altman Z-Score'}
        </button>

        {/* ── Retail Results ── */}
        {retailResult && (
          <div id="result">
            <hr />
            <div className="section-label">Results</div>
            <div className="section-title">ML Credit Assessment</div>

            {/* ML badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(23,192,130,0.08)', border: '1px solid rgba(23,192,130,0.2)',
              borderRadius: 6, padding: '4px 12px', marginBottom: 20,
              fontSize: '0.75rem', fontWeight: 700, color: ACCENT, letterSpacing: 0.5 }}>
              ◆ XGBoost ML Model · 255,000+ training records
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginBottom: 24 }}>
              {/* Gauge */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Credit Score
                </div>
                <ScoreGauge score={retailResult.totalScore} grade={retailResult.grade}
                  color={gradeColor(retailResult.grade)} />
                <div style={{
                  marginTop: 8, padding: '8px 20px', borderRadius: 8, fontWeight: 700,
                  fontSize: '1rem', background: `${retailResult.decisionColor}18`,
                  border: `1px solid ${retailResult.decisionColor}44`,
                  color: retailResult.decisionColor,
                }}>
                  {retailResult.decision}
                </div>
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Default PD: {(retailResult.defaultProbability * 100).toFixed(1)}%
                </div>
                <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--faint)' }}>
                  Risk: {retailResult.riskLevel}
                </div>
              </div>

              {/* Key ratios */}
              <div className="card">
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                  Key Ratios
                </div>
                <KV k="Monthly EMI" v={fmt(Math.round(retailResult.emi))}
                  color={retailResult.emi / (retail.annualIncome / 12) > 0.4 ? '#f87171' : ACCENT} />
                <KV k="Debt-to-Income (DTI)" v={`${retailResult.dti.toFixed(1)}%`}
                  color={retailResult.dti > 40 ? '#f87171' : retailResult.dti > 30 ? '#f59e0b' : ACCENT} />
                <KV k="Debt Service Coverage (DSCR)" v={`${retailResult.dscr.toFixed(2)}x`}
                  color={retailResult.dscr >= 1.5 ? ACCENT : retailResult.dscr >= 1.0 ? '#f59e0b' : '#f87171'} />
                <KV k="Credit Score" v={fmtN(retail.creditScore)}
                  color={retail.creditScore >= 700 ? ACCENT : retail.creditScore >= 600 ? '#f59e0b' : '#f87171'} />
                <KV k="Total Repayment" v={fmt(Math.round(retailResult.emi * retail.tenureMonths))} />
                <KV k="Interest Cost" v={fmt(Math.round(retailResult.emi * retail.tenureMonths - retail.loanAmount))} />
              </div>
            </div>

            {/* Narrative */}
            <div className="card">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                Risk Narrative
              </div>
              {retailResult.narrative.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0',
                  borderBottom: i < retailResult.narrative.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: ACCENT, fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.86rem', lineHeight: 1.6 }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Altman Results ── */}
        {altmanResult && (
          <div id="result">
            <hr />
            <div className="section-label">Results</div>
            <div className="section-title">Altman Z-Score Assessment</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Z-Score',          value: altmanResult.z.toFixed(3),  color: altmanResult.zoneColor },
                { label: 'Zone',             value: altmanResult.zone,           color: altmanResult.zoneColor },
                { label: 'Est. Distress PD', value: `${altmanResult.pd}%`,      color: altmanResult.zoneColor },
              ].map(({ label, value, color }) => (
                <div key={label} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: 1, color, marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                Component Ratios
              </div>
              {(['x1','x2','x3','x4','x5'] as const).map((k, i) => {
                const labels = [
                  'X1 — Working Capital / Total Assets',
                  'X2 — Retained Earnings / Total Assets',
                  'X3 — EBIT / Total Assets',
                  'X4 — Equity / Total Liabilities',
                  'X5 — Revenue / Total Assets',
                ]
                return <KV key={k} k={labels[i]} v={altmanResult[k].toFixed(4)} />
              })}
            </div>

            <div className="card">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                Risk Narrative
              </div>
              {altmanResult.narrative.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0',
                  borderBottom: i < altmanResult.narrative.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: ACCENT, fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.86rem', lineHeight: 1.6 }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 56, paddingTop: 28, borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ color: 'var(--faint)', fontSize: '0.82rem', lineHeight: 1.8 }}>
            <span style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '0.85rem' }}>
              Muhammed Adediran
            </span><br/>
            Quantitative AI Engineer · Credit Risk · Financial Data Scientist
          </div>
          <a href="https://adediran.xyz/contact" target="_blank" rel="noreferrer"
            style={{ color: ACCENT, fontWeight: 600, fontSize: '0.85rem',
              border: '1px solid rgba(23,192,130,0.25)', borderRadius: 8,
              padding: '9px 20px', textDecoration: 'none' }}>
            Get in touch
          </a>
        </div>

      </div>
    </div>
  )
}
