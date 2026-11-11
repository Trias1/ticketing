import { newPasswordProblem, registerUser } from "lib/auth";
import { limitUser, requirePeopleManager } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";
import { eq } from "drizzle-orm";
import { db } from "db";
import { users } from "db/schema";
import { isSuperadmin } from "lib/roles";
import { cleanTeamName, createTeam } from "lib/teams";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Membuat akun baru. Superadmin: admin + tim barunya. Admin: user di timnya sendiri.
export async function POST(req: Request) {
  const auth = await requirePeopleManager();
  if (auth.error) return auth.error;
  const limited = await limitUser(userLimits.adminAction(auth.user.id));
  if (limited) return limited;

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    // Superadmin hanya membuat admin tim; user hanya dibuat oleh admin timnya. Superadmin baru tidak
    // pernah dibuat dari aplikasi (hanya lewat scripts/seed-user.ts).
    const superadmin = isSuperadmin(auth.user);
    const role = superadmin ? "admin" : "user";
    // Setiap admin baru selalu mendapat tim baru miliknya sendiri (newTeam = nama tim), supaya tidak ada
    // tim yang dipakai bersama. User selalu masuk ke tim admin yang membuatnya.
    const newTeam = superadmin ? cleanTeamName(body.newTeam) : "";
    let team = auth.user.team;

    if (!name || !email || !password) {
      return json({ message: "Name, email, and password are required" }, 400);
    }
    if (superadmin && !newTeam) {
      return json({ message: "Enter a name for the admin's new team" }, 400);
    }
    const problem = await newPasswordProblem(password, { email, name });
    if (problem) return json({ message: problem }, 400);

    if (superadmin) {
      // Cek email dulu supaya tidak tertinggal tim kosong saat akun gagal dibuat.
      if (await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } })) {
        return json({ message: "This email is already registered" }, 409);
      }
      const created = await createTeam(newTeam);
      if (!created.team) return json({ message: created.error ?? "Failed to create the team" }, 400);
      team = created.team.slug;
    }

    const result = await registerUser({ name, email, password, role, team });

    return json({ success: true, user: result }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === "User already exists") {
      return json({ message: "This email is already registered" }, 409);
    }
    return json({ message: "Failed to register user" }, 500);
  }
}
