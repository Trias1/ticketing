import { newPasswordProblem, registerUser } from "lib/auth";
import { limitUser, requirePeopleManager } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";
import { isSuperadmin } from "lib/roles";
import { isProjectTeam } from "lib/team-access";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Membuat akun baru. Superadmin: admin tim. Admin: user di timnya sendiri.
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
    const role = isSuperadmin(auth.user) ? "admin" : "user";
    const team = isSuperadmin(auth.user) ? body.team : auth.user.team;

    if (!name || !email || !password) {
      return json({ message: "Name, email, and password are required" }, 400);
    }
    const problem = await newPasswordProblem(password, { email, name });
    if (problem) return json({ message: problem }, 400);
    if (!isProjectTeam(team)) {
      return json({ message: "Invalid team" }, 400);
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
