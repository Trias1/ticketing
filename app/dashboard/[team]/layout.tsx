"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "components/SidebarAdmin";
import Navbar from "components/Navbar";
import { BrandMark } from "components/ui/kit";

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [team, setTeam] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const res = await fetch("/api/jwt", { credentials: "include" });
      if (!res.ok) {
        router.push("/login");
        return;
      }

      const { user } = await res.json();
      setMustChangePassword(!!user.mustChangePassword);
      setTeam(user.team);
    };

    checkUser();
  }, [router]);

  if (!team) return null;

  // Wajib ganti password: tanpa sidebar & navigasi, hanya form password (middleware mengunci halaman lain).
  if (mustChangePassword) {
    const signOut = async () => {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
    };
    return (
      <div className="min-h-screen bg-tk-bg text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text">
        <header className="flex h-14 items-center justify-between border-b border-tk-border bg-tk-surface px-4 dark:border-tk-dark-border dark:bg-tk-dark-surface sm:px-6">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <BrandMark size={28} /> Ticketing MS
          </span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md px-3 py-1.5 text-sm text-tk-muted hover:bg-tk-subtle hover:text-tk-text dark:text-tk-dark-muted dark:hover:bg-tk-dark-subtle dark:hover:text-tk-dark-text"
          >
            Sign out
          </button>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tk-bg text-tk-text dark:bg-tk-dark-bg dark:text-tk-dark-text">
      <Sidebar onToggleWidth={(collapsed) => setIsSidebarOpen(!collapsed)} />

      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-300 ease-out ${
          isSidebarOpen ? "ml-64" : "ml-16"
        }`}
      >
        <Navbar />
        <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
      </div>
    </div>
  );
}
