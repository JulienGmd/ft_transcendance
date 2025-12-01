# Copilot Instructions

## Code Generation Policy

**Do NOT write code unless explicitly asked by the user.**

When the user does request code, follow these principles:

## Code Style Guidelines

- Write **clean**, **modern**, and **simple** code
- **Simplicity is key** - avoid over-engineering
- Prioritize readability and maintainability
- Use clear, descriptive names for variables and functions
- Keep functions small and focused on a single responsibility

## Communication

- Answer questions directly without writing code
- Suggest approaches and explain concepts when asked
- Only implement solutions when explicitly requested

## Frontend Architecture

Custom SPA using vanilla TypeScript (no React/Vue):

- **Structure**: Each page = HTML file in `public/` + optional TS module in `src/client/` (imported with <script src="/public/scriptName.js">)
- **Router**: Client-side routing in `router.ts` handles navigation without reloads
- **Components**: Reusable UI functions in `src/client/components/`
- **Server**: Express serves static files + live reload
- **Styling**: Tailwind CSS, no build step needed
- **Auth**: JWT in httpOnly cookies, fetch API for backend communication
