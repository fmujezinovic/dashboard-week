"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { DndContext, closestCenter } from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import SortableItem from "./SortableItem"
import { toast } from "sonner"

type Delovisce = {
  id: string
  naziv: string
  telefoni: string[] | null
}

type Oddelek = {
  id: string
  naziv: string
}

type Povezava = {
  id: string
  delovisce_id: string
  oddelek_id: string | null
  sort_index: number
  delovisce: Delovisce
}

export default function TableDelovisca() {
  const supabase = createClient()
  const [oddelki, setOddelki] = useState<Oddelek[]>([])
  const [selectedOddelek, setSelectedOddelek] = useState<string>("klinika")
  const [povezave, setPovezave] = useState<Povezava[]>([])

  // 🔹 Naloži oddelke
  useEffect(() => {
    const fetchOddelki = async () => {
      const { data, error } = await supabase.from("oddelki").select("*")
      if (error) {
        console.error("❌ Napaka pri nalaganju oddelkov:", error)
        toast.error("Napaka pri nalaganju oddelkov")
      } else {
        setOddelki(data ?? [])
      }
    }

    fetchOddelki()
  }, [])

  // 🔹 Naloži povezave
  useEffect(() => {
    const fetchPovezave = async () => {
      let query = supabase
        .from("delovisca_oddelki")
        .select("id, delovisce_id, oddelek_id, sort_index, delovisce:delovisce_id(id, naziv, telefoni)")
        .order("sort_index", { ascending: true })

      if (selectedOddelek === "klinika") {
        query = query.is("oddelek_id", null)
      } else {
        query = query.eq("oddelek_id", selectedOddelek)
      }

      const { data, error } = await query

      if (error) {
        console.error("❌ Napaka pri nalaganju delovišč:", error)
        toast.error("Napaka pri nalaganju delovišč")
        setPovezave([])
      } else {
        setPovezave(data as Povezava[])
      }
    }

    fetchPovezave()
  }, [selectedOddelek])

  // 🔹 Drag and drop logika
  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = povezave.findIndex(p => p.id === active.id)
    const newIndex = povezave.findIndex(p => p.id === over.id)

    const newOrder = arrayMove(povezave, oldIndex, newIndex)
    setPovezave(newOrder)

    const updates = newOrder.map((p, index) => ({
      id: p.id,
      sort_index: index,
    }))

    const { error } = await supabase.from("delovisca_oddelki").upsert(updates)
    if (error) {
      console.error("❌ Napaka pri shranjevanju razvrstitve:", error)
      toast.error("Napaka pri shranjevanju razvrstitve")
    } else {
      toast.success("Razvrstitev uspešno shranjena")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Delovišča</h1>
        <select
          className="border px-3 py-2 rounded"
          value={selectedOddelek}
          onChange={e => setSelectedOddelek(e.target.value)}
        >
          <option value="klinika">Vsa delovišča (klinika)</option>
          {oddelki.map(o => (
            <option key={o.id} value={o.id}>
              {o.naziv}
            </option>
          ))}
        </select>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={povezave.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {povezave.map(p => (
              <SortableItem
                key={p.id}
                id={p.id}
                content={
                  <div className="p-4 rounded-md border bg-white hover:bg-gray-50 transition-colors w-full">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-800">
                        {p.delovisce.naziv}
                      </span>
                      {Array.isArray(p.delovisce.telefoni) &&
                        p.delovisce.telefoni.length > 0 && (
                          <span className="text-sm text-gray-500">
                            {p.delovisce.telefoni.join(", ")}
                          </span>
                        )}
                    </div>
                  </div>
                }
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
