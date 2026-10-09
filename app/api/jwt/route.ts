import { getCurrentUser } from "lib/auth";

// Data sesi untuk UI (layout, navbar). Hanya field yang dibutuhkan; tanpa data internal sesi.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  return Response.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        team: user.team,
        avatarUrl: user.avatarUrl,
        mustChangePassword: user.mustChangePassword,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
