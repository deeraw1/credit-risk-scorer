import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Credit Risk Scorer',
  description: 'Basel-aligned scorecard model for retail borrowers + Altman Z-Score for corporates',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
