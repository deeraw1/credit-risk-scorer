'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { RetailInput, AltmanInput, RetailResult, AltmanResult } from '@/lib/types'

const ScoreGauge = dynamic(() => import('./ScoreGauge'), { ssr: false })

const ACCENT = '#17c082'

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 })

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

function FactorBar({ label, points, max, comment }: { label: string; points: number; max: number; comment: string }) {
  const pct = (points / max) * 100
  const color = pct >= 70 ? '#17c082' : pct >= 40 ? '#f59e0b' : '#e74c3c'
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.84rem', color: 'var(--text)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{points}/{max}</span>
      </div>
      <div style={{ background: 'var(--border2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color,
          borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 4 }}>{comment}</div>
    </div>
  )
}

// ── defaults ──────────────────────────────────────────────────────────────────
const defaultRetail: RetailInput = {
  employmentType: 'salaried', yearsEmployed: 3,
  monthlyIncome: 500_000, monthlyDebt: 50_000,
  loanAmount: 2_000_000, tenureMonths: 24, interestRate: 22,
  collateralValue: 0,
  creditHistory: 'good', priorDefaults: 0,
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
  const [tab,       setTab]       = useState<'retail' | 'corporate'>('retail')
  const [retail,    setRetail]    = useState<RetailInput>(defaultRetail)
  const [altmanIn,  setAltman]    = useState<AltmanInput>(defaultAltman)
  const [result,    setResult]    = useState<RetailResult | AltmanResult | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  function setR<K extends keyof RetailInput>(k: K, v: RetailInput[K]) {
    setRetail(p => ({ ...p, [k]: v })); setResult(null)
  }
  function setA<K extends keyof AltmanInput>(k: K, v: AltmanInput[K]) {
    setAltman(p => ({ ...p, [k]: v })); setResult(null)
  }

  async function handleScore() {
    setLoading(true); setError('')
    try {
      const body = tab === 'retail'
        ? { mode: 'retail',     retail }
        : { mode: 'corporate',  corporate: altmanIn }
      const res  = await fetch('/api/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.result)
      setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }

  const retailResult  = tab === 'retail'    && result ? result as RetailResult  : null
  const altmanResult  = tab === 'corporate' && result ? result as AltmanResult  : null

  const gradeColor = (grade: string) => {
    if (['AAA','AA','A'].includes(grade))     return '#17c082'
    if (['BBB','BB'].includes(grade))         return '#f59e0b'
    return '#e74c3c'
  }

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
            Credit Risk Scorer
          </h1>
          <p style={{ color: '#8adbb8', fontSize: '1rem', maxWidth: 560 }}>
            Basel-aligned scorecard for retail borrowers · Altman Z-Score for corporate entities.
            Instant grade, PD estimate, and risk narrative.
          </p>
          <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Scorecard Model','Altman Z-Score','DTI · LTV · DSCR','Probability of Default','Credit Grade','Risk Narrative'].map(t => (
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
            <div className="section-title">Retail Credit Scorecard</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16, marginBottom: 24 }}>
              <Field label="Employment Type">
                <select style={inputSt} value={retail.employmentType}
                  onChange={e => setR('employmentType', e.target.value as RetailInput['employmentType'])}>
                  <option value="salaried">Salaried</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="contract">Contract</option>
                  <option value="unemployed">Unemployed</option>
                </select>
              </Field>
              <Field label="Years Employed">
                <input style={inputSt} type="number" min="0" value={retail.yearsEmployed}
                  onChange={e => setR('yearsEmployed', +e.target.value)} />
              </Field>
              <Field label="Monthly Income (₦)">
                <input style={inputSt} type="number" min="0" value={retail.monthlyIncome}
                  onChange={e => setR('monthlyIncome', +e.target.value)} />
              </Field>
              <Field label="Existing Monthly Debt (₦)" hint="Rent, other loan repayments, etc.">
                <input style={inputSt} type="number" min="0" value={retail.monthlyDebt}
                  onChange={e => setR('monthlyDebt', +e.target.value)} />
              </Field>
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
              <Field label="Collateral Value (₦)" hint="0 = unsecured loan">
                <input style={inputSt} type="number" min="0" value={retail.collateralValue}
                  onChange={e => setR('collateralValue', +e.target.value)} />
              </Field>
              <Field label="Credit History">
                <select style={inputSt} value={retail.creditHistory}
                  onChange={e => setR('creditHistory', e.target.value as RetailInput['creditHistory'])}>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="none">None / New to credit</option>
                </select>
              </Field>
              <Field label="Prior Defaults">
                <input style={inputSt} type="number" min="0" max="10" value={retail.priorDefaults}
                  onChange={e => setR('priorDefaults', +e.target.value)} />
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
              <strong style={{ color: 'var(--text)' }}>Private firms</strong> — use book value of equity. Toggle below.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16, marginBottom: 24 }}>
              <Field label="Working Capital (₦)">
                <input style={inputSt} type="number" value={altmanIn.workingCapital}
                  onChange={e => setA('workingCapital', +e.target.value)} />
              </Field>
              <Field label="Total Assets (₦)">
                <input style={inputSt} type="number" value={altmanIn.totalAssets}
                  onChange={e => setA('totalAssets', +e.target.value)} />
              </Field>
              <Field label="Retained Earnings (₦)">
                <input style={inputSt} type="number" value={altmanIn.retainedEarnings}
                  onChange={e => setA('retainedEarnings', +e.target.value)} />
              </Field>
              <Field label="EBIT (₦)">
                <input style={inputSt} type="number" value={altmanIn.ebit}
                  onChange={e => setA('ebit', +e.target.value)} />
              </Field>
              <Field label="Market / Book Value of Equity (₦)">
                <input style={inputSt} type="number" value={altmanIn.marketCapEquity}
                  onChange={e => setA('marketCapEquity', +e.target.value)} />
              </Field>
              <Field label="Total Liabilities (₦)">
                <input style={inputSt} type="number" value={altmanIn.totalLiabilities}
                  onChange={e => setA('totalLiabilities', +e.target.value)} />
              </Field>
              <Field label="Revenue / Sales (₦)">
                <input style={inputSt} type="number" value={altmanIn.revenue}
                  onChange={e => setA('revenue', +e.target.value)} />
              </Field>
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
          {loading ? 'Scoring…' : tab === 'retail' ? 'Score Borrower' : 'Run Altman Z-Score'}
        </button>

        {/* ── Retail Results ── */}
        {retailResult && (
          <div id="result">
            <hr />
            <div className="section-label">Results</div>
            <div className="section-title">Credit Assessment</div>

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
                  Est. PD: {retailResult.pd.toFixed(1)}%
                </div>
              </div>

              {/* Key ratios */}
              <div className="card">
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                  Key Ratios
                </div>
                <KV k="Monthly EMI" v={fmt(retailResult.emi)}
                  color={retailResult.emi / retail.monthlyIncome > 0.4 ? '#f87171' : ACCENT} />
                <KV k="Debt-to-Income (DTI)" v={`${retailResult.dti.toFixed(1)}%`}
                  color={retailResult.dti > 40 ? '#f87171' : retailResult.dti > 30 ? '#f59e0b' : ACCENT} />
                <KV k="Debt Service Coverage (DSCR)" v={`${retailResult.dscr.toFixed(2)}x`}
                  color={retailResult.dscr >= 1.5 ? ACCENT : retailResult.dscr >= 1.0 ? '#f59e0b' : '#f87171'} />
                {retail.collateralValue > 0 && (
                  <KV k="Loan-to-Value (LTV)" v={`${retailResult.ltv.toFixed(1)}%`}
                    color={retailResult.ltv <= 70 ? ACCENT : retailResult.ltv <= 85 ? '#f59e0b' : '#f87171'} />
                )}
                <KV k="Total Repayment" v={fmt(retailResult.emi * retail.tenureMonths)} />
                <KV k="Interest Cost" v={fmt(retailResult.emi * retail.tenureMonths - retail.loanAmount)} />
              </div>
            </div>

            {/* Scorecard factors */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 18 }}>
                Scorecard Breakdown
              </div>
              {retailResult.factors.map(f => (
                <FactorBar key={f.factor} label={f.factor}
                  points={f.points} max={f.max} comment={f.comment} />
              ))}
            </div>

            {/* Narrative */}
            <div className="card">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                Risk Narrative
              </div>
              {retailResult.narrative.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0',
                  borderBottom: i < retailResult.narrative.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: ACCENT, fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>
                    {String(i+1).padStart(2,'0')}
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
                { label: 'Z-Score', value: altmanResult.z.toFixed(3), color: altmanResult.zoneColor },
                { label: 'Zone', value: altmanResult.zone, color: altmanResult.zoneColor },
                { label: 'Est. Distress PD', value: `${altmanResult.pd}%`, color: altmanResult.zoneColor },
              ].map(({ label, value, color }) => (
                <div key={label} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: 1, color, marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* X factors */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                Component Ratios
              </div>
              {(['x1','x2','x3','x4','x5'] as const).map((k, i) => {
                const labels = ['X1 — Working Capital / Total Assets',
                  'X2 — Retained Earnings / Total Assets',
                  'X3 — EBIT / Total Assets',
                  'X4 — Equity / Total Liabilities',
                  'X5 — Revenue / Total Assets']
                return <KV key={k} k={labels[i]} v={altmanResult[k].toFixed(4)} />
              })}
            </div>

            {/* Narrative */}
            <div className="card">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                Risk Narrative
              </div>
              {altmanResult.narrative.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0',
                  borderBottom: i < altmanResult.narrative.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ color: ACCENT, fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>
                    {String(i+1).padStart(2,'0')}
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
            Financial Data Analyst · Credit Risk · Quantitative Modelling
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
