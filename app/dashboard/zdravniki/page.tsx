import TableZdravniki from "@/components/zdravniki/TableZdravniki"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("zdravniki")
    .select("*, oddelek:oddelek_id (id, naziv)")
    .order("priimek", { ascending: true })

  if (error) {
    console.error("Napaka pri pridobivanju zdravnikov:", error)
    return <div className="p-6 text-red-500">Napaka pri nalaganju podatkov.</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Seznam zdravnikov</h1>
      <TableZdravniki data={data || []} />
    </div>
  )
}
