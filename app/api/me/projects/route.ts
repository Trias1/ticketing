import { NextResponse } from "next/server";
import { requireUser } from "lib/api-auth";
import { memberProjects } from "lib/issue-queries";

export const dynamic = "force-dynamic";

// Project tempat user jadi member (untuk switcher, sidebar, dan halaman Projects).
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  return NextResponse.json(await memberProjects(auth.user.id));
}
