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
import { Button } from "@/components/ui/button"

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
  const [openCell, setOpenCell] = useState<DnevnaCelica | null>(null)
  const [razpored, setRazpored] = useState<Record<string, Zdravnik[]>>({})
  const [razporedIds, setRazporedIds] = useState<Record<string, string>>({})

  const daysInMonth = getDaysInMonth(new Date(leto, mesec - 1))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // 🔁 Fetch oddelki
  useEffect(() => {
    const fetchOddelki = async () => {
      const { data } = await supabase.from("oddelki").select("*")
      if (data) setOddelki(data)
    }
    fetchOddelki()
  }, [])

  // 🔁 Fetch delovišča
  useEffect(() => {
    const fetchDelovisca = async () => {
      if (selectedOddelek) {
        const { data } = await supabase
          .from("delovisca_oddelki")
          .select("delovisce(id, naziv)")
          .eq("oddelek_id", selectedOddelek)
          .order("sort_index", { ascending: true })
        if (data) {
          const mapped = data.map((d: any) => d.delovisce)
          setDelovisca(mapped)
        }
      } else {
        const { data } = await supabase.from("delovisca").select("id, naziv")
        if (data) setDelovisca(data)
      }
    }
    fetchDelovisca()
  }, [selectedOddelek])

  // 🔁 Fetch zdravniki za izbrani oddelek
  useEffect(() => {
    const fetchZdravniki = async () => {
      if (!selectedOddelek) return setZdravniki([])
      const { data } = await supabase
        .from("zdravniki")
        .select("id, skrajsava")
        .eq("oddelek_id", selectedOddelek)
      if (data) setZdravniki(data)
    }
    fetchZdravniki()
  }, [selectedOddelek])

  // 🔁 Fetch obstoječi razporedi
  useEffect(() => {
    const fetchRazpored = async () => {
      if (!selectedOddelek) return
      const start = new Date(leto, mesec - 1, 1)
      const end = new Date(leto, mesec, 0)

      const { data } = await supabase
        .from("mesecni_razporedi")
        .select(`
          id,
          datum,
          delovisce_id,
          mesecni_razporedi_zdravniki (
            zdravnik_id,
            zdravniki (
              id,
              skrajsava
            )
          )
        `)
        .gte("datum", start.toISOString())
        .lte("datum", end.toISOString())
        .eq("oddelek_id", selectedOddelek)

      const newRazpored: Record<string, Zdravnik[]> = {}
      const newRazporedIds: Record<string, string> = {}

      if (data) {
        for (const entry of data) {
          const key = `${entry.datum}_${entry.delovisce_id}`
          newRazporedIds[key] = entry.id
          const zdravniki = entry.mesecni_razporedi_zdravniki.map((z: any) => ({
            id: z.zdravniki.id,
            skrajsava: z.zdravniki.skrajsava,
          }))
          newRazpored[key] = zdravniki
        }
      }

      setRazpored(newRazpored)
      setRazporedIds(newRazporedIds)
    }

    fetchRazpored()
  }, [leto, mesec, selectedOddelek])

  const handleSelectZdravnik = async (celica: DnevnaCelica, zdravnik: Zdravnik) => {
    const key = `${celica.datum}_${celica.delovisce_id}`
    const current = razpored[key] || []
    let razporedId = razporedIds[key]

    // 📥 Če razporedId ne obstaja → vstavi mesecni_razpored
    if (!razporedId) {
      const { data: inserted } = await supabase
        .from("mesecni_razporedi")
        .insert([
          {
            datum: celica.datum,
            delovisce_id: celica.delovisce_id,
            oddelek_id: selectedOddelek,
          },
        ])
        .select()
        .single()

      if (inserted) {
        razporedId = inserted.id
        setRazporedIds((prev) => ({ ...prev, [key]: razporedId }))
      }
    }

    const alreadyExists = current.find((z) => z.id === zdravnik.id)

    if (alreadyExists) {
      await supabase
        .from("mesecni_razporedi_zdravniki")
        .delete()
        .eq("razpored_id", razporedId)
        .eq("zdravnik_id", zdravnik.id)

      setRazpored((prev) => ({
        ...prev,
        [key]: current.filter((z) => z.id !== zdravnik.id),
      }))
    } else {
      await supabase
        .from("mesecni_razporedi_zdravniki")
        .insert([{ razpored_id: razporedId, zdravnik_id: zdravnik.id }])

      setRazpored((prev) => ({
        ...prev,
        [key]: [...current, zdravnik],
      }))
    }
  }

  const getDanVTednu = (date: Date) => format(date, "EEEE", { locale: sl })
  const isWeekend = (date: Date) => [0, 6].includes(getDay(date))

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <select
          value={mesec}
          onChange={(e) => setMesec(parseInt(e.target.value))}
          className="border px-3 py-2 rounded"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {format(new Date(leto, m - 1, 1), "LLLL", { locale: sl })}
            </option>
          ))}
        </select>

        <select
          value={leto}
          onChange={(e) => setLeto(parseInt(e.target.value))}
          className="border px-3 py-2 rounded"
        >
          {[leto - 1, leto, leto + 1].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          value={selectedOddelek}
          onChange={(e) => setSelectedOddelek(e.target.value)}
          className="border px-3 py-2 rounded"
        >
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
              return (
                <tr key={day} className={isWeekend(date) ? "bg-muted/40" : ""}>
                  <td className="px-2 py-1 border font-medium whitespace-nowrap">
                    {format(date, "d.M.yyyy", { locale: sl })}, {getDanVTednu(date)}
                  </td>
                  {delovisca.map((d) => {
                    const key = `${dateStr}_${d.id}`
                    const zdravnikiZaCelico = razpored[key] || []
                    return (
                      <td
                        key={d.id}
                        className="px-2 py-1 border hover:bg-muted cursor-pointer"
                        onClick={() =>
                          setOpenCell({ datum: dateStr, delovisce_id: d.id })
                        }
                      >
                        {zdravnikiZaCelico.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {zdravnikiZaCelico.map((z) => (
                              <Badge key={z.id}>{z.skrajsava}</Badge>
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

      {/* Dialog */}
      <Dialog open={!!openCell} onOpenChange={() => setOpenCell(null)}>
        <DialogContent>
          <DialogTitle>Izberi zdravnike</DialogTitle>
          {zdravniki.map((z) => {
            const key = `${openCell?.datum}_${openCell?.delovisce_id}`
            const izbrani = razpored[key]?.find((zr) => zr.id === z.id)
            return (
              <Button
                key={z.id}
                variant={izbrani ? "secondary" : "outline"}
                className="m-1"
                onClick={() =>
                  openCell && handleSelectZdravnik(openCell, z)
                }
              >
                {z.skrajsava}
              </Button>
            )
          })}
        </DialogContent>
      </Dialog>
    </div>
  )
}
