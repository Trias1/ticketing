// components/DashboardContent.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminOverview from "components/admin/AdminOverview";
import StaffDashboard from "components/staff/StaffDashboard";

type User = {
  id: string;
  name: string;
  role: string;
  team: string;
};

export default function DashboardContent({ team }: { team: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const res = await fetch("/api/jwt", { credentials: "include" });
      if (!res.ok) {
        router.push("/login");
        return;
      }

      const { user } = await res.json();

      // Admin hanya punya area administrasi; staff punya dashboard di tim mereka.
      const home = user.role === "admin" ? "admin" : user.team;
      if (team !== home) {
        router.replace(`/dashboard/${home}`);
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkUser();
  }, [team, router]);

  if (loading || !user) return null;

  const isAdmin = user.role === "admin";

  if (isAdmin && team === "admin") return <AdminOverview />;

  return <StaffDashboard homeTeam={user.team} userName={user.name.split(" ")[0]} />;
}

