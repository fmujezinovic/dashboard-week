"use client"

import { useState, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

type Zdravnik = {
  id: string
  ime: string
  priimek: string
  email: string
  skrajsava: string
  vloga: string[]
  oddelek?: {
    id: string
    naziv: string
  } | null
  oddelek_id?: string
}

interface TableZdravnikiProps {
  data: Zdravnik[]
}

export default function TableZdravniki({ data }: TableZdravnikiProps) {
  const supabase = createClient()

  const [search, setSearch] = useState("")
  const [openDialog, setOpenDialog] = useState(false)
  const [editData, setEditData] = useState<Zdravnik | null>(null)
  const [oddelki, setOddelki] = useState<{ id: string; naziv: string }[]>([])

  const [form, setForm] = useState({
    ime: "",
    priimek: "",
    email: "",
    skrajsava: "",
    oddelek_id: "",
    vloga: "",
  })

  useEffect(() => {
    const fetchOddelki = async () => {
      const { data } = await supabase.from("oddelki").select("*")
      setOddelki(data || [])
    }
    fetchOddelki()
  }, [supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const handleSave = async () => {
    const payload = {
      ...form,
      vloga: form.vloga.split(",").map(v => v.trim()),
    }

    if (editData) {
      const { error } = await supabase.from("zdravniki").update(payload).eq("id", editData.id)
      if (error) return toast.error("Napaka pri posodabljanju")
      toast.success("Zdravnik posodobljen")
    } else {
      const { error } = await supabase.from("zdravniki").insert([payload])
      if (error) return toast.error("Napaka pri dodajanju")
      toast.success("Zdravnik dodan")
    }

    setOpenDialog(false)
    window.location.reload()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("zdravniki").delete().eq("id", id)
    if (error) return toast.error("Napaka pri brisanju")
    toast.success("Zdravnik izbrisan")
    window.location.reload()
  }

  const columns: ColumnDef<Zdravnik>[] = [
    { accessorKey: "ime", header: "Ime" },
    { accessorKey: "priimek", header: "Priimek" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "skrajsava",
      header: "Skrajšava",
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-gray-800">{getValue()}</span>
      ),
    },
    {
      accessorKey: "oddelek.naziv",
      header: "Oddelek",
      cell: ({ row }) => row.original.oddelek?.naziv || "–",
    },
    {
      accessorKey: "vloga",
      header: "Vloga",
      cell: ({ getValue }) => {
        const roles = getValue() as string[]
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map(role => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      header: "Dejanja",
      cell: ({ row }) => {
        const z = row.original
        return (
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setEditData(z)
                setForm({
                  ime: z.ime,
                  priimek: z.priimek,
                  email: z.email,
                  skrajsava: z.skrajsava,
                  oddelek_id: z.oddelek_id || "",
                  vloga: z.vloga.join(", "),
                })
                setOpenDialog(true)
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
                  <AlertDialogTitle>Ali ste prepričani, da želite izbrisati zdravnika?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Prekliči</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(z.id)}>Izbriši</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const filtered = table.getRowModel().rows.filter(z =>
    [z.original.ime, z.original.priimek, z.original.email]
      .some(field => field.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Išči po imenu, priimku ali emailu..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-96"
        />
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>Dodaj zdravnika</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editData ? "Uredi" : "Dodaj"} zdravnika</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input name="ime" placeholder="Ime" value={form.ime} onChange={handleChange} />
              <Input name="priimek" placeholder="Priimek" value={form.priimek} onChange={handleChange} />
              <Input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
              <Input name="skrajsava" placeholder="Skrajšava" value={form.skrajsava} onChange={handleChange} />
              <select
                name="oddelek_id"
                value={form.oddelek_id}
                onChange={handleChange}
                className="border rounded px-3 py-2"
              >
                <option value="">Izberi oddelek</option>
                {oddelki.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.naziv}
                  </option>
                ))}
              </select>
              <Input name="vloga" placeholder="Vloga (admin, specialist...)" value={form.vloga} onChange={handleChange} />
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
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer px-4 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: " ↑",
                      desc: " ↓",
                    }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {filtered.map(row => (
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
