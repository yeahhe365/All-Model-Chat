# Contributing

Thanks for helping improve AMC WebUI.

## Workflow

1. Search existing issues and pull requests before opening a new one.
2. Create focused issues with reproduction steps, environment details, and screenshots or logs when useful.
3. Keep pull requests small and scoped to one behavior change when possible.
4. Run the relevant checks before opening a pull request.

## Local Development

```bash
npm ci --legacy-peer-deps
npm run dev
```

Useful verification commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

For end-to-end coverage:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

## Pull Requests

Include a short summary, verification notes, and screenshots for UI changes. If a change affects storage, model behavior, deployment, or user data migration, call that out explicitly in the PR body.
