'use client'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'

interface Props { score: number; grade: string; color: string }

export default function ScoreGauge({ score, grade, color }: Props) {
  const data = [
    { value: 100, fill: 'rgba(255,255,255,0.04)' },
    { value: score, fill: color },
  ]
  return (
    <div style={{ position: 'relative', width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="60%" innerRadius="65%" outerRadius="90%"
          startAngle={180} endAngle={0} data={data} barSize={16}>
          <RadialBar dataKey="value" cornerRadius={8} background={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>/ 100</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>{grade}</div>
      </div>
    </div>
  )
}
