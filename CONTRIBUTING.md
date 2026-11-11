# Contributing

Thanks for wanting to help. Bug reports, fixes, docs and small features are all welcome.

## Before you start

- For anything bigger than a small fix, open an issue first and describe what you want to change. It saves you from building something that won't be merged.
- Security problems go through private reporting, not issues. See [SECURITY.md](SECURITY.md).

## Set up

Follow [Getting started](README.md#getting-started) in the README. Use your own database for development, never a production one: the seed script and migrations write to whatever `DATABASE_URL` points at.

## Making a change

1. Fork the repository and create a branch from `main`.
2. Keep the change focused on one thing.
3. Before you open a pull request, run:

   ```bash
   npm run lint
   npx tsc --noEmit
   npm run build
   ```

4. If you change the database schema, edit `db/schema.ts` and say in the pull request how existing databases should be migrated.
5. If you change what users see or do, update [docs/user-guide.md](docs/user-guide.md) in the same pull request.

## Pull requests

- Describe what changed and why, and how you tested it.
- Add screenshots for UI changes.
- Never include credentials, connection strings or real user data, including in screenshots.

## Code style

Match the code around your change: the same naming, the same Tailwind tokens (`tk-*` colors in `app/globals.css`), and the same amount of comments. Existing comments are in Indonesian or English; either is fine.

By contributing, you agree that your contribution is licensed under the [MIT license](LICENSE).
