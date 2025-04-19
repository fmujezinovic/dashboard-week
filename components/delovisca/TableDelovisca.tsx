"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

type Oddelek = { id: string; naziv: string }
type Delovisce = {
  id: string
  naziv: string
  telefoni?: string[] | null
  oddelki: (Oddelek | null)[]
}

interface Props {
  data: Delovisce[]
}

export default function TableDelovisca({ data }: Props) {
  const supabase = createClient()

  const [rows, setRows] = useState<Delovisce[]>(data)
  const [naziv, setNaziv] = useState("")
  const [telefon, setTelefon] = useState("")
  const [selectedOddelki, setSelectedOddelki] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [filterOddelek, setFilterOddelek] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [oddOptions, setOddOptions] = useState<Oddelek[]>([])

  useEffect(() => {
    supabase
      .from("oddelki")
      .select("id, naziv")
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          toast.error("Napaka pri nalaganju oddelkov")
        } else if (data) {
          setOddOptions(data)
        }
      })
  }, [])

  const handleSave = async () => {
    if (!naziv) {
      toast.error("Naziv je obvezen")
      return
    }

    let delovisceId = editId

    if (editId) {
      const { error: updErr } = await supabase
        .from("delovisca")
        .update({ naziv, telefoni: telefon.split(",").map((t) => t.trim()) })
        .eq("id", editId)
      if (updErr) {
        console.error(updErr)
        toast.error("Napaka pri posodobitvi")
        return
      }
      const { error: delErr } = await supabase
        .from("delovisca_oddelki")
        .delete()
        .eq("delovisce_id", editId)
      if (delErr) {
        console.error(delErr)
        toast.error("Napaka pri brisanju povezav")
        return
      }
    } else {
      const { data: ins, error: insErr } = await supabase
        .from("delovisca")
        .insert({ naziv, telefoni: telefon.split(",").map((t) => t.trim()) })
        .select()
        .single()
      if (insErr || !ins) {
        console.error(insErr)
        toast.error("Napaka pri dodajanju")
        return
      }
      delovisceId = ins.id
    }

    const rels = selectedOddelki.map((o) => ({
      delovisce_id: delovisceId!,
      oddelek_id: o,
    }))
    const { error: relErr } = await supabase
      .from("delovisca_oddelki")
      .insert(rels)
    if (relErr) {
      console.error(relErr)
      toast.error("Napaka pri shranjevanju oddelkov")
      return
    }

    // ponovno naloži vse vrstice
    const { data: fresh } = await supabase
      .from("delovisca")
      .select(`
        id,
        naziv,
        telefoni,
        delovisca_oddelki (oddelki(id, naziv))
      `)
    if (fresh) {
      setRows(
        fresh.map((d) => ({
          id: d.id,
          naziv: d.naziv,
          telefoni: d.telefoni,
          oddelki: d.delovisca_oddelki.map((r: any) => r.oddelki),
        }))
      )
    }

    toast.success(editId ? "Posodobljeno" : "Dodano")
    setOpen(false)
    setEditId(null)
    setNaziv("")
    setTelefon("")
    setSelectedOddelki([])
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("delovisca").delete().eq("id", id)
    if (error) {
      console.error(error)
      toast.error("Napaka pri brisanju")
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id))
      toast.success("Izbrisano")
    }
  }

  const columns: ColumnDef<Delovisce>[] = [
    { accessorKey: "naziv", header: "Naziv" },
    {
      id: "oddelki",
      header: "Oddelki",
      cell: ({ row }) => {
        const list = row.original.oddelki.filter((o): o is Oddelek => o !== null)
        return list.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {list.map((d) => (
              <Badge key={d.id}>{d.naziv}</Badge>
            ))}
          </div>
        ) : (
          "—"
        )
      },
    },
    {
      accessorKey: "telefoni",
      header: "Telefoni",
      cell: ({ row }) => row.original.telefoni?.join(", ") || "—",
    },
    {
      id: "actions",
      header: "Dejanja",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              const d = row.original
              setEditId(d.id)
              setNaziv(d.naziv)
              setTelefon(d.telefoni?.join(", ") || "")
              setSelectedOddelki(d.oddelki.filter((o): o is Oddelek => o !== null).map((o) => o.id))
              setOpen(true)
            }}
          >
            <Pencil1Icon />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="destructive">
                <TrashIcon />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Izbrisati delovišče?</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Prekliči</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDelete(row.original.id)}>
                  Izbriši
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const filtered = table.getRowModel().rows.filter((row) => {
    const d = row.original
    const okSearch = d.naziv.toLowerCase().includes(search.toLowerCase())
    const okOdd =
      !filterOddelek ||
      d.oddelki.filter((o): o is Oddelek => o !== null).some((o) => o.id === filterOddelek)
    return okSearch && okOdd
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <Input
          placeholder="Išči delovišče..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80"
        />
        <select
          className="border px-3 py-2 rounded"
          value={filterOddelek}
          onChange={(e) => setFilterOddelek(e.target.value)}
        >
          <option value="">Vsi oddelki</option>
          {oddOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.naziv}
            </option>
          ))}
        </select>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (!o) {
              setEditId(null)
              setNaziv("")
              setTelefon("")
              setSelectedOddelki([])
            }
            setOpen(o)
          }}
        >
          <DialogTrigger asChild>
            <Button>{editId ? "Uredi" : "Dodaj"} delovišče</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Uredi" : "Dodaj"} delovišče</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                value={naziv}
                onChange={(e) => setNaziv(e.target.value)}
                placeholder="Naziv delovišča"
              />
              <Input
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                placeholder="Telefonske številke (ločene z vejico)"
              />
              <div>
                <label className="block text-sm font-medium mb-1">Oddelki</label>
                <select
                  multiple
                  value={selectedOddelki}
                  onChange={(e) =>
                    setSelectedOddelki(
                      Array.from(e.target.selectedOptions, (opt) => opt.value)
                    )
                  }
                  className="w-full border rounded px-2 py-1 h-32"
                >
                  {oddOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.naziv}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave}>Shrani</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-4 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-2 border-t">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
