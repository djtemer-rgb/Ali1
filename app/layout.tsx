import './globals.css'
import { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head />
      <body>
        <header className="header">
          <div className="brand">Ali Quest</div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  )
}
