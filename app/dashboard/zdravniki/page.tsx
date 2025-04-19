// app/dashboard/zdravniki/page.tsx
import { createClient } from "@/utils/supabase/server"
import TableZdravniki from "@/components/zdravniki/TableZdravniki"

export default async function ZdravnikiPage() {
  const supabase = createClient()

  const { data: zdravniki, error } = await supabase
    .from("zdravniki")
    .select("*")

  if (error) {
    console.error("Napaka pri pridobivanju zdravnikov:", error.message)
    return <p className="text-red-500">Napaka pri nalaganju podatkov.</p>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Seznam zdravnikov</h1>
      <TableZdravniki data={zdravniki ?? []} />
    </div>
  )
}

