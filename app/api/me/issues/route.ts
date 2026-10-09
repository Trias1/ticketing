import { NextResponse } from "next/server";
import { requireUser } from "lib/api-auth";
import { countIssues, listIssues, memberProjects, type IssueSort, type IssueState } from "lib/issue-queries";

export const dynamic = "force-dynamic";

const STATES: IssueState[] = ["open", "closed", "all"];
const SORTS: IssueSort[] = ["updated", "created", "due", "number"];

// Issue lintas project: ?scope=assigned|created&state=&q=&sort=
export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const sp = new URL(req.url).searchParams;
  const scope = sp.get("scope") === "created" ? "created" : "assigned";
  const state = STATES.includes(sp.get("state") as IssueState) ? (sp.get("state") as IssueState) : "open";
  const sort = SORTS.includes(sp.get("sort") as IssueSort) ? (sp.get("sort") as IssueSort) : "updated";

  const ids = (await memberProjects(auth.user.id)).map((p) => p.id);
  const filters = {
    q: sp.get("q") ?? undefined,
    ...(scope === "assigned" ? { assignee: auth.user.id } : { authorId: auth.user.id }),
  };

  const [issues, counts] = await Promise.all([
    listIssues(ids, { ...filters, state, sort }),
    countIssues(ids, filters),
  ]);
  return NextResponse.json({ issues, counts });
}
