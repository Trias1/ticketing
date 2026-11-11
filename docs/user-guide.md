# User guide

This guide is for people who use Ticketing MS day to day. To install and run your own copy, see the [self-hosting guide](self-hosting.md).

- [Roles](#roles)
- [Your account](#your-account)
- [Working in projects](#working-in-projects): [dashboard](#your-dashboard), [projects](#projects), [issues](#issues), [project settings](#project-settings-owners)
- [For team admins](#for-team-admins)
- [For superadmins](#for-superadmins)
- [Common questions](#common-questions)

## Roles

There are three kinds of account:

| Role | What they do |
|---|---|
| **User** | Works on issues in the projects they belong to. Belongs to one team: Cloud, DevOps or PM. |
| **Admin** | A user who also looks after the accounts in their own team: creates users, resets their passwords and deactivates them. Works in projects like any user. |
| **Superadmin** | Looks after every account, account security and monitoring. Superadmins never see projects or issues. |

Who can create which account:

| | Can create |
|---|---|
| Superadmin | Superadmins, admins and users, in any team |
| Admin | Users in their own team only |
| User | Nobody |

There's no self sign-up. New accounts start with a temporary password that has to be changed at the first sign-in.

Inside a project, an admin or user is either an **owner** or a **member**:

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

Sign in with the email and password you were given. There's no self sign-up: if you need an account or forgot your password, ask your team's admin.

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

Your role and team are set by a superadmin.

### Sessions

You stay signed in for up to 7 days of inactivity, and at most 30 days from when you signed in. When your role is changed, your password is reset or your account is deactivated, you're signed out everywhere.

## Working in projects

This part is for users and admins. Superadmins don't work in projects.

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

- **Members**: add active users and admins from any team as owner or member, change their role, or remove them. Removing someone unassigns their issues in the project. Members can leave a project themselves.
- **Labels**: anyone in the project can create and edit labels, with a name, color and description. Only owners can delete them.
- **Board columns** (in Settings): add, rename and reorder columns. To delete a column, choose where its issues go. The last column can't be deleted.
- **Project details** (in Settings): name, description, color and icon.
- **Delete project** (in Settings): type the project's name to confirm. This deletes all its issues and can't be undone.

The **Activity** page shows the latest 100 changes in the project.

## For team admins

An admin works in projects like any user, and also looks after the user accounts in their own team. The **Your team** section of the sidebar has two pages:

- **Team members** lists everyone in your team. For users in your team you can **reset the password** (type one, or leave it empty to get a temporary one like `k7mp-x3qa-9tfe`, shown only once) and **deactivate** or **activate** the account. Both sign the person out everywhere.
- **New user** creates a user in your team. Use **Generate** for a strong temporary password and share it safely; the person changes it at their first sign-in.

You can't change anyone's role or team, and you can't manage other admins or superadmins. Ask a superadmin for that. Adding people to projects is done by the project's owners.

## For superadmins

Superadmins look after every account and the security of the whole app. Following the rule that people outside a team don't read its work, superadmins **never see projects or issues**, not even counts.

### Dashboard

The dashboard shows the number of accounts, who is online now, superadmin accounts and accounts that need attention, plus the latest accounts, recent sign-ins and accounts by team.

**Needs attention** flags:

- an active account using an `@example.com` email, which is usually a leftover seed account
- more than 3 superadmin accounts
- accounts with no activity for over 30 days
- accounts that have never signed in

### Creating an account

Go to **New user**. Enter the name, email and a password, then choose the role: **User**, **Admin** or **Superadmin**. Users and admins also get a team (Cloud, DevOps or PM); superadmins have none. Use **Generate** for a strong random password and share it safely. The person changes it the first time they sign in.

### Managing accounts

On **Users** you can filter by All / Admins / Active / Deactivated and search by name or email. **Admins** lists superadmins and admins. For each account you can:

- **Change role**: signs the person out everywhere. Turning someone into a superadmin removes them from their projects and unassigns their issues.
- **Change team** (users and admins).
- **Deactivate**: the person can no longer sign in and is signed out everywhere. Projects they owned are handed to the longest-standing active member. **Activate** lets them back in.
- **Reset password**: type a new password, or leave it empty to get a temporary one. It's shown only once, so copy it. The person must change it at their next sign-in.

You can't change your own role, deactivate yourself or reset your own password here. Accounts can't be deleted. Project memberships are managed by project owners.

### Account security

**Account security** shows the same findings as the dashboard, the superadmin and deactivated accounts, and a security log with sign-ins, failed and blocked sign-ins, and account changes, each with IP address and device. Filter by **Needs attention**, **Sign-ins** or **Account changes**. Events are kept for 90 days.

Watch for **token reuse** events: they mean an old session token was used again, which can be a sign that a session was stolen. That session has already been revoked; resetting the person's password is a good next step.

## Common questions

**I forgot my password.** Ask your team's admin, or a superadmin, to reset it. You'll get a temporary password and choose your own after signing in.

**It says "Too many sign-in attempts".** Wait 15 minutes, then try again with the right password.

**I can't see a project my teammates use.** You're not a member yet. Ask one of its owners to add you.

**Where did my issue go on the board?** Closed issues aren't shown on the board. Find them in the List view under **Closed**.
