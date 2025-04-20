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

  const [leto, setLeto] = useState(today.getFullYear())
  const [mesec, setMesec] = useState(today.getMonth() + 1)
  const [oddelki, setOddelki] = useState<Oddelek[]>([])
  const [selectedOddelek, setSelectedOddelek] = useState("")
  const [delovisca, setDelovisca] = useState<Delovisce[]>([])

  // Data
  const [razpored, setRazpored] = useState<Record<string, Zdravnik[]>>({})
  const [razporedIds, setRazporedIds] = useState<Record<string, string>>({})
  const [zdravniki, setZdravniki] = useState<Zdravnik[]>([])

  // Dialog
  const [openCell, setOpenCell] = useState<Celica | null>(null)
  const [search, setSearch] = useState("")

  // Load oddelki
  useEffect(() => {
    supabase.from("oddelki").select("id, naziv").then(({ data }) => data && setOddelki(data))
  }, [])

  // Load delovisca
  useEffect(() => {
    const q = selectedOddelek
      ? supabase.from("delovisca_oddelki").select("delovisce(id, naziv)").eq("oddelek_id", selectedOddelek).order("sort_index")
      : supabase.from("delovisca").select("id, naziv")
    q.then(({ data }) => data && setDelovisca(selectedOddelek ? data.map((r: any) => r.delovisce) : data))
  }, [selectedOddelek])

  // Load zdravniki
  useEffect(() => {
    let q = supabase.from("zdravniki").select("id, skrajsava")
    if (selectedOddelek) q = q.eq("oddelek_id", selectedOddelek)
    q.then(({ data }) => data && setZdravniki(data))
  }, [selectedOddelek])

  // Fetch schedule + realtime
  useEffect(() => {
    const fetchRazpored = async () => {
      const start = new Date(leto, mesec - 1, 1).toISOString()
      const end = new Date(leto, mesec, 0).toISOString()
      const { data, error } = await supabase
        .from("mesecni_razporedi_zdravniki")
        .select(`mesecni_razporedi!inner(id, datum, delovisce_id), zdravniki(id, skrajsava)`)
        .gte("mesecni_razporedi.datum", start)
        .lte("mesecni_razporedi.datum", end)
        .match(selectedOddelek ? { "mesecni_razporedi.oddelek_id": selectedOddelek } : {})
      if (error) return console.error(error)
      const map: Record<string, Zdravnik[]> = {}
      const ids: Record<string, string> = {}
      data?.forEach((r: any) => {
        const mr = r.mesecni_razporedi
        if (!mr) return
        const key = `${mr.datum}_${mr.delovisce_id}`
        ids[key] = mr.id
        map[key] = map[key] || []
        map[key].push({ id: r.zdravniki.id, skrajsava: r.zdravniki.skrajsava })
      })
      setRazpored(map)
      setRazporedIds(ids)
    }
    fetchRazpored()
    const channel = supabase
      .channel('razporedi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesecni_razporedi_zdravniki' }, fetchRazpored)
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [leto, mesec, selectedOddelek])

  // Add / Remove
  const handleAdd = async (cell: Celica, doc: Zdravnik) => {
    const key = `${cell.datum}_${cell.delovisce_id}`
    if (razpored[key]?.some(z => z.id === doc.id)) return
    let schedId = razporedIds[key]
    if (!schedId) {
      const { data, error } = await supabase.from("mesecni_razporedi").insert({ datum: cell.datum, delovisce_id: cell.delovisce_id, ...(selectedOddelek && { oddelek_id: selectedOddelek }) }).select('id').single()
      if (error || !data) return toast.error("Napaka pri ustvarjanju razporeda")
      schedId = data.id
      setRazporedIds(v => ({ ...v, [key]: schedId }))
    }
    const { error } = await supabase.from("mesecni_razporedi_zdravniki").insert({ razpored_id: schedId, zdravnik_id: doc.id })
    if (error) return toast.error("Napaka pri dodajanju zdravnika")
    setRazpored(v => ({ ...v, [key]: [...(v[key] || []), doc] }))
    toast.success("Zdravnik dodan")
    setOpenCell(null)
    setSearch("")
  }
  const handleRemove = async (cell: Celica, doc: Zdravnik) => {
    const key = `${cell.datum}_${cell.delovisce_id}`
    const schedId = razporedIds[key]
    if (!schedId) return
    const { error } = await supabase.from("mesecni_razporedi_zdravniki").delete().eq("razpored_id", schedId).eq("zdravnik_id", doc.id)
    if (error) return toast.error("Napaka pri odstranitvi zdravnika")
    setRazpored(v => ({ ...v, [key]: v[key].filter(z => z.id !== doc.id) }))
    toast.success("Zdravnik odstranjen")
  }

  // Weeks calculation
  const monthStart = startOfMonth(new Date(leto, mesec - 1))
  const monthEnd = endOfMonth(monthStart)
  const firstWeek = startOfWeek(monthStart, { weekStartsOn: 1 })
  const lastWeek = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const weeks: Date[] = []
  let cursor = firstWeek
  while (cursor <= lastWeek) { weeks.push(cursor); cursor = addDays(cursor, 7) }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <select value={mesec} onChange={e => setMesec(+e.target.value)} className="border px-3 py-2 rounded">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{format(new Date(leto, m - 1, 1), 'LLLL', { locale: sl })}</option>
          ))}
        </select>
        <select value={leto} onChange={e => setLeto(+e.target.value)} className="border px-3 py-2 rounded">
          {[leto - 1, leto, leto + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={selectedOddelek} onChange={e => setSelectedOddelek(e.target.value)} className="border px-3 py-2 rounded ml-auto">
          <option value="">Vsi oddelki</option>
          {oddelki.map(o => <option key={o.id} value={o.id}>{o.naziv}</option>)}
        </select>
      </div>

      {/* Schedule Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tedenski razpored — {format(monthStart, 'LLLL yyyy', { locale: sl })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="teden-1" className="space-y-4">
            <TabsList>
              {weeks.map((_, i) => <TabsTrigger key={i} value={`teden-${i+1}`}>Teden {i+1}</TabsTrigger>)}
            </TabsList>
            {weeks.map((ws, idx) => {
              const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))
              const cols = days.length + 1
              return (
                <TabsContent key={idx} value={`teden-${idx+1}`}>
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full table-fixed text-sm border-collapse">
                      <colgroup>
                        {Array.from({ length: cols }, (_, c) => <col key={c} style={{ width: `${100/cols}%` }} />)}
                      </colgroup>
                      <thead>
                        <tr className="bg-muted">
                          <th className="px-2 py-1 border">Delovišče</th>
                          {days.map(d => {
                            const wd = getDay(d), isWeekend = wd === 0 || wd === 6
                            return <th key={d.toISOString()} className={`px-2 py-1 border text-center ${isWeekend?'bg-muted/40':''}`}>{format(d,'EEEE',{locale:sl})}</th>
                          })}
                        </tr>
                        <tr>
                          <th className="px-2 py-1 border"></th>
                          {days.map(d => {
                            const inMonth = d >= monthStart && d <= monthEnd
                            return <th key={d.toISOString()} className="px-2 py-1 border text-center">{inMonth?format(d,'d.M.yyyy',{locale:sl}):''}</th>
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {delovisca.map(dv => (
                          <tr key={dv.id}>
                            <td className="px-2 py-1 border font-medium whitespace-nowrap">{dv.naziv}</td>
                            {days.map((d, i) => {
                              const dateStr = format(d,'yyyy-MM-dd')
                              const cellKey = `${dateStr}_${dv.id}`
                              const docs = razpored[cellKey] || []
                              const wd = getDay(d), isWeekend = wd === 0 || wd === 6
                              return (
                                <td key={cellKey} className={`px-2 py-1 border text-center hover:bg-muted cursor-pointer ${isWeekend?'bg-muted/40':''}`} onClick={()=>setOpenCell({datum:dateStr,delovisce_id:dv.id})}>
                                  {docs.length>0
                                    ? docs.map((z, j) => (
                                        <Badge key={`${z.id}-${j}`} className="mx-0.5">
                                          {z.skrajsava}
                                          <button onClick={e=>{e.stopPropagation();handleRemove({datum:dateStr,delovisce_id:dv.id},z)}} type="button"><X className="w-3 h-3"/></button>
                                        </Badge>
                                      ))
                                    : <span className="text-xs text-muted-foreground italic">—</span>
                                  }
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

      {/* Dialog */}
      <Dialog open={!!openCell} onOpenChange={()=>setOpenCell(null)}>
        <DialogContent>
          <DialogTitle>Izberi zdravnika</DialogTitle>
          <Input autoFocus placeholder="Išči..." value={search} onChange={e=>setSearch(e.target.value)} />
          <div className="mt-2 flex gap-2 flex-wrap">
            {zdravniki.filter(z=>z.skrajsava.toLowerCase().includes(search.toLowerCase())).map(z=>
              <Button key={z.id} variant="outline" onClick={()=>openCell&&handleAdd(openCell,z)}>{z.skrajsava}</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
