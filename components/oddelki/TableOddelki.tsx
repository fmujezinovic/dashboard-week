"use client"

import { useState } from "react"
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

interface Props {
  data: Oddelek[]
}

export default function TableOddelki({ data }: Props) {
  const supabase = createClient()
  const [naziv, setNaziv] = useState("")
  const [search, setSearch] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const handleSave = async () => {
    const payload = { naziv }

    const { error } = editId
      ? await supabase.from("oddelki").update(payload).eq("id", editId)
      : await supabase.from("oddelki").insert([payload])

    if (error) return toast.error("Napaka pri shranjevanju")
    toast.success(editId ? "Oddelek posodobljen" : "Oddelek dodan")
    setOpen(false)
    location.reload()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("oddelki").delete().eq("id", id)
    if (error) return toast.error("Napaka pri brisanju")
    toast.success("Oddelek izbrisan")
    location.reload()
  }

  const columns: ColumnDef<Oddelek>[] = [
    { accessorKey: "naziv", header: "Naziv" },
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
                <AlertDialogTitle>Izbrisati oddelek?</AlertDialogTitle>
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
    .rows.filter(row =>
      row.original.naziv.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Išči po nazivu oddelka..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80"
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Dodaj oddelek</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Uredi" : "Dodaj"} oddelek</DialogTitle>
            </DialogHeader>
            <Input
              value={naziv}
              onChange={e => setNaziv(e.target.value)}
              placeholder="Naziv oddelka"
            />
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
