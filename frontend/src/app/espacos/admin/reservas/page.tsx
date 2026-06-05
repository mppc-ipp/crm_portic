"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EspacosAdminReservasRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/reservas");
  }, [router]);
  return null;
}
