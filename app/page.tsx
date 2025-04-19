"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignInButton } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Dobrodošli 👋</h1>
      <p className="mb-4">Za nadaljevanje se prijavite.</p>
  <SignInButton mode="modal" afterSignInUrl="/dashboard">
  <button className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition">
    Prijavi se z Google
  </button>
</SignInButton>


    </div>
  );
}
