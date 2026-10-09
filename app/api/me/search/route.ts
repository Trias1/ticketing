import { NextResponse } from "next/server";
import { limitUser, requireUser } from "lib/api-auth";
import { userLimits } from "lib/rate-limit";
import { listIssues, memberProjects } from "lib/issue-queries";

export const dynamic = "force-dynamic";

// Pencarian issue untuk "Jump to…": judul atau nomor, di semua project milik user.
export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const q = (new URL(req.url).searchParams.get("q")?.trim() ?? "").slice(0, 100);
  if (q.length < 2) return NextResponse.json([]);
  const limited = await limitUser(userLimits.search(auth.user.id));
  if (limited) return limited;

  const ids = (await memberProjects(auth.user.id)).map((p) => p.id);
  const issues = await listIssues(ids, { q, state: "all", sort: "updated", limit: 8 });
  return NextResponse.json(
    issues.map((i) => ({
      number: i.number,
      title: i.title,
      closed: !!i.closedAt,
      projectName: i.projectName,
      projectSlug: i.projectSlug,
      projectTeam: i.projectTeam,
    }))
  );
}
