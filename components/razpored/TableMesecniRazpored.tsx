"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { format, getDaysInMonth } from "date-fns"
import { sl } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"
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

  const daysInMonth = getDaysInMonth(new Date(leto, mesec - 1))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  useEffect(() => {
    const fetchOddelki = async () => {
      const { data } = await supabase.from("oddleki").select("*")
      if (data) setOddelki(data)
    }
    fetchOddelki()
  }, [])

  useEffect(() => {
    const fetchDelovisca = async () => {
      if (!selectedOddelek) return
      const { data } = await supabase
        .from("delovisca_oddelki")
        .select("delovisce(id, naziv)")
        .eq("oddelek_id", selectedOddelek)
        .order("sort_index", { ascending: true })
      if (data) {
        const unique = data.map((d: any) => d.delovisce)
        setDelovisca(unique)
      }
    }
    fetchDelovisca()
  }, [selectedOddelek])

  useEffect(() => {
    const fetchZdravniki = async () => {
      if (!selectedOddelek) return
      const { data } = await supabase
        .from("zdravniki")
        .select("id, skrajsava")
        .eq("oddelek_id", selectedOddelek)
      if (data) setZdravniki(data)
    }
    fetchZdravniki()
  }, [selectedOddelek])

  const handleSelectZdravnik = (celica: DnevnaCelica, zdravnik: Zdravnik) => {
    const key = `${celica.datum}_${celica.delovisce_id}`
    const current = razpored[key] || []
    const alreadyExists = current.find((z) => z.id === zdravnik.id)
    const updated = alreadyExists
      ? current.filter((z) => z.id !== zdravnik.id)
      : [...current, zdravnik]
    setRazpored({ ...razpored, [key]: updated })
  }

  return (
    <div className="space-y-4">
      {/* Filterji */}
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
          <option value="">Izberi oddelek</option>
          {oddelki.map((o) => (
            <option key={o.id} value={o.id}>
              {o.naziv}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
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
              const dateStr = format(new Date(leto, mesec - 1, day), "yyyy-MM-dd")
              return (
                <tr key={day}>
                  <td className="px-2 py-1 border font-medium whitespace-nowrap">
                    {format(new Date(leto, mesec - 1, day), "dd. MMM", {
                      locale: sl,
                    })}
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

      {/* Dialog za izbiro zdravnikov */}
      <Dialog open={!!openCell} onOpenChange={() => setOpenCell(null)}>
        <DialogContent>
          <h3 className="text-lg font-semibold mb-2">Izberi zdravnike</h3>
          {zdravniki.map((z) => (
            <Button
              key={z.id}
              variant={
                razpored[
                  `${openCell?.datum}_${openCell?.delovisce_id}`
                ]?.find((zr) => zr.id === z.id)
                  ? "secondary"
                  : "outline"
              }
              className="m-1"
              onClick={() =>
                openCell && handleSelectZdravnik(openCell, z)
              }
            >
              {z.skrajsava}
            </Button>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  )
}
