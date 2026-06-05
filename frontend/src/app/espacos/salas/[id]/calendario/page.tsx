"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EspacosCalendarioRedirect() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  useEffect(() => {
    if (params.id) router.replace(`/salas/${params.id}/calendario`);
  }, [router, params.id]);
  return null;
}
