"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EspacosSalasRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/salas");
  }, [router]);
  return null;
}
