import TableOddelki from "@/components/oddelki/TableOddelki"
import { createClient } from "@/utils/supabase/server"

export default async function OddelkiPage() {
  const supabase = createClient()
  const { data } = await supabase.from("oddelki").select("*")

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Seznam oddelkov</h1>
      <TableOddelki data={data || []} />
    </div>
  )
}
