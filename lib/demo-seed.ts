import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "db";
import {
  activity,
  authEvents,
  projectLabels,
  projectMembers,
  projects,
  teams,
  ticketReplies,
  ticketStatuses,
  tickets,
  users,
} from "db/schema";
import { DEFAULT_LABELS, DEFAULT_STATUSES, issueSlug, referenceCode } from "lib/issues";
import { SUPERADMIN_TEAM } from "lib/roles";
import { DEMO_EMAIL_DOMAIN, isDemo } from "lib/demo";

// Isi ulang database demo: hapus semua data lalu tulis data contoh. Dipakai cron harian
// (/api/demo/reset) dan scripts/seed-demo.ts.
//
// Dua pengaman supaya database production tidak pernah terhapus:
// 1. Mode demo harus aktif (NEXT_PUBLIC_DEMO_MODE=1).
// 2. Database harus punya tabel penanda demo_instance. Penanda hanya bisa dipasang (init) di
//    database yang belum punya akun sama sekali, jadi database yang sudah dipakai tidak lolos.

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 60 * 60 * 1000);
const inDays = (days: number) => new Date(Date.now() + days * DAY);
const id = () => crypto.randomUUID();
const email = (local: string) => `${local}@${DEMO_EMAIL_DOMAIN}`;

type IssueSeed = {
  title: string;
  description: string;
  status: number; // indeks DEFAULT_STATUSES
  author: string;
  assignee?: string;
  labels?: string[];
  createdDaysAgo: number;
  dueInDays?: number;
  closed?: boolean;
  replies?: { by: string; message: string; daysAgo: number }[];
};

type ProjectSeed = {
  name: string;
  description: string;
  team: string;
  color: string;
  icon: string;
  owner: string;
  members: string[];
  issues: IssueSeed[];
};

async function assertDemoDatabase(init: boolean) {
  const marker = await db.execute(sql`select to_regclass('public.demo_instance') is not null as ok`);
  if (marker.rows[0]?.ok) return;
  if (!init) throw new Error("Demo reset refused: this database is not marked as a demo database");
  const existing = await db.execute(sql`select count(*)::int as n from users`);
  if (Number(existing.rows[0]?.n) > 0) {
    throw new Error("Demo init refused: this database already has accounts. Use an empty database for the demo.");
  }
  await db.execute(sql`create table demo_instance (created_at timestamptz not null default now())`);
  await db.execute(sql`insert into demo_instance default values`);
}

export async function resetDemoData({ init = false }: { init?: boolean } = {}) {
  if (!isDemo()) throw new Error("Demo reset refused: NEXT_PUBLIC_DEMO_MODE is not 1");
  await assertDemoDatabase(init);

  // Tidak ada yang tahu password akun demo; masuknya lewat tombol di halaman login.
  const password = await hash(randomBytes(32).toString("base64url"), 10);

  const people = {
    superadmin: { id: id(), name: "Rina Wijaya", email: email("superadmin"), role: "superadmin", team: SUPERADMIN_TEAM },
    budi: { id: id(), name: "Budi Santoso", email: email("admin"), role: "admin", team: "platform" },
    dewi: { id: id(), name: "Dewi Lestari", email: email("user"), role: "user", team: "platform" },
    andi: { id: id(), name: "Andi Pratama", email: email("andi"), role: "user", team: "platform" },
    maya: { id: id(), name: "Maya Putri", email: email("maya"), role: "admin", team: "support" },
    rizky: { id: id(), name: "Rizky Hidayat", email: email("rizky"), role: "user", team: "support" },
  };
  type Person = keyof typeof people;
  const person = (key: string) => people[key as Person];

  const projectSeeds: ProjectSeed[] = [
    {
      name: "Website Redesign",
      description: "New marketing site: faster pages, a fresh look and a proper docs section.",
      team: "platform",
      color: "#2563EB",
      icon: "🌐",
      owner: "budi",
      members: ["dewi", "andi"],
      issues: [
        {
          title: "Hero section looks broken on small phones",
          description: "On a 360px screen the headline overflows and the button sits under the image.\n\n**Steps**\n1. Open the home page on a small phone\n2. Look at the top section",
          status: 1, author: "dewi", assignee: "andi", labels: ["Bug"], createdDaysAgo: 3, dueInDays: 2,
          replies: [
            { by: "andi", message: "Reproduced on Android. The image has a fixed width, fixing it now.", daysAgo: 2 },
            { by: "budi", message: "Thanks! Please check iOS Safari too before closing.", daysAgo: 1 },
          ],
        },
        {
          title: "Add a pricing page",
          description: "Three plans side by side with a short FAQ underneath.",
          status: 0, author: "budi", assignee: "dewi", labels: ["Feature"], createdDaysAgo: 6, dueInDays: 9,
        },
        {
          title: "Compress images on the blog",
          description: "Some blog images are over 2MB. Convert them to WebP and lazy-load them.",
          status: 0, author: "andi", labels: ["Improvement"], createdDaysAgo: 4,
        },
        {
          title: "Write the getting started guide",
          description: "A short guide for new customers: sign up, create a project, invite the team.",
          status: 1, author: "budi", assignee: "budi", labels: ["Documentation"], createdDaysAgo: 8, dueInDays: -1,
        },
        {
          title: "Footer links point to the old domain",
          description: "Privacy and Terms still link to the old site.",
          status: 2, author: "dewi", assignee: "dewi", labels: ["Bug"], createdDaysAgo: 10, closed: true,
          replies: [{ by: "dewi", message: "Updated all footer links.", daysAgo: 9 }],
        },
        {
          title: "Pick a font for headings",
          description: "Should we keep Inter for headings or try something with more character?",
          status: 2, author: "andi", labels: ["Question"], createdDaysAgo: 12, closed: true,
        },
      ],
    },
    {
      name: "Mobile App",
      description: "Customer app for Android and iOS.",
      team: "platform",
      color: "#7C3AED",
      icon: "📱",
      owner: "budi",
      members: ["dewi"],
      issues: [
        {
          title: "Login screen freezes after a wrong password",
          description: "After one wrong password the button stays disabled until the app is restarted.",
          status: 1, author: "dewi", assignee: "dewi", labels: ["Bug"], createdDaysAgo: 2, dueInDays: 1,
        },
        {
          title: "Dark mode",
          description: "Follow the phone's theme setting.",
          status: 0, author: "budi", labels: ["Feature"], createdDaysAgo: 5,
        },
        {
          title: "Push notifications for replies",
          description: "Notify people when someone replies to their issue.",
          status: 0, author: "dewi", assignee: "budi", labels: ["Feature", "Improvement"], createdDaysAgo: 7, dueInDays: 14,
        },
      ],
    },
    {
      name: "Helpdesk",
      description: "Questions and problems reported by customers.",
      team: "support",
      color: "#0F766E",
      icon: "🎧",
      owner: "maya",
      members: ["rizky", "dewi"],
      issues: [
        {
          title: "Customer can't reset their password",
          description: "The reset email never arrives for addresses on one provider.",
          status: 1, author: "rizky", assignee: "dewi", labels: ["Bug"], createdDaysAgo: 1, dueInDays: 1,
          replies: [{ by: "maya", message: "Dewi from Platform is helping us with this one.", daysAgo: 0 }],
        },
        {
          title: "How do I export my invoices?",
          description: "A customer asked for a CSV of all invoices from last year.",
          status: 0, author: "rizky", assignee: "rizky", labels: ["Question"], createdDaysAgo: 2,
        },
        {
          title: "Update the refund policy article",
          description: "The help article still says 14 days; the policy is now 30 days.",
          status: 2, author: "maya", assignee: "rizky", labels: ["Documentation"], createdDaysAgo: 9, closed: true,
        },
      ],
    },
  ];

  const now = new Date();
  const teamRows = [
    { slug: "platform", name: "Platform", createdAt: ago(30) },
    { slug: "support", name: "Customer Support", createdAt: ago(30) },
  ];
  const userRows = Object.values(people).map((p, i) => ({
    ...p,
    password,
    isActive: true,
    createdAt: ago(30 - i),
    lastLoginAt: ago(i % 3, i),
  }));
  // Akun nonaktif supaya halaman pengelolaan akun punya contoh status itu.
  userRows.push({
    id: id(),
    name: "Tono Former",
    email: email("tono"),
    role: "user",
    team: "support",
    password,
    isActive: false,
    createdAt: ago(25),
    lastLoginAt: ago(20),
  });

  const projectRows: (typeof projects.$inferInsert)[] = [];
  const memberRows: (typeof projectMembers.$inferInsert)[] = [];
  const statusRows: (typeof ticketStatuses.$inferInsert)[] = [];
  const labelRows: (typeof projectLabels.$inferInsert)[] = [];
  const ticketRows: (typeof tickets.$inferInsert)[] = [];
  const replyRows: (typeof ticketReplies.$inferInsert)[] = [];
  const activityRows: (typeof activity.$inferInsert)[] = [];

  for (const [pi, p] of projectSeeds.entries()) {
    const projectId = id();
    const owner = person(p.owner);
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    projectRows.push({
      id: projectId,
      slug,
      name: p.name,
      description: p.description,
      team: p.team,
      color: p.color,
      icon: p.icon,
      createdBy: owner.id,
      createdAt: ago(20 - pi),
      updatedAt: now,
      issueCounter: p.issues.length,
    });
    memberRows.push({ projectId, userId: owner.id, role: "owner", starred: pi === 0 });
    for (const m of p.members) memberRows.push({ projectId, userId: person(m).id, role: "member", starred: pi === 0 });

    const statusIds = DEFAULT_STATUSES.map((name, order) => {
      const statusId = id();
      statusRows.push({ id: statusId, projectId, name, order });
      return statusId;
    });
    const labelIds = new Map(
      DEFAULT_LABELS.map((l) => {
        const labelId = id();
        labelRows.push({ id: labelId, projectId, ...l });
        return [l.name, labelId] as const;
      })
    );

    for (const [ii, issue] of p.issues.entries()) {
      const ticketId = id();
      const number = ii + 1;
      const author = person(issue.author);
      const assignee = issue.assignee ? person(issue.assignee) : null;
      const createdAt = ago(issue.createdDaysAgo, ii);
      const closedAt = issue.closed ? ago(Math.max(0, issue.createdDaysAgo - 2)) : null;
      ticketRows.push({
        id: ticketId,
        number,
        title: issue.title,
        slug: issueSlug(number, issue.title),
        description: issue.description,
        projectId,
        team: p.team,
        statusId: statusIds[issue.status],
        assignedTo: assignee?.id ?? null,
        labels: (issue.labels ?? []).map((l) => labelIds.get(l)!).filter(Boolean),
        dueDate: issue.dueInDays === undefined ? null : inDays(issue.dueInDays),
        userId: author.id,
        createdBy: author.id,
        referenceCode: referenceCode(),
        createdAt,
        updatedAt: closedAt ?? createdAt,
        closedAt,
        closedBy: closedAt ? (assignee ?? author).id : null,
      });
      activityRows.push({ projectId, ticketId, actorId: author.id, type: "created", createdAt });
      if (assignee) {
        activityRows.push({ projectId, ticketId, actorId: owner.id, type: "assignee", data: { to: assignee.name }, createdAt });
      }
      if (issue.status > 0) {
        activityRows.push({
          projectId,
          ticketId,
          actorId: (assignee ?? author).id,
          type: "status",
          data: { from: DEFAULT_STATUSES[0], to: DEFAULT_STATUSES[issue.status] },
          createdAt: ago(Math.max(0, issue.createdDaysAgo - 1)),
        });
      }
      if (closedAt) activityRows.push({ projectId, ticketId, actorId: (assignee ?? author).id, type: "closed", createdAt: closedAt });
      for (const r of issue.replies ?? []) {
        replyRows.push({ ticketId, userId: person(r.by).id, message: r.message, createdAt: ago(r.daysAgo, 1) });
      }
    }
  }

  // Sedikit riwayat keamanan untuk halaman Security superadmin.
  const eventRows: (typeof authEvents.$inferInsert)[] = [
    ...userRows.filter((u) => u.isActive).map((u) => ({ type: "login_success", userId: u.id, email: u.email, ip: "203.0.113.10", createdAt: u.lastLoginAt })),
    { type: "login_failed", email: email("admin"), ip: "198.51.100.23", createdAt: ago(1, 3) },
    { type: "login_failed", email: email("admin"), ip: "198.51.100.23", createdAt: ago(1, 3) },
    { type: "user_deactivated", userId: userRows[userRows.length - 1].id, actorId: people.maya.id, ip: "203.0.113.10", createdAt: ago(20) },
  ];

  // Satu batch = satu transaksi: kalau ada yang gagal, data demo lama tetap utuh.
  await db.batch([
    db.execute(sql`TRUNCATE TABLE
      activity, attachments, ticket_labels, ticket_replies, tickets, ticket_statuses,
      project_labels, project_members, projects, refresh_tokens, auth_events, login_attempts,
      users, teams
      RESTART IDENTITY CASCADE`),
    db.insert(teams).values(teamRows),
    db.insert(users).values(userRows),
    db.insert(projects).values(projectRows),
    db.insert(projectMembers).values(memberRows),
    db.insert(ticketStatuses).values(statusRows),
    db.insert(projectLabels).values(labelRows),
    db.insert(tickets).values(ticketRows),
    db.insert(ticketReplies).values(replyRows),
    db.insert(activity).values(activityRows),
    db.insert(authEvents).values(eventRows),
  ]);

  return { users: userRows.length, projects: projectRows.length, issues: ticketRows.length };
}
