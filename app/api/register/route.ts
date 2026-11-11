import { newPasswordProblem, registerUser } from "lib/auth";
import { limitUser, requirePeopleManager } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";
import { SUPERADMIN_TEAM, isRole, isSuperadmin } from "lib/roles";
import { isProjectTeam } from "lib/team-access";

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Membuat akun baru. Superadmin: role & tim apa saja. Admin: hanya user di timnya sendiri.
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
    const superadmin = isSuperadmin(auth.user);
    const role = superadmin ? body.role : "user";
    const team = superadmin ? body.team : auth.user.team;

    if (!name || !email || !password) {
      return json({ message: "Name, email, and password are required" }, 400);
    }
    const problem = await newPasswordProblem(password, { email, name });
    if (problem) return json({ message: problem }, 400);
    if (!isRole(role)) {
      return json({ message: "Invalid role" }, 400);
    }
    if (role === "superadmin" ? team !== SUPERADMIN_TEAM : !isProjectTeam(team)) {
      return json({ message: "Invalid team for this role" }, 400);
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
