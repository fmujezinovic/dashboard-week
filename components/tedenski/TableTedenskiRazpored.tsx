// components/tedenski/TableTedenskiRazpored.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  getDay,
  startOfMonth,
  endOfMonth,
} from "date-fns"
import { sl } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { X } from "lucide-react"

// Types

type Oddelek = { id: string; naziv: string }

type Delovisce = { id: string; naziv: string }

type Zdravnik = { id: string; skrajsava: string }

type Celica = { datum: string; delovisce_id: string }

export default function TableTedenskiRazpored() {
  const supabase = createClient()
  const today = new Date()

  // State
  const [leto, setLeto] = useState(today.getFullYear())
  const [mesec, setMesec] = useState(today.getMonth() + 1)
  const [selectedOddelek, setSelectedOddelek] = useState<string>("")
  const [oddelki, setOddelki] = useState<Oddelek[]>([])
  const [delovisca, setDelovisca] = useState<Delovisce[]>([])
  const [zdravniki, setZdravniki] = useState<Zdravnik[]>([])
  const [schedule, setSchedule] = useState<Record<string, Zdravnik[]>>({})
  const [scheduleIds, setScheduleIds] = useState<Record<string, string>>({})
  const [openCell, setOpenCell] = useState<Celica | null>(null)
  const [search, setSearch] = useState<string>("")

  // Load departments
  useEffect(() => {
    supabase.from("oddelki").select("id, naziv").then(({ data }) => {
      if (data) setOddelki(data)
    })
  }, [])

  // Load workstations
  useEffect(() => {
    const query = selectedOddelek
      ? supabase
          .from("delovisca_oddelki")
          .select("delovisce(id, naziv)")
          .eq("oddelek_id", selectedOddelek)
          .order("sort_index")
      : supabase.from("delovisca").select("id, naziv")

    query.then(({ data }) => {
      if (data) {
        if (selectedOddelek) {
          setDelovisca((data as any[]).map((r) => r.delovisce))
        } else {
          setDelovisca(data as Delovisce[])
        }
      }
    })
  }, [selectedOddelek])

  // Load doctors
  useEffect(() => {
    let query = supabase.from("zdravniki").select("id, skrajsava")
    if (selectedOddelek) {
      query = query.eq("oddelek_id", selectedOddelek)
    }
    query.then(({ data }) => {
      if (data) setZdravniki(data)
    })
  }, [selectedOddelek])

  // Fetch schedule with correct filtering
  useEffect(() => {
    const fetchSchedule = async () => {
      const start = new Date(leto, mesec - 1, 1).toISOString()
      const end = new Date(leto, mesec, 0).toISOString()

      // Query main table and inner join to doctors
      let q = supabase
        .from("mesecni_razporedi")
        .select(
          `id, datum, delovisce_id, oddelek_id,
           mesecni_razporedi_zdravniki!inner(zdravnik_id, zdravniki!inner(id, skrajsava))`
        )
        .gte("datum", start)
        .lte("datum", end)
      if (selectedOddelek) {
        q = q.eq("oddelek_id", selectedOddelek)
      }

      const { data, error } = await q
      if (error) {
        console.error(error)
        return
      }

      const map: Record<string, Zdravnik[]> = {}
      const ids: Record<string, string> = {}

      data.forEach((entry: any) => {
        const { id, datum, delovisce_id, mesecni_razporedi_zdravniki } = entry
        const key = `${datum}_${delovisce_id}`
        ids[key] = id
        map[key] = mesecni_razporedi_zdravniki.map((d: any) => ({
          id: d.zdravnik_id,
          skrajsava: d.zdravniki.skrajsava,
        }))
      })

      setSchedule(map)
      setScheduleIds(ids)
    }

    fetchSchedule()
    const channel = supabase
      .channel('razporedi')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesecni_razporedi_zdravniki' },
        fetchSchedule
      )
      .subscribe()
    return () => {
      channel.unsubscribe()
    }
  }, [leto, mesec, selectedOddelek])

  // Handlers
  const handleAdd = async (cell: Celica, doc: Zdravnik) => {
    const key = `${cell.datum}_${cell.delovisce_id}`
    if (schedule[key]?.some((z) => z.id === doc.id)) return

    let schedId = scheduleIds[key]
    if (!schedId) {
      const { data, error } = await supabase
        .from("mesecni_razporedi")
        .insert({
          datum: cell.datum,
          delovisce_id: cell.delovisce_id,
          ...(selectedOddelek && { oddelek_id: selectedOddelek }),
        })
        .select('id')
        .single()
      if (error || !data) {
        toast.error("Napaka pri ustvarjanju razporeda")
        return
      }
      schedId = data.id
      setScheduleIds((prev) => ({ ...prev, [key]: schedId }))
    }

    const { error } = await supabase
      .from("mesecni_razporedi_zdravniki")
      .insert({ razpored_id: schedId, zdravnik_id: doc.id })
    if (error) {
      toast.error("Napaka pri dodajanju zdravnika")
      return
    }

    setSchedule((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), doc],
    }))
    toast.success("Zdravnik dodan")
    setOpenCell(null)
    setSearch("")
  }

  const handleRemove = async (cell: Celica, doc: Zdravnik) => {
    const key = `${cell.datum}_${cell.delovisce_id}`
    const schedId = scheduleIds[key]
    if (!schedId) return

    await supabase
      .from("mesecni_razporedi_zdravniki")
      .delete()
      .eq("razpored_id", schedId)
      .eq("zdravnik_id", doc.id)

    setSchedule((prev) => ({
      ...prev,
      [key]: prev[key].filter((z) => z.id !== doc.id),
    }))
    toast.success("Zdravnik odstranjen")
  }

  // Date calculations
  const monthStart = startOfMonth(new Date(leto, mesec - 1))
  const monthEnd = endOfMonth(monthStart)
  const firstWeek = startOfWeek(monthStart, { weekStartsOn: 1 })
  const lastWeek = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const weeks: Date[] = []
  let cur = firstWeek
  while (cur <= lastWeek) {
    weeks.push(cur)
    cur = addDays(cur, 7)
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <select
          value={mesec}
          onChange={(e) => setMesec(+e.target.value)}
          className="border px-3 py-2 rounded"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {format(
                new Date(leto, m - 1, 1),
                'LLLL',
                { locale: sl }
              )}
            </option>
          ))}
        </select>
        <select
          value={leto}
          onChange={(e) => setLeto(+e.target.value)}
          className="border px-3 py-2 rounded"
        >
          {[leto - 1, leto, leto + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={selectedOddelek}
          onChange={(e) => setSelectedOddelek(e.target.value)}
          className="border px-3 py-2 rounded ml-auto"
        >
          <option value="">Vsi oddelki</option>
          {oddelki.map((o) => (
            <option key={o.id} value={o.id}>
              {o.naziv}
            </option>
          ))}
        </select>
      </div>

      {/* Schedule Card */}
      <Card>
        <CardHeader>
          <CardTitle>{`Tedenski razpored — ${format(
            monthStart,
            'LLLL yyyy',
            { locale: sl }
          )}`}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="teden-1">
            <TabsList>
              {weeks.map((_, idx) => (
                <TabsTrigger key={idx} value={`teden-${idx + 1}`}>Teden {idx + 1}</TabsTrigger>
              ))}
            </TabsList>
            {weeks.map((weekStart, idx) => {
              const days = Array.from({ length: 7 }, (_, d) => addDays(weekStart, d))
              const cols = days.length + 1
              return (
                <TabsContent key={idx} value={`teden-${idx + 1}`}>  
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full table-fixed text-sm border-collapse">
                      <colgroup>
                        {Array.from({ length: cols }, (_, ci) => (
                          <col key={ci} style={{ width: `${100 / cols}%` }} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-2 py-1 border">Delovišče</th>
                          {days.map((d) => {
                            const wd = getDay(d)
                            const isWeekend = wd === 0 || wd === 6
                            return (
                              <th
                                key={d.toISOString()}
                                className={`px-2 py-1 border text-center ${isWeekend ? 'bg-muted/40' : ''}`}
                              >
                                {format(d, 'EEEE', { locale: sl })}
                              </th>
                            )
                          })}
                        </tr>
                        <tr>
                          <th className="px-2 py-1 border"></th>
                          {days.map((d) => {
                            const inMonth = d >= monthStart && d <= monthEnd
                            return (
                              <th key={d.toISOString()} className="px-2 py-1 border text-center">
                                {inMonth ? format(d, 'd.M.yyyy', { locale: sl }) : ''}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {delovisca.map((dv) => (
                          <tr key={dv.id}>
                            <td className="px-2 py-1 border font-medium whitespace-nowrap">{dv.naziv}</td>
                            {days.map((d) => {
                              const dateStr = format(d, 'yyyy-MM-dd')
                              const key = `${dateStr}_${dv.id}`
                              const docs = schedule[key] || []
                              const wd = getDay(d)
                              const isWeekend = wd === 0 || wd === 6
                              return (
                                <td
                                  key={key}
                                  className={`px-2 py-1 border text-center hover:bg-muted cursor-pointer ${
                                    isWeekend ? 'bg-muted/40' : ''
                                  }`}
                                  onClick={() => setOpenCell({ datum: dateStr, delovisce_id: dv.id })}
                                >
                                  {docs.length > 0 ? (
                                    docs.map((z) => (
                                      <Badge key={z.id} className="mx-0.5">
                                        {z.skrajsava}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleRemove({ datum: dateStr, delovisce_id: dv.id }, z); }}
                                          className="ml-1 text-muted-foreground hover:text-destructive"
                                          type="button"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog for adding doctors */}
      <Dialog open={!!openCell} onOpenChange={() => setOpenCell(null)}>
        <DialogContent>
          <DialogTitle>Izberi zdravnika</DialogTitle>
          <Input
            autoFocus
            placeholder="Išči skrajšavo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-2 flex gap-2 flex-wrap">
            {zdravniki
              .filter((z) => z.skrajsava.toLowerCase().includes(search.toLowerCase()))
              .map((z) => (
                <Button
                  key={z.id}
                  variant="outline"
                  onClick={() => openCell && handleAdd(openCell, z)}
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
