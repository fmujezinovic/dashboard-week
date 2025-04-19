// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata = {
  title: "Admin Dashboard",
  description: "Zdravstveni admin sistem z Clerk in Supabase",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="sl">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <Toaster position="top-center" richColors />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
