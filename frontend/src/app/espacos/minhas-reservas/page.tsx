"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EspacosMinhasReservasRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/minhas-reservas");
  }, [router]);
  return null;
}
