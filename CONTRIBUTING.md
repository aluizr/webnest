# Contributing

Thanks for contributing to WebNest.

## Development Setup

1. Install dependencies:

```sh
npm ci
```

1. Start development server:

```sh
npm run dev
```

## Quality Checks

Before opening a pull request, run:

```sh
npm run lint
npm test
npm run build
```

## Branching and PR

- Create small, focused branches per change.
- Use clear commit messages.
- Open PRs with a concise summary and context.
- Link related issues when applicable.

## Security and Secrets

- Never commit `.env` files or credentials.
- Use `.env.example` to document required variables.
- Report security concerns privately.

## Scope Guidelines

- Keep PRs easy to review.
- Separate refactors from feature work when possible.
- Update docs/changelog for user-visible behavior changes.
