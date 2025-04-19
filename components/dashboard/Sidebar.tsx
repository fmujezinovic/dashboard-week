// components/Sidebar.tsx
"use client"
import Link from "next/link"


import {
  BarChart3,
  Calendar,
  ClipboardList,
  Home,
  LayoutDashboard,
  RefreshCw,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const Sidebar = () => {
  return (
    <aside className="w-64 h-screen border-r bg-muted/40 p-4 space-y-2 hidden md:flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>

      <Button variant="ghost" className="w-full justify-start gap-2">
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Button>
      <Button asChild variant="ghost" className="w-full justify-start gap-2">
  <Link href="/dashboard/zdravniki">
    <Users className="h-4 w-4" />
    Zdravniki
  </Link>
</Button>

      <Button variant="ghost" className="w-full justify-start gap-2">
        <Home className="h-4 w-4" />
        Oddelki
      </Button>
      <Button variant="ghost" className="w-full justify-start gap-2">
        <Calendar className="h-4 w-4" />
        Delovišča - Dnevna
      </Button>
      <Button variant="ghost" className="w-full justify-start gap-2">
        <Calendar className="h-4 w-4" />
        Delovišča - Tedenska
      </Button>
      <Button variant="ghost" className="w-full justify-start gap-2">
        <Calendar className="h-4 w-4" />
        Delovišča - Mesečna
      </Button>
      <Button variant="ghost" className="w-full justify-start gap-2">
        <RefreshCw className="h-4 w-4" />
        Zamenjave
      </Button>
      <Button variant="ghost" className="w-full justify-start gap-2">
        <BarChart3 className="h-4 w-4" />
        Analiza
      </Button>
    </aside>
  )
}

export default Sidebar
