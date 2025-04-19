import { createClient } from "@/utils/supabase/server"
import TableDelovisca from "@/components/delovisca/TableDelovisca"

export default async function DeloviscaPage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("delovisca")
    .select(`
      id,
      naziv,
      telefoni,
      delovisca_oddelki (
        oddelek:oddelki (
          id,
          naziv
        )
      )
    `)

  if (error) {
    // Prikaz napake v UI za lažjo diagnostiko
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Napaka</h1>
        <p className="text-red-500">Prišlo je do napake pri pridobivanju podatkov iz Supabase:</p>
        <pre className="mt-4 p-4 bg-red-100 text-sm text-red-700 rounded">
          {error.message}
        </pre>
      </div>
    )
  }

  const formattedData = (data || []).map((d) => ({
    id: d.id,
    naziv: d.naziv,
    telefoni: d.telefoni || [],
    oddelki: d.delovisca_oddelki.map((o) => o.oddelek),
  }))

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Prikaz delovišč Klinike</h1>
      <TableDelovisca data={formattedData} />
    </div>
  )
}
