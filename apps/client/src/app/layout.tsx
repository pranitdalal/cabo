import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cabo – Card Game',
  description: 'Play Cabo online with friends',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-felt-dark min-h-screen">{children}</body>
    </html>
  )
}
