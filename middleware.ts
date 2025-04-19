// middleware.ts

import { clerkMiddleware } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// kombiniran middleware
export async function middleware(request: NextRequest) {
  // Clerk najprej obdela zahtevek
  const clerkResponse = await clerkMiddleware()(request);

  // Supabase osveži sejo
  const supabaseResponse = await updateSession(request);

  // Uporabi Clerk response, če obstaja, sicer Supabase, sicer nadaljuj
  return clerkResponse || supabaseResponse || NextResponse.next();
}

// kombiniran matcher (vključi vse potrebne Clerk + Supabase poti)
export const config = {
  matcher: [
    // Clerk-ov matcher
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',

    // Supabase-ov dodatni matcher (favicon, image, static že zajeto zgoraj)
    // Dodatne slike po želji lahko dodaš tukaj, če niso že pokrite
  ],
};
