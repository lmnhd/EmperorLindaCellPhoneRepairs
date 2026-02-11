import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EmperorLinda Cell Phone Repairs',
  description: 'Professional cell phone repair service powered by AI - Book appointments, get instant quotes, and fast turnaround.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-emperor-black text-emperor-cream">
        {children}
      </body>
    </html>
  )
}
