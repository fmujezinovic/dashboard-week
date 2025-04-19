"use client"

import { useEffect, useState } from "react"
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
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
  DialogTitle,
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
import { createClient } from "@/utils/supabase/client"

type Oddelek = {
  id: string
  naziv: string
}

type Delovisce = {
  id: string
  naziv: string
  oddelki: (Oddelek | null)[]
}

interface Props {
  data: Delovisce[]
}

export default function TableDelovisca({ data }: Props) {
  const supabase = createClient()
  const [naziv, setNaziv] = useState("")
  const [selectedOddelki, setSelectedOddelki] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [filterOddelek, setFilterOddelek] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [oddOptions, setOddOptions] = useState<Oddelek[]>([])

  useEffect(() => {
    supabase.from("oddelki").select("id, naziv").then(({ data }) => {
      if (data) {
        setOddOptions([{ id: "klinika", naziv: "Klinika za ginekologijo in perinatologijo" }, ...data])
      }
    })
  }, [])

  const handleSave = async () => {
    if (!naziv) return toast.error("Naziv je obvezen")

    let delovisceId = editId

    if (editId) {
      const { error } = await supabase
        .from("delovisca")
        .update({ naziv })
        .eq("id", editId)

      if (error) return toast.error("Napaka pri posodobitvi")

      await supabase
        .from("delovisca_oddelki")
        .delete()
        .eq("delovisce_id", editId)
    } else {
      const { data, error } = await supabase
        .from("delovisca")
        .insert({ naziv })
        .select()
        .single()

      if (error || !data) return toast.error("Napaka pri dodajanju")
      delovisceId = data.id
    }

    const insertRelations = selectedOddelki.map((oddelekId) => ({
      delovisce_id: delovisceId!,
      oddelek_id: oddelekId,
    }))

    const { error: relError } = await supabase
      .from("delovisca_oddelki")
      .insert(insertRelations)

    if (relError) return toast.error("Napaka pri shranjevanju povezav")

    toast.success(editId ? "Posodobljeno" : "Dodano")
    setOpen(false)
    location.reload()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("delovisca").delete().eq("id", id)
    if (error) return toast.error("Napaka pri brisanju")
    toast.success("Izbrisano")
    location.reload()
  }

  const columns: ColumnDef<Delovisce>[] = [
    { accessorKey: "naziv", header: "Naziv" },
    {
      accessorKey: "oddelki",
      header: "Oddelki",
      cell: ({ row }) =>
        row.original.oddelki?.filter(Boolean).map((o) => o?.naziv).join(", ") || "—",
    },
    {
      header: "Dejanja",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              setEditId(row.original.id)
              setNaziv(row.original.naziv)
              setSelectedOddelki(row.original.oddelki?.filter(Boolean).map((o) => o!.id) || [])
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
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const filteredRows = table
    .getRowModel()
    .rows.filter(row => {
      const matchesSearch = row.original.naziv.toLowerCase().includes(search.toLowerCase())
      const matchesOddelek =
        !filterOddelek ||
        (filterOddelek === "klinika" && row.original.oddelki.length === 0) ||
        row.original.oddelki.some((o) => o?.id === filterOddelek)

      return matchesSearch && matchesOddelek
    })

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <Input
          placeholder="Išči po nazivu delovišča..."
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>{editId ? "Uredi" : "Dodaj"} delovišče</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Uredi" : "Dodaj"} delovišče</DialogTitle>
            </DialogHeader>
            <Input
              value={naziv}
              onChange={e => setNaziv(e.target.value)}
              placeholder="Naziv delovišča"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Oddelki</label>
              <select
                multiple
                value={selectedOddelki}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, (o) => o.value)
                  setSelectedOddelki(values)
                }}
                className="w-full border px-3 py-2 rounded h-32"
              >
                {oddOptions.filter(o => o.id !== "klinika").map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.naziv}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button onClick={handleSave}>Shrani</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <table className="min-w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {filteredRows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
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
