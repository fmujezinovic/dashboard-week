"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  startOfMonth,
  endOfMonth,
  getDay,
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

// tipi

type Oddelek = { id: string; naziv: string }
type Delovisce = { id: string; naziv: string }
type Zdravnik = { id: string; skrajsava: string }
type Celica = { datum: string; delovisce_id: string }

export default function TableTedenskiRazpored() {
  const supabase = createClient()
  const today = new Date()

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

  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  useEffect(() => {
    supabase.from("oddelki").select("id, naziv").then(({ data }) => {
      if (data) setOddelki(data)
    })
  }, [])

  useEffect(() => {
    const query = selectedOddelek
      ? supabase
          .from("delovisca_oddelki")
          .select("delovisce(id, naziv), sort_index")
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

  useEffect(() => {
    let query = supabase.from("zdravniki").select("id, skrajsava")
    if (selectedOddelek) {
      query = query.eq("oddelek_id", selectedOddelek)
    }
    query.then(({ data }) => {
      if (data) setZdravniki(data)
    })
  }, [selectedOddelek])

  useEffect(() => {
    const fetchSchedule = async () => {
      const start = new Date(leto, mesec - 1, 1).toISOString()
      const end = new Date(leto, mesec, 0).toISOString()

      let q = supabase
        .from("mesecni_razporedi")
        .select(`id, datum, delovisce_id, oddelek_id,
          mesecni_razporedi_zdravniki!inner(zdravnik_id, zdravniki!inner(id, skrajsava))`)
        .gte("datum", start)
        .lte("datum", end)

      if (selectedOddelek) q = q.eq("oddelek_id", selectedOddelek)

      const { data, error } = await q
      if (error) return

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
      .channel("razporedi")
      .on("postgres_changes", { event: "*", schema: "public", table: "mesecni_razporedi_zdravniki" }, fetchSchedule)
      .subscribe()

    return () => channel.unsubscribe()
  }, [leto, mesec, selectedOddelek])

  const handleAdd = async (cell: Celica, doc: Zdravnik) => {
    const key = `${cell.datum}_${cell.delovisce_id}`
    if (schedule[key]?.some((z) => z.id === doc.id)) return

    let schedId = scheduleIds[key]
    if (!schedId) {
      const { data, error } = await supabase
        .from("mesecni_razporedi")
        .insert({ datum: cell.datum, delovisce_id: cell.delovisce_id, ...(selectedOddelek && { oddelek_id: selectedOddelek }) })
        .select("id")
        .single()
      if (error || !data) return
      schedId = data.id
      setScheduleIds((prev) => ({ ...prev, [key]: schedId }))
    }

    await supabase.from("mesecni_razporedi_zdravniki").insert({ razpored_id: schedId, zdravnik_id: doc.id })
    setSchedule((prev) => ({ ...prev, [key]: [...(prev[key] || []), doc] }))
    setOpenCell(null)
    setSearch("")
  }

  const handleRemove = async (cell: Celica, doc: Zdravnik) => {
    const key = `${cell.datum}_${cell.delovisce_id}`
    const schedId = scheduleIds[key]
    if (!schedId) return

    await supabase.from("mesecni_razporedi_zdravniki").delete().eq("razpored_id", schedId).eq("zdravnik_id", doc.id)
    setSchedule((prev) => ({ ...prev, [key]: prev[key].filter((z) => z.id !== doc.id) }))
  }

  const persistOrder = async (list: Delovisce[]) => {
    for (let i = 0; i < list.length; i++) {
      await supabase
        .from("delovisca_oddelki")
        .update({ sort_index: i })
        .eq("oddelek_id", selectedOddelek)
        .eq("delovisce_id", list[i].id)
    }
    toast.success("Zaporedje shranjeno")
  }

  const onDragStart = (i: number) => { dragItem.current = i }
  const onDragEnter = (i: number) => { dragOverItem.current = i }
  const onDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const updated = [...delovisca]
    const dragged = updated.splice(dragItem.current, 1)[0]
    updated.splice(dragOverItem.current, 0, dragged)
    dragItem.current = null
    dragOverItem.current = null
    setDelovisca(updated)
    persistOrder(updated)
  }

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
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={String(mesec)} onValueChange={(val) => setMesec(Number(val))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Mesec" />
            </SelectTrigger>
            <SelectContent>
              {[...Array(12)].map((_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {format(new Date(2000, i, 1), "LLLL", { locale: sl })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(leto)} onValueChange={(val) => setLeto(Number(val))}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Leto" />
            </SelectTrigger>
            <SelectContent>
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedOddelek} onValueChange={(val) => setSelectedOddelek(val)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Izberi oddelek" />
          </SelectTrigger>
          <SelectContent>
            {oddelki.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.naziv}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tedenski razpored — {format(monthStart, 'LLLL yyyy', { locale: sl })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="teden-1">
            <TabsList>
              {weeks.map((_, i) => <TabsTrigger key={i} value={`teden-${i + 1}`}>Teden {i + 1}</TabsTrigger>)}
            </TabsList>
            {weeks.map((week, idx) => {
              const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
              return (
                <TabsContent key={idx} value={`teden-${idx + 1}`}>
                  <table className="w-full table-fixed text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="w-36 border px-2 py-1 bg-muted">Delovišče</th>
                        {days.map((day, i) => (
                          <th key={i} className="border px-2 py-1 text-center bg-muted font-semibold">
                            {format(day, "EEEE", { locale: sl })}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th className="w-36 border px-2 py-1 bg-muted">Datum</th>
                        {days.map((day, i) => (
                          <th key={i} className="border px-2 py-1 text-center bg-muted">
                            {format(day, "d. M.")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {delovisca.map((dv, i) => (
                        <tr key={dv.id} draggable onDragStart={() => onDragStart(i)} onDragEnter={() => onDragEnter(i)} onDragEnd={onDragEnd} className="cursor-move">
                          <td className="px-2 py-1 border font-medium">{dv.naziv}</td>
                          {days.map(d => {
                            const key = `${format(d, 'yyyy-MM-dd')}_${dv.id}`
                            const docs = schedule[key] || []
                            return (
                              <td key={key} className={`border px-2 py-1 text-center hover:bg-muted cursor-pointer ${[6, 0].includes(getDay(d)) ? 'bg-gray-100' : ''}`} onClick={() => setOpenCell({ datum: format(d, 'yyyy-MM-dd'), delovisce_id: dv.id })}>
                                {docs.length ? docs.map(doc => (
                                  <Badge key={doc.id}>
                                    {doc.skrajsava}
                                    <button onClick={(e) => { e.stopPropagation(); handleRemove({ datum: format(d, 'yyyy-MM-dd'), delovisce_id: dv.id }, doc) }} className="ml-1 text-muted-foreground hover:text-destructive">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                )) : <span className="text-muted-foreground italic">—</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TabsContent>
              )
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!openCell} onOpenChange={() => setOpenCell(null)}>
        <DialogContent>
          <DialogTitle>Izberi zdravnika</DialogTitle>
          <Input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Išči..." />
          <div className="mt-2 flex gap-2 flex-wrap">
            {zdravniki.filter(z => z.skrajsava.toLowerCase().includes(search.toLowerCase())).map(z => (
              <Button key={z.id} variant="outline" onClick={() => openCell && handleAdd(openCell, z)}>
                {z.skrajsava}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
