"use client"

import Link from "next/link"
import {
  BarChart3,
  Calendar,
  Home,
  LayoutDashboard,
  RefreshCw,
  Users,
  FolderTree,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const Sidebar = () => {
  return (
    <aside className="w-64 h-screen border-r bg-muted/40 p-4 space-y-2 hidden md:flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>

      <Button asChild variant="ghost" className="w-full justify-start gap-2">
        <Link href="/dashboard">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      </Button>

      <Button asChild variant="ghost" className="w-full justify-start gap-2">
        <Link href="/dashboard/zdravniki">
          <Users className="h-4 w-4" />
          Zdravniki
        </Link>
      </Button>

      <Button asChild variant="ghost" className="w-full justify-start gap-2">
        <Link href="/dashboard/oddelki">
          <Home className="h-4 w-4" />
          Oddelki
        </Link>
      </Button>

      {/* Klikabilni link za Delovišča */}
      <Button asChild variant="ghost" className="w-full justify-start gap-2">
        <Link href="/dashboard/delovisca">
          <FolderTree className="h-4 w-4" />
          Delovišča
        </Link>
          </Button>

         {/* Separator */}
          
          <hr className="border-t border-gray-300 my-2" />

      {/* Podkategorije */}
      <Button asChild variant="ghost" className="w-full justify-start gap-2 pl-8">
        <Link href="/dashboard/delovisca/mesecna">
          <Calendar className="h-4 w-4" />
          Mesečni razpored
        </Link>
      </Button>

      <Button asChild variant="ghost" className="w-full justify-start gap-2 pl-8">
        <Link href="/dashboard/delovisca/tedenska">
          <Calendar className="h-4 w-4" />
          Tedenski razpored
        </Link>
      </Button>

      <Button asChild variant="ghost" className="w-full justify-start gap-2 pl-8">
        <Link href="/dashboard/delovisca/dnevna">
          <Calendar className="h-4 w-4" />
          Dnevni razpored
        </Link>
          </Button>
          
            {/* Separator */}
          
          <hr className="border-t border-gray-300 my-2" />

      <Button asChild variant="ghost" className="w-full justify-start gap-2">
        <Link href="/dashboard/zamenjave">
          <RefreshCw className="h-4 w-4" />
          Zamenjave
        </Link>
      </Button>

      <Button asChild variant="ghost" className="w-full justify-start gap-2">
        <Link href="/dashboard/analiza">
          <BarChart3 className="h-4 w-4" />
          Analiza
        </Link>
      </Button>
    </aside>
  )
}

export default Sidebar
