# Contributing to LogBook.ID

Thank you for considering contributing! This document outlines the guidelines for contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize code quality and security

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/Aepra/LogBookIGenerate.git
   cd logbook-generate
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env.local` and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   Required credentials:
   - Google OAuth Client ID + Secret (Google Cloud Console)
   - Supabase project credentials (Supabase Dashboard)
   - NextAuth secret (generate with `openssl rand -base64 32`)

4. **Run development server**

   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a feature branch from `main`
2. Make changes following the project structure
3. Test thoroughly
4. Create a pull request

## Project Structure

```
logbook-generate/
├── app/                   # Next.js App Router
│   ├── api/               # API route handlers
│   └── logbook/           # Page routes
├── components/            # React components (Client & Server)
├── docs/                  # Documentation
│   └── audit/             # Code audit reports
├── lib/                   # Utility functions & helpers
├── public/                # Static assets
├── scripts/               # CLI scripts (future)
├── services/              # Business logic layer
└── types/                 # TypeScript type declarations
```

## Coding Standards

### General

- **TypeScript** — strict mode enabled, no `any` without justification
- **Prettier** — use default config for formatting
- **ESLint** — configured for Next.js best practices

### Service Layer

- `services/` is the **only** layer that makes API calls (Google Drive, Google Docs)
- Never embed `fetch()` to external APIs in route handlers or components
- Services return typed objects, never raw API responses

### API Routes

- Route handlers delegate to services; no business logic in routes
- Validate input (formData, JSON body) before delegation
- Return structured errors with `code` for client-side handling

### Error Handling

- Log meaningful context: operation name, error details, relevant IDs
- Return user-facing messages in Indonesian
- Use structured error codes (`NO_ACCESS_TOKEN`, `TOKEN_EXPIRED_NO_REFRESH`)

## Commit Messages

Follow conventional commits:

```
feat: add photo upload with folder caching
fix: handle token expiry in upload route
refactor: move components to root level
docs: add CONTRIBUTING guide
chore: update dependencies
```

## Pull Request Process

1. Ensure build passes: `npm run build`
2. Update documentation if adding/changing features
3. Reference related issues in PR description
4. Request review from maintainers