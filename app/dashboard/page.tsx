import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export default async function DashboardPage() {
  const user = await currentUser()
  if (!user) return redirect("/")

  const email = user.emailAddresses[0]?.emailAddress
  const supabase = createClient()

  const { data: zdravnik, error } = await supabase
    .from("zdravniki")
    .select("*")
    .eq("email", email)
    .maybeSingle()

  if (!zdravnik) {
    return redirect("/")
  }

  const { ime, priimek, vloga } = zdravnik

  const hasRole = (role: string) =>
    Array.isArray(vloga) && vloga.includes(role)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">
          Dobrodošli, {ime} {priimek}
        </h1>
        <p className="text-muted-foreground">
          Vaše vloge:{" "}
          <strong>{Array.isArray(vloga) ? vloga.join(", ") : "ni določeno"}</strong>
        </p>
      </div>

      {hasRole("admin") && (
        <div className="col-span-full mt-6">
          <h2 className="text-xl font-semibold">Admin nadzorna plošča</h2>
          <p className="text-muted-foreground mt-2">
            Upravljajte uporabnike in pravice.
          </p>
        </div>
      )}

      {hasRole("Zdravnik specialist") && (
        <div className="col-span-full mt-6">
          <h2 className="text-xl font-semibold">Specialist pogled</h2>
          <p className="text-muted-foreground mt-2">
            Dostop do razporedov in pacientov.
          </p>
        </div>
      )}

      {hasRole("Specializant") && (
        <div className="col-span-full mt-6">
          <h2 className="text-xl font-semibold">Specializant</h2>
          <p className="text-muted-foreground mt-2">
            Dostop do pripravništva in izobraževanj.
          </p>
        </div>
      )}
    </div>
  )
}
