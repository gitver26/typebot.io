import type { Metadata } from 'next'
import { VT323 } from 'next/font/google'
import './globals.css'

const vt323 = VT323({
    subsets: ['latin'],
    weight: ['400'],
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'Chatbot Builder',
    description: 'Build functional chatbots with AI assistance',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={vt323.className}>
            <body>
                <div className="retro-grid" />
                <div className="crt-overlay" />
                {children}
            </body>
        </html>
    )
}
