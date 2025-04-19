"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Pencil, Trash2, Plus } from "lucide-react"

type Delovisce = {
  id: string
  naziv: string
  telefoni: string[]
}

export default function TableDelovisca() {
  const supabase = createClient()
  const [delovisca, setDelovisca] = useState<Delovisce[]>([])
  const [filtered, setFiltered] = useState<Delovisce[]>([])
  const [search, setSearch] = useState("")
  const [openDialog, setOpenDialog] = useState(false)
  const [editing, setEditing] = useState<Delovisce | null>(null)
  const [naziv, setNaziv] = useState("")
  const [telefoni, setTelefoni] = useState("")

  const fetchData = async () => {
    const { data, error } = await supabase.from("delovisca").select("*").order("naziv")
    if (error) {
      toast.error("Napaka pri nalaganju")
    } else {
      setDelovisca(data)
      setFiltered(data)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const s = search.toLowerCase()
    setFiltered(
      delovisca.filter((d) => d.naziv.toLowerCase().includes(s))
    )
  }, [search, delovisca])

  const resetDialog = () => {
    setNaziv("")
    setTelefoni("")
    setEditing(null)
  }

  const handleSave = async () => {
    const payload = {
      naziv,
      telefoni: telefoni.split(",").map(t => t.trim()).filter(Boolean),
    }

    if (editing) {
      const { error } = await supabase
        .from("delovisca")
        .update(payload)
        .eq("id", editing.id)

      if (error) toast.error("Napaka pri urejanju")
      else toast.success("Delovišče posodobljeno")
    } else {
      const { error } = await supabase.from("delovisca").insert([payload])
      if (error) toast.error("Napaka pri dodajanju")
      else toast.success("Delovišče dodano")
    }

    setOpenDialog(false)
    resetDialog()
    fetchData()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("delovisca").delete().eq("id", id)
    if (error) toast.error("Napaka pri brisanju")
    else {
      toast.success("Delovišče izbrisano")
      fetchData()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <Input
          placeholder="Išči delovišče..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
              <Plus className="w-4 h-4 mr-2" /> Novo delovišče
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Uredi delovišče" : "Dodaj delovišče"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Naziv"
                value={naziv}
                onChange={(e) => setNaziv(e.target.value)}
              />
              <Input
                placeholder="Telefoni (ločeni z vejico)"
                value={telefoni}
                onChange={(e) => setTelefoni(e.target.value)}
              />
              <Button onClick={handleSave} className="w-full">
                Shrani
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="p-3 text-left">Naziv</th>
              <th className="p-3 text-left">Telefoni</th>
              <th className="p-3 text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-t hover:bg-muted/50">
                <td className="p-3">{d.naziv}</td>
                <td className="p-3 text-muted-foreground">
                  {d.telefoni?.join(", ")}
                </td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      setEditing(d)
                      setNaziv(d.naziv)
                      setTelefoni(d.telefoni.join(", "))
                      setOpenDialog(true)
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(d.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="p-3 text-center text-muted-foreground">
                  Ni rezultatov
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
