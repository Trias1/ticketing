"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "components/admin/AdminSidebar";
import StaffSidebar from "components/staff/StaffSidebar";
import { PROFILE_UPDATED_EVENT } from "components/profile/ProfileSettings";

type User = {
  role: string;
  team?: string;
};

// Pilih sidebar sesuai role: admin mengelola anggota, staff bekerja di project.
export default function Sidebar({ onToggleWidth }: { onToggleWidth?: (collapsed: boolean) => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setIsOpen(window.innerWidth >= 768);

    const fetchUser = async () => {
      try {
        const res = await fetch("/api/jwt", { credentials: "include" });
        if (!res.ok) return;
        const { user } = await res.json();
        setUser(user);
      } catch {
        // Gagal memuat user: sidebar tetap tampil tanpa nama; layout yang mengarahkan ke login.
      }
    };

    fetchUser();
    window.addEventListener(PROFILE_UPDATED_EVENT, fetchUser);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, fetchUser);
  }, []);

  useEffect(() => {
    onToggleWidth?.(!isOpen);
  }, [isOpen, onToggleWidth]);

  if (!user) return null;

  const toggle = () => setIsOpen((open) => !open);

  if (user.role === "admin") return <AdminSidebar isOpen={isOpen} onToggle={toggle} />;
  return <StaffSidebar isOpen={isOpen} onToggle={toggle} homeTeam={user.team ?? "cloud"} />;
}
