import TableDelovisca from "@/components/delovisca/TableDelovisca"

export default function DeloviscaPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Prikaz delovišč Klinike</h1>
      <TableDelovisca />
    </div>
  )
}
