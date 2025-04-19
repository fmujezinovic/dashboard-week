"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
import { cn } from "@/lib/utils"

const Sidebar = () => {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const activeClass =
    "bg-primary/10 text-primary font-semibold border-l-4 border-primary"

  return (
    <aside className="w-64 h-screen border-r bg-muted/40 p-4 space-y-2 hidden md:flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>

      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2",
          isActive("/dashboard") && activeClass
        )}
      >
        <Link href="/dashboard">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      </Button>

      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2",
          isActive("/dashboard/zdravniki") && activeClass
        )}
      >
        <Link href="/dashboard/zdravniki">
          <Users className="h-4 w-4" />
          Zdravniki
        </Link>
      </Button>

      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2",
          isActive("/dashboard/oddelki") && activeClass
        )}
      >
        <Link href="/dashboard/oddelki">
          <Home className="h-4 w-4" />
          Oddelki
        </Link>
      </Button>

      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2",
          isActive("/dashboard/delovisca") && activeClass
        )}
      >
        <Link href="/dashboard/delovisca">
          <FolderTree className="h-4 w-4" />
          Delovišča
        </Link>
      </Button>

      <hr className="border-t border-gray-300 my-2" />

      {/* Podkategorije Delovišč */}
      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 pl-8",
          isActive("/dashboard/delovisca/mesecna") && activeClass
        )}
      >
        <Link href="/dashboard/delovisca/mesecna">
          <Calendar className="h-4 w-4" />
          Mesečni razpored
        </Link>
      </Button>

      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 pl-8",
          isActive("/dashboard/delovisca/tedenska") && activeClass
        )}
      >
        <Link href="/dashboard/delovisca/tedenska">
          <Calendar className="h-4 w-4" />
          Tedenski razpored
        </Link>
      </Button>

      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 pl-8",
          isActive("/dashboard/delovisca/dnevna") && activeClass
        )}
      >
        <Link href="/dashboard/delovisca/dnevna">
          <Calendar className="h-4 w-4" />
          Dnevni razpored
        </Link>
      </Button>

      <hr className="border-t border-gray-300 my-2" />

      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2",
          isActive("/dashboard/zamenjave") && activeClass
        )}
      >
        <Link href="/dashboard/zamenjave">
          <RefreshCw className="h-4 w-4" />
          Zamenjave
        </Link>
      </Button>

      <Button
        asChild
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2",
          isActive("/dashboard/analiza") && activeClass
        )}
      >
        <Link href="/dashboard/analiza">
          <BarChart3 className="h-4 w-4" />
          Analiza
        </Link>
      </Button>
    </aside>
  )
}

export default Sidebar
