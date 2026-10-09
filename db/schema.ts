import {
  boolean,
  pgTable,
  text,
  timestamp,
  varchar,
  uuid,
  primaryKey,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { unique } from "drizzle-orm/pg-core";

// --- Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at", { mode: "date" }),
  team: text("team").default("user").notNull(),
  access: text("access").array().default([]),
  avatarUrl: text("avatar_url"),
  // Naik setiap password/role/status berubah; token dengan versi lama otomatis ditolak.
  sessionVersion: integer("session_version").default(0).notNull(),
  // true = user wajib membuat password sendiri sebelum bisa memakai aplikasi
  // (akun baru / password direset admin / password lama tidak memenuhi aturan).
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
});

// --- Categories
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

// --- Priorities
export const priorities = pgTable("priorities", {
  id: uuid("id").primaryKey().defaultRandom(),
  level: varchar("level", { length: 20 }).notNull().unique(), // e.g., low | medium | high
});

// --- Projects
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 100 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    team: text("team").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Identitas project di switcher & header.
    color: varchar("color", { length: 7 }).default("#0f766e").notNull(),
    icon: varchar("icon", { length: 16 }),
    // Penghitung nomor issue per project (#1, #2, ...).
    issueCounter: integer("issue_counter").default(0).notNull(),
  },
  (table) => ({
    uniqueSlugPerTeam: unique().on(table.slug, table.team),
  })
);

// --- Tickets
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description").notNull(),
    status: text("status").default("").notNull(),
    statusId: uuid("status_id")
      .notNull()
      .references(() => ticketStatuses.id, { onDelete: "set null" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    priorityId: uuid("priority_id").references(() => priorities.id, {
      onDelete: "set null",
    }),
    assignedTo: uuid("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    referenceCode: varchar("reference_code", { length: 20 }).notNull().unique(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    team: text("team").notNull().default("cloud"),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    dueDate: timestamp("due_date"),
    labels: text("labels").array().default([]),
    // Nomor issue per project, dipakai untuk #82 dan URL /issues/82.
    number: integer("number"),
    closedAt: timestamp("closed_at"),
    closedBy: uuid("closed_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => ({
    uniqueSlugPerProject: unique().on(table.slug, table.projectId),
    uniqueNumberPerProject: unique().on(table.projectId, table.number),
  })
);

// --- Ticket Statuses
export const ticketStatuses = pgTable("ticket_statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  order: integer("order").default(0), // optional, buat urutan
});

// --- Ticket Labels
export const ticketLabels = pgTable(
  "ticket_labels",
  {
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ticketId, table.label] }),
  })
);

// --- Ticket Replies
export const ticketReplies = pgTable("ticket_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Attachments
export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// --- Project Members (akses per project)
export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).default("member").notNull(), // owner | member
    starred: boolean("starred").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.userId] }),
    userIdx: index("project_members_user_idx").on(table.userId),
  })
);

// --- Project Labels (label didefinisikan per project)
export const projectLabels = pgTable(
  "project_labels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    color: varchar("color", { length: 7 }).default("#71717a").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueNamePerProject: unique().on(table.projectId, table.name),
  })
);

// --- Activity (riwayat perubahan issue & project)
export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: varchar("type", { length: 40 }).notNull(),
    data: jsonb("data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    ticketIdx: index("activity_ticket_idx").on(table.ticketId),
    projectIdx: index("activity_project_idx").on(table.projectId, table.createdAt),
  })
);

// Penghitung gagal login (per email / per IP) untuk menahan brute force.
export const loginAttempts = pgTable("login_attempts", {
  key: varchar("key", { length: 200 }).primaryKey(),
  failures: integer("failures").default(0).notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).defaultNow().notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

// Refresh token: hanya hash SHA-256 yang disimpan. Satu login = satu "family"; setiap refresh
// mencabut token lama dan membuat token baru di family yang sama (rotasi).
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid("family_id").notNull(),
    // users.session_version saat token dibuat; berbeda = sesi sudah dicabut (password/role/status).
    sessionVersion: integer("session_version").default(0).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedBy: uuid("replaced_by"),
    userAgent: varchar("user_agent", { length: 255 }),
    ip: varchar("ip", { length: 64 }),
  },
  (table) => ({
    userIdx: index("refresh_tokens_user_idx").on(table.userId),
    familyIdx: index("refresh_tokens_family_idx").on(table.familyId),
  })
);

// Log keamanan: login berhasil/gagal/diblokir, ganti/reset password, pencurian token, dll.
// Ditampilkan ke admin di halaman Security; disimpan 90 hari.
export const authEvents = pgTable(
  "auth_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: varchar("type", { length: 40 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: varchar("email", { length: 100 }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdIdx: index("auth_events_created_idx").on(table.createdAt),
    userIdx: index("auth_events_user_idx").on(table.userId),
  })
);
