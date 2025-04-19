// components/razpored/TableTedenskiRazpored.tsx
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

type Oddelek   = { id: string; naziv: string }
type Delovisce = { id: string; naziv: string }
type Zdravnik  = { skrajsava: string }

export default function TableTedenskiRazpored() {
  const supabase = createClient()
  const today    = new Date()

  const [leto, setLeto]                   = useState(today.getFullYear())
  const [mesec, setMesec]                 = useState(today.getMonth() + 1)
  const [oddelki, setOddelki]             = useState<Oddelek[]>([])
  const [selectedOddelek, setSelectedOddelek] = useState<string>("")
  const [delovisca, setDelovisca]         = useState<Delovisce[]>([])
  const [razpored, setRazpored]           = useState<Record<string, Zdravnik[]>>({})

  useEffect(() => {
    supabase.from("oddelki").select("id, naziv").then(({ data }) => {
      if (data) setOddelki(data)
    })
  }, [])

  useEffect(() => {
    const q = selectedOddelek
      ? supabase
          .from("delovisca_oddelki")
          .select("delovisce(id, naziv)")
          .eq("oddelek_id", selectedOddelek)
          .order("sort_index")
      : supabase.from("delovisca").select("id, naziv")

    q.then(({ data }) => {
      if (data) {
        setDelovisca(
          selectedOddelek
            ? (data as any[]).map((r) => r.delovisce)
            : (data as Delovisce[])
        )
      }
    })
  }, [selectedOddelek])

  useEffect(() => {
    const start = new Date(leto, mesec - 1, 1).toISOString()
    const end   = new Date(leto, mesec, 0).toISOString()

    let query = supabase
      .from("mesecni_razporedi_zdravniki")
      .select(`
        mesecni_razporedi(datum, delovisce_id),
        zdravniki(skrajsava)
      `)
      .gte("mesecni_razporedi.datum", start)
      .lte("mesecni_razporedi.datum", end)

    if (selectedOddelek) {
      query = query.eq("mesecni_razporedi.oddelek_id", selectedOddelek)
    }

    query.then(({ data }) => {
      const map: Record<string, Zdravnik[]> = {}
      data?.forEach((r: any) => {
        const { datum, delovisce_id } = r.mesecni_razporedi
        const key = `${datum}_${delovisce_id}`
        map[key] = map[key] || []
        map[key].push({ skrajsava: r.zdravniki.skrajsava })
      })
      setRazpored(map)
    })
  }, [leto, mesec, selectedOddelek])

  // izračun tednov v izbranem mesecu
  const monthStart = startOfMonth(new Date(leto, mesec - 1))
  const monthEnd   = endOfMonth(monthStart)
  const firstWeek  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const lastWeek   = endOfWeek(monthEnd,   { weekStartsOn: 1 })

  const weeks: Date[] = []
  let cursor = firstWeek
  while (cursor <= lastWeek) {
    weeks.push(cursor)
    cursor = addDays(cursor, 7)
  }

  return (
    <div className="space-y-8">
      {/* FILTERI */}
      <div className="flex gap-4 items-center">
        <select
          className="border px-3 py-2 rounded"
          value={mesec}
          onChange={(e) => setMesec(+e.target.value)}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {format(new Date(leto, m - 1, 1), "LLLL", { locale: sl })}
            </option>
          ))}
        </select>
        <select
          className="border px-3 py-2 rounded"
          value={leto}
          onChange={(e) => setLeto(+e.target.value)}
        >
          {[leto - 1, leto, leto + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="border px-3 py-2 rounded ml-auto"
          value={selectedOddelek}
          onChange={(e) => setSelectedOddelek(e.target.value)}
        >
          <option value="">Vsi oddelki</option>
          {oddelki.map((o) => (
            <option key={o.id} value={o.id}>
              {o.naziv}
            </option>
          ))}
        </select>
      </div>

      {weeks.map((weekStart) => {
        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        // +1 za 'Delovišče'
        const cols = days.length + 1
        return (
          <div key={weekStart.toISOString()} className="overflow-x-auto border rounded">
            <table className="w-full table-fixed text-sm border-collapse">
              <colgroup>
                {Array.from({ length: cols }).map((_, idx) => (
                  <col key={idx} style={{ width: `${100/cols}%` }} />
                ))}
              </colgroup>

              <thead>
                <tr className="bg-muted">
                  <th className="px-2 py-1 border overflow-hidden whitespace-nowrap text-ellipsis">
                    Delovišče
                  </th>
                  {days.map((d) => {
                    const wd = getDay(d)
                    const isWeekend = wd===6||wd===0
                    return (
                      <th
                        key={d.toISOString()}
                        className={`px-2 py-1 border text-center overflow-hidden whitespace-nowrap text-ellipsis ${
                          isWeekend ? "bg-muted/40" : ""
                        }`}
                      >
                        {format(d, "EEEE", { locale: sl })}
                      </th>
                    )
                  })}
                </tr>
                <tr>
                  <th className="px-2 py-1 border"></th>
                  {days.map((d) => {
                    const inMonth = d>=monthStart && d<=monthEnd
                    return (
                      <th
                        key={d.toISOString()}
                        className="px-2 py-1 border text-center overflow-hidden whitespace-nowrap text-ellipsis"
                      >
                        {inMonth ? format(d, "d.M.yyyy", { locale: sl }) : ""}
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {delovisca.map((dv) => (
                  <tr key={dv.id}>
                    <td className="px-2 py-1 border font-medium overflow-hidden whitespace-nowrap text-ellipsis">
                      {dv.naziv}
                    </td>
                    {days.map((d) => {
                      const dateStr = format(d,"yyyy-MM-dd")
                      const cellKey = `${dateStr}_${dv.id}`
                      const docs    = razpored[cellKey]||[]
                      const wd      = getDay(d)
                      const isWeekend = wd===6||wd===0
                      return (
                        <td
                          key={cellKey}
                          className={`px-2 py-1 border text-center overflow-hidden whitespace-nowrap text-ellipsis ${
                            isWeekend?"bg-muted/40":""
                          }`}
                        >
                          {docs.length>0 ? (
                            <div className="flex justify-center gap-1 overflow-hidden">
                              {docs.map((z,i)=>(
                                <span
                                  key={i}
                                  className="inline-block truncate px-1"
                                  style={{ maxWidth: "100%" }}
                                >
                                  {z.skrajsava}
                                </span>
                              ))}
                            </div>
                          ) : "—"}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
