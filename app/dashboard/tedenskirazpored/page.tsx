// app/dashboard/tedenskirazpored/page.tsx
"use client"

import TableTedenskiRazpored from "@/components/tedenski/TableTedenskiRazpored"

export default function TedenskiRazporedPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tedenski razpored</h1>
      <TableTedenskiRazpored />
    </div>
  )
}
