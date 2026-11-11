// Tiga peran akun. Modul ini murni (tanpa DB), dipakai proxy, API, dan komponen client.
//
// - superadmin: mengurus semua akun, keamanan, dan monitoring. Sesuai SOP, TIDAK PERNAH melihat
//   project maupun issue tim mana pun. Timnya selalu "superadmin" (URL /dashboard/superadmin).
// - admin: anggota sebuah tim yang juga mengurus akun user di timnya sendiri. Bekerja di project
//   seperti user (akses project tetap lewat member project).
// - user: bekerja di project tempat dia menjadi member.
export const ROLES = ["superadmin", "admin", "user"] as const;
export type Role = (typeof ROLES)[number];

export const SUPERADMIN_TEAM = "superadmin";
export const SUPERADMIN_HOME = `/dashboard/${SUPERADMIN_TEAM}`;

type HasRole = { role?: string | null };
type HasRoleTeam = { role?: string | null; team?: string | null };

export const isRole = (value: unknown): value is Role => ROLES.includes(value as Role);

export const isSuperadmin = (u: HasRole | null | undefined) => u?.role === "superadmin";
export const isTeamAdmin = (u: HasRole | null | undefined) => u?.role === "admin";
// Admin dan user bekerja di project; superadmin tidak.
export const worksInProjects = (u: HasRole | null | undefined) => u?.role === "admin" || u?.role === "user";
// Boleh membuka halaman akun (daftar akun, buat akun): superadmin untuk semua, admin untuk timnya.
export const managesPeople = (u: HasRole | null | undefined) => u?.role === "superadmin" || u?.role === "admin";

// Boleh menonaktifkan / mengaktifkan / mereset password akun target.
export function canManageAccount(actor: HasRoleTeam, target: HasRoleTeam) {
  if (actor.role === "superadmin") return true;
  if (actor.role === "admin") return target.role === "user" && !!actor.team && target.team === actor.team;
  return false;
}

export const ROLE_LABEL: Record<Role, string> = { superadmin: "Superadmin", admin: "Admin", user: "User" };
export const roleLabel = (role: string | null | undefined) => (isRole(role) ? ROLE_LABEL[role] : role ?? "");
