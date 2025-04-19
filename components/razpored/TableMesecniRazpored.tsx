"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { format, getDaysInMonth, getDay } from "date-fns"
import { sl } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { X } from "lucide-react"

// Types

type Oddelek = { id: string; naziv: string }
type Delovisce = { id: string; naziv: string }
type Zdravnik = { id: string; skrajsava: string }
type DnevnaCelica = { datum: string; delovisce_id: string }

export default function TableMesecniRazpored() {
  const supabase = createClient()
  const today = new Date()

  const [leto, setLeto] = useState(today.getFullYear())
  const [mesec, setMesec] = useState(today.getMonth() + 1)
  const [oddelki, setOddelki] = useState<Oddelek[]>([])
  const [selectedOddelek, setSelectedOddelek] = useState("")
  const [delovisca, setDelovisca] = useState<Delovisce[]>([])
  const [zdravniki, setZdravniki] = useState<Zdravnik[]>([])
  const [razpored, setRazpored] = useState<Record<string, Zdravnik[]>>({})
  const [razporedIds, setRazporedIds] = useState<Record<string, string>>({})
  const [openCell, setOpenCell] = useState<DnevnaCelica | null>(null)
  const [search, setSearch] = useState("")

  const daysInMonth = getDaysInMonth(new Date(leto, mesec - 1))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  useEffect(() => {
    supabase.from("oddelki").select("*").then(({ data }) => {
      if (data) setOddelki(data)
    })
  }, [])

  useEffect(() => {
    if (selectedOddelek) {
      supabase
        .from("delovisca_oddelki")
        .select("delovisce(id, naziv)")
        .eq("oddelek_id", selectedOddelek)
        .order("sort_index")
        .then(({ data }) => {
          if (data) setDelovisca(data.map((d: any) => d.delovisce))
        })
    } else {
      supabase.from("delovisca").select("id, naziv").then(({ data }) => {
        if (data) setDelovisca(data)
      })
    }
  }, [selectedOddelek])

  useEffect(() => {
    const fetchZdravniki = async () => {
      let query = supabase.from("zdravniki").select("id, skrajsava")
      if (selectedOddelek) {
        query = query.eq("oddelek_id", selectedOddelek)
      }
      const { data } = await query
      if (data) setZdravniki(data)
    }
    fetchZdravniki()
  }, [selectedOddelek])

  useEffect(() => {
    const start = new Date(leto, mesec - 1, 1).toISOString()
    const end = new Date(leto, mesec, 0).toISOString()

    const filter = selectedOddelek ? { oddelek_id: selectedOddelek } : {}

    supabase
      .from("mesecni_razporedi")
      .select("id, datum, delovisce_id, oddelek_id, mesecni_razporedi_zdravniki(zdravnik_id, zdravniki(id, skrajsava))")
      .gte("datum", start)
      .lte("datum", end)
      .match(filter)
      .then(({ data }) => {
        const r: Record<string, Zdravnik[]> = {}
        const rIds: Record<string, string> = {}
        data?.forEach((entry) => {
          const key = `${entry.datum}_${entry.delovisce_id}`
          rIds[key] = entry.id
          r[key] = entry.mesecni_razporedi_zdravniki.map((z: any) => ({
            id: z.zdravniki.id,
            skrajsava: z.zdravniki.skrajsava,
          }))
        })
        setRazpored(r)
        setRazporedIds(rIds)
      })
  }, [leto, mesec, selectedOddelek])

  const handleAddZdravnik = async (celica: DnevnaCelica, zdravnik: Zdravnik, closeAfter?: boolean) => {
    const key = `${celica.datum}_${celica.delovisce_id}`
    const current = razpored[key] || []
    if (current.find((z) => z.id === zdravnik.id)) return

    let razporedId = razporedIds[key]
    if (!razporedId) {
      const { data, error } = await supabase
        .from("mesecni_razporedi")
        .insert({
          datum: celica.datum,
          delovisce_id: celica.delovisce_id,
          ...(selectedOddelek && { oddelek_id: selectedOddelek }),
        })
        .select()
        .single()
      if (error || !data) return toast.error("Napaka pri ustvarjanju razporeda")
      razporedId = data.id
      setRazporedIds((prev) => ({ ...prev, [key]: razporedId }))
    }

    const { error } = await supabase
      .from("mesecni_razporedi_zdravniki")
      .insert({ razpored_id: razporedId, zdravnik_id: zdravnik.id })

    if (error) return toast.error("Napaka pri dodajanju zdravnika")

    setRazpored((prev) => ({ ...prev, [key]: [...current, zdravnik] }))
    toast.success("Zdravnik dodan")
    setSearch("")
    if (closeAfter) setOpenCell(null)
  }

  const handleRemoveZdravnik = async (celica: DnevnaCelica, zdravnik: Zdravnik) => {
    const key = `${celica.datum}_${celica.delovisce_id}`
    const razporedId = razporedIds[key]
    if (!razporedId) return toast.error("Razpored ni najden")

    const { error } = await supabase
      .from("mesecni_razporedi_zdravniki")
      .delete()
      .eq("razpored_id", razporedId)
      .eq("zdravnik_id", zdravnik.id)

    if (error) return toast.error("Napaka pri odstranitvi zdravnika")

    setRazpored((prev) => {
      const updated = (prev[key] || []).filter((z) => z.id !== zdravnik.id)
      return { ...prev, [key]: updated }
    })
    toast.success("Zdravnik odstranjen")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const filtered = zdravniki.filter((z) =>
      z.skrajsava?.toLowerCase().includes(search.toLowerCase())
    )
    const firstMatch = filtered[0]

    if (e.key === "Tab" && firstMatch && openCell) {
      e.preventDefault()
      handleAddZdravnik(openCell, firstMatch)
    }

    if (e.key === "Enter" && firstMatch && openCell) {
      e.preventDefault()
      handleAddZdravnik(openCell, firstMatch, true)
    }

    if (e.key === "Escape") setOpenCell(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <select value={mesec} onChange={(e) => setMesec(+e.target.value)} className="border px-3 py-2 rounded">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {format(new Date(leto, m - 1, 1), "LLLL", { locale: sl })}
            </option>
          ))}
        </select>
        <select value={leto} onChange={(e) => setLeto(+e.target.value)} className="border px-3 py-2 rounded">
          {[leto - 1, leto, leto + 1].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select value={selectedOddelek} onChange={(e) => setSelectedOddelek(e.target.value)} className="border px-3 py-2 rounded">
          <option value="">Vsi oddelki</option>
          {oddelki.map((o) => (
            <option key={o.id} value={o.id}>
              {o.naziv}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="px-2 py-1 border">Datum</th>
              {delovisca.map((d) => (
                <th key={d.id} className="px-2 py-1 border text-left">
                  {d.naziv}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const date = new Date(leto, mesec - 1, day)
              const dateStr = format(date, "yyyy-MM-dd")
              const isWeekend = [0, 6].includes(getDay(date))
              return (
                <tr key={day} className={isWeekend ? "bg-muted/40" : ""}>
                  <td className="px-2 py-1 border font-medium whitespace-nowrap">
                    {format(date, "d.M.yyyy", { locale: sl })}, {format(date, "EEEE", { locale: sl })}
                  </td>
                  {delovisca.map((d) => {
                    const key = `${dateStr}_${d.id}`
                    const zdravnikiZaCelico = razpored[key] || []
                    return (
                      <td
                        key={d.id}
                        className="px-2 py-1 border hover:bg-muted cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest("svg,button")) return
                          setOpenCell({ datum: dateStr, delovisce_id: d.id })
                        }}
                      >
                        {zdravnikiZaCelico.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {zdravnikiZaCelico.map((z) => (
                              <Badge key={z.id} className="flex items-center gap-1">
                                {z.skrajsava}
                                <X className="w-3 h-3 cursor-pointer" onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveZdravnik({ datum: dateStr, delovisce_id: d.id }, z)
                                }} />
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!openCell} onOpenChange={() => setOpenCell(null)}>
        <DialogContent>
          <DialogTitle>Vnesi skrajšavo zdravnika</DialogTitle>
          <Input
            autoFocus
            placeholder="Išči po skrajšavi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {zdravniki
              .filter((z) => z.skrajsava?.toLowerCase().includes(search.toLowerCase()))
              .map((z) => (
                <Button
                  key={z.id}
                  variant="outline"
                  onClick={() => openCell && handleAddZdravnik(openCell, z)}
                >
                  {z.skrajsava}
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

