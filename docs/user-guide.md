# User guide

This guide is for people who use Ticketing MS day to day. To install and run your own copy, see the [self-hosting guide](self-hosting.md).

- [Roles](#roles)
- [Your account](#your-account)
- [For staff](#for-staff): [dashboard](#your-dashboard), [projects](#projects), [issues](#issues), [project settings](#project-settings-owners)
- [For admins](#for-admins)
- [Common questions](#common-questions)

## Roles

There are two kinds of account:

| Role | What they do |
|---|---|
| **Staff** | Work on issues in the projects they belong to. Every staff account belongs to one team: Cloud, DevOps or PM. |
| **Admin** | Look after people and account security. Admins don't take part in projects or issues. |

Inside a project, a staff member is either an **owner** or a **member**:

| | Member | Owner |
|---|---|---|
| View, create and edit issues, comment, close and reopen | ✓ | ✓ |
| Create and edit labels | ✓ | ✓ |
| Leave the project | ✓ | ✓ |
| Add and remove members, change their role | | ✓ |
| Delete labels | | ✓ |
| Add, rename, reorder and delete board columns | | ✓ |
| Change the project's name, description, color and icon | | ✓ |
| Delete the project | | ✓ |

The person who creates a project becomes its owner. A project always keeps at least one owner.

## Your account

### Signing in

Sign in with the email and password your admin gave you. There's no self sign-up: if you need an account or forgot your password, ask your admin.

After 5 wrong passwords for the same email, sign-in is locked for 15 minutes. Wait, then try again, or ask an admin to reset your password.

### Setting your own password

When an admin creates your account or resets your password, you have to choose a new password the first time you sign in. Until you do, the only page you can open is **Set a new password**.

A password must:

- be at least 10 characters
- mix at least 3 of: lowercase letters, uppercase letters, digits, symbols. A passphrase of 16 or more characters doesn't need the mix.
- not be a common password, a simple pattern (like `aaaa` or `123456`), or contain part of your name or email
- not appear in a known data breach. This is checked through Have I Been Pwned without sending your password.

### Your profile

Open your profile from the menu with your avatar. There you can change:

- your **photo** (JPG, PNG or WEBP, up to 2 MB), or remove it
- your **name**
- your **email**, which needs your current password
- your **password**. Changing it signs you out on every other device.

Your role and team are set by an admin.

### Sessions

You stay signed in for up to 7 days of inactivity, and at most 30 days from when you signed in. When an admin changes your role, resets your password or deactivates your account, you're signed out everywhere.

## For staff

### Your dashboard

The dashboard shows, for open issues across all your projects:

- **Assigned to you**, **Created by you**, **Overdue** and **Due this week** counts
- the issues assigned to you, soonest due first
- recent activity in your projects
- your projects, with starred ones marked

**My issues** lists every issue assigned to you or created by you, across all projects, with Open / Closed / All tabs and a search box.

### Projects

**Creating a project.** Go to **Projects → New project**. Give it a name, and optionally a description, a color and an icon (a letter or an emoji). The project is created in your team, but you can add members from any team. A new project starts with:

- board columns **To Do**, **In Progress** and **Done**
- labels **Bug**, **Feature**, **Improvement**, **Documentation** and **Question**

**Finding your way around.**

- The project switcher at the top of the sidebar lists your projects, grouped by team.
- Star a project to pin it in the sidebar's **Starred** section.
- Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (<kbd>⌘</kbd> + <kbd>K</kbd> on a Mac) to jump to a page, a project, or an issue by title or `#number`. Use the arrow keys and <kbd>Enter</kbd> to open a result, <kbd>Esc</kbd> to close.

You only see projects you're a member of. To join one, ask one of its owners to add you.

### Issues

Every issue has a number per project, like `#82`.

**Creating an issue.** Use **New issue** in the project, or **Add issue** under a board column to start in that column. Fill in:

- **Title** (required)
- **Description** in Markdown
- **Column**, **assignee** (a project member), **labels** and **due date**. You can create a new label right from the picker.

**Three views.** The Issues page has three views of the same issues, sharing the same filters:

| View | What it shows |
|---|---|
| **List** | Every issue with its labels, column, checklist progress, due date, assignee and comment count. Use the Open / Closed / All tabs. |
| **Board** | One column per board column. Drag a card to move the issue to another column. Closed issues aren't shown on the board. |
| **Calendar** | Issues on their due date, month by month. Issues without a due date aren't shown. |

Filter by label or assignee, search by title or `#number`, and sort by last updated, created date, due date or issue number.

**Opening an issue.** Click an issue to open it in a side panel. **Open full page** gives it its own page you can share. Press <kbd>Esc</kbd> to close the panel.

**Working on an issue.**

- Click the title to rename it. Use **Edit description** to change the description.
- Change the column, assignee, labels and due date from the side of the issue.
- **Close issue** marks it as done without deleting it, and **Reopen** brings it back. Closing doesn't move it to another column.
- The issue's history (created, moved, assigned, relabeled, renamed, due date changed, closed, reopened) is shown together with the comments.

**Checklists.** Write task lines in the description:

```markdown
- [ ] Reproduce on staging
- [x] Collect logs
```

They show as a checklist with a progress bar. Tick items directly, or use **Add an item**.

**Images.** Paste or drag an image into the description or a comment, or use **Attach image**. JPG, PNG and WEBP up to 5 MB are accepted. Images from other websites can't be shown; upload them instead.

**Editor shortcuts.** <kbd>Ctrl</kbd> + <kbd>B</kbd> bold, <kbd>Ctrl</kbd> + <kbd>I</kbd> italic, <kbd>Ctrl</kbd> + <kbd>K</kbd> link. Switch between **Write** and **Preview** to check the result.

**Comments.** Write in Markdown and press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to send. The author of a comment and project owners can delete it. Comments can't be edited after they're posted.

**Deleting an issue.** The author or a project owner can delete an issue. This removes it with its comments and history for good; closing it is usually the better choice.

### Project settings (owners)

- **Members**: add active staff from any team as owner or member, change their role, or remove them. Removing someone unassigns their issues in the project. Members can leave a project themselves.
- **Labels**: anyone in the project can create and edit labels, with a name, color and description. Only owners can delete them.
- **Board columns** (in Settings): add, rename and reorder columns. To delete a column, choose where its issues go. The last column can't be deleted.
- **Project details** (in Settings): name, description, color and icon.
- **Delete project** (in Settings): type the project's name to confirm. This deletes all its issues and can't be undone.

The **Activity** page shows the latest 100 changes in the project.

## For admins

### Dashboard

The admin dashboard shows the number of members, who is online now, admin accounts and accounts that need attention, plus the latest members, recent sign-ins and members by team.

**Needs attention** flags:

- an active account using an `@example.com` email, which is usually a leftover seed account
- more than 3 admin accounts
- accounts with no activity for over 30 days
- accounts that have never signed in

### Creating an account

Go to **New user**. Enter the name, email, role and team, and a password. Use **Generate** for a strong random one. Share the password with the person safely. They'll have to change it the first time they sign in.

Staff belong to Cloud, DevOps or PM. Admins have no team.

### Managing accounts

On **Users** you can filter by All / Admins / Active / Deactivated and search by name or email. For each account you can:

- **Change role**: signs the person out everywhere. Turning a staff member into an admin removes them from their projects and unassigns their issues.
- **Change team** (staff only).
- **Deactivate**: the person can no longer sign in and is signed out everywhere. Projects they owned are handed to the longest-standing active member. **Activate** lets them back in.
- **Reset password**: type a new password, or leave it empty to get a temporary one like `k7mp-x3qa-9tfe`. It's shown only once, so copy it. The person must change it at their next sign-in and is signed out everywhere.

You can't change your own role, deactivate yourself or reset your own password here. Accounts can't be deleted. Project memberships are managed by project owners, not admins.

### Account security

**Account security** shows the same findings as the dashboard, the admin and deactivated accounts, and a security log with sign-ins, failed and blocked sign-ins, and account changes, each with IP address and device. Filter by **Needs attention**, **Sign-ins** or **Account changes**. Events are kept for 90 days.

Watch for **token reuse** events: they mean an old session token was used again, which can be a sign that a session was stolen. That session has already been revoked; resetting the person's password is a good next step.

## Common questions

**I forgot my password.** Ask an admin to reset it. You'll get a temporary password and choose your own after signing in.

**It says "Too many sign-in attempts".** Wait 15 minutes, then try again with the right password.

**I can't see a project my teammates use.** You're not a member yet. Ask one of its owners to add you.

**Where did my issue go on the board?** Closed issues aren't shown on the board. Find them in the List view under **Closed**.
