"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// URL lama /profile: arahkan ke halaman profil di dalam dashboard (dengan sidebar).
export default function LegacyProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/jwt", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ user }) => {
        const team = user.role === "admin" ? "admin" : user.team;
        router.replace(`/dashboard/${team}/profile`);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return null;
}
