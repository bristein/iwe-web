# IWE Web - AI-Powered Writing Platform

## Purpose

IWE Web is an AI-powered platform designed for authors to write books, short stories, and multi-book epics. The system helps authors manage their world bibles and will use AI agents to assist with content editing, story ideation, and story generation. Authors can create projects representing single books, book series, or short stories, with comprehensive tools for world-building and narrative development.

## Technologies

### Frontend

- **Next.js 15.4** - React framework with App Router for server-side rendering and optimized performance
- **React 19** - UI component library
- **Chakra UI v3** - Component library and design system with built-in theming
- **Framer Motion** - Animation library for smooth UI transitions
- **React Icons** - Icon library for UI elements

### Backend & Database

- **MongoDB** - NoSQL database for storing user data and writing projects
- **Next.js API Routes** - Backend API endpoints for authentication and data management
- **Jose** - JWT token handling for secure authentication
- **Bcrypt** - Password hashing for security

### AI & Automation (Future Implementation)

- **Mastra 0.10.21** - AI agent orchestration framework (installed, pending implementation)

### Development & Testing

- **TypeScript 5.9** - Type-safe development
- **Playwright** - End-to-end testing framework
- **ESLint & Prettier** - Code quality and formatting
- **Husky & Lint-staged** - Git hooks for code quality on commit

## Architecture

### Application Structure

- **Frontend**: Next.js App Router with server and client components
- **Authentication**: JWT-based auth with HTTP-only cookies
- **API Layer**: RESTful API routes with rate limiting
- **Database**: MongoDB with collections for users and projects
- **Middleware**: Authentication checks and route protection

### Security Features

- Password hashing with bcrypt
- JWT tokens for session management
- Rate limiting on API endpoints
- Protected routes with middleware
- Secure cookie handling

## Project Structure

```
iwe-web/
├── middleware.ts          # ✅ Next.js middleware for auth (CORRECT LOCATION - root)
├── app/                   # Next.js App Router directory
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints (login, signup, logout, me)
│   │   ├── health/       # Health check endpoint
│   │   ├── projects/     # Project management endpoints
│   │   └── users/        # User management endpoints
│   ├── contexts/         # React contexts (AuthContext)
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   └── portal/           # Protected dashboard for managing projects
├── components/            # ✅ ALL reusable UI components (CONSOLIDATED)
│   ├── form/             # Form-specific components
│   ├── layout/           # Layout components (cards, containers)
│   ├── ui/               # Base UI components
│   └── index.ts          # Barrel exports for clean imports
├── lib/                   # Shared utilities and configurations
│   ├── models/           # MongoDB models (User, Project)
│   ├── validation/       # Zod schemas for data validation
│   ├── auth.ts           # Authentication utilities
│   ├── auth-config.ts    # Auth configuration and validation
│   ├── mongodb.ts        # Database connection and helpers
│   ├── rate-limit.ts     # API rate limiting
│   └── theme.ts          # Chakra UI theme configuration
├── tests/                 # Test suites
│   ├── api/              # Vitest API tests (fast, no browser)
│   ├── integration/      # Playwright E2E tests (browser-based)
│   └── utils/            # Shared test utilities
├── scripts/              # Database setup scripts
└── .claude/              # Claude AI agent configurations
    └── agents/           # Custom agent definitions
```

## Code Organization Guidelines

### Component Location Rules

1. **ALL reusable components go in `/components`** at the root level
   - `/components/ui/` - Base UI components (buttons, inputs, modals)
   - `/components/form/` - Form-specific components
   - `/components/layout/` - Layout components (cards, containers, grids)
   - Use the barrel export pattern with `index.ts` for clean imports

2. **DO NOT create components in `/app`**
   - The `/app` directory is for routes, layouts, and pages only
   - If you need a component, put it in `/components`

3. **Middleware stays in the root**
   - `middleware.ts` must remain in the project root (Next.js convention)
   - This handles authentication and route protection

### Import Conventions

```typescript
// ✅ CORRECT - Import from /components
import { FormButton, FormField } from '@/components';
import { ColorModeButton } from '@/components/ui/color-mode';

// ❌ WRONG - Never import from /app/components
import { FormButton } from '@/app/components'; // DON'T DO THIS
```

### File Organization Best Practices

1. **Backend utilities go in `/lib`**
   - Database models, connections, and utilities
   - Authentication logic and helpers
   - Validation schemas
   - Rate limiting and other middleware utilities

2. **API routes stay in `/app/api`**
   - Follow Next.js App Router conventions
   - Use `route.ts` files for API endpoints

3. **Test organization**
   - `/tests/api/` - Vitest tests for API endpoints (fast, no browser)
   - `/tests/integration/` - Playwright tests for E2E flows (browser-based)
   - Choose the right tool: Vitest for APIs, Playwright for UI

4. **Context providers in `/app/contexts`**
   - Keep close to where they're used in the app
   - AuthContext and other app-wide contexts

### When Adding New Code

- **New component?** → Put it in `/components` with appropriate subfolder
- **New API endpoint?** → Create in `/app/api/[endpoint]/route.ts`
- **New utility function?** → Add to `/lib` in the appropriate file
- **New test?** → API test in `/tests/api`, E2E test in `/tests/integration`
- **New page?** → Create in `/app/[page]/page.tsx`

## Development Workflow

### Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Configure MONGODB_URI and JWT_SECRET

# Run development server
pnpm dev

# Run with rate limiting disabled (for testing)
DISABLE_RATE_LIMIT=true pnpm dev
```

### Database Management

```bash
# Set up database indexes
pnpm run setup-db-indexes

# List test users in database
pnpm db:list

# Clean test data from database
pnpm db:clean
```

### Code Quality

```bash
# Run linting
pnpm lint

# Format code
pnpm format

# Check formatting
pnpm format:check

# Type checking
npx tsc --noEmit
```

### Building & Deployment

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:auth           # Authentication tests
pnpm test:improved       # Improved auth tests with fixtures

# Interactive test modes
pnpm test:ui            # Open Playwright UI
pnpm test:debug         # Debug mode
pnpm test:headed        # Run with browser visible

# Browser-specific tests
pnpm test:chrome        # Chrome only
pnpm test:mobile        # Mobile viewport

# Test cleanup
pnpm test:cleanup       # Clean test data
```

### Test Strategy

- **E2E Tests**: Comprehensive Playwright tests covering authentication, user flows, and API endpoints
- **Test Fixtures**: Reusable test utilities in `tests/utils/` for consistent testing
- **Test Data Management**: Automated cleanup of test users and data
- **Environment Isolation**: Separate `.env.test` configuration for testing

### Key Test Areas

1. **Authentication**: Login, signup, logout, session management
2. **Portal Access**: Protected route access and user dashboard
3. **API Endpoints**: Direct API testing for all endpoints
4. **Form Validation**: Input validation and error handling
5. **Security**: XSS protection, rate limiting, token validation

## Agents

The project includes custom Claude AI agents for specialized tasks:

### code-reviewer

**Purpose**: Comprehensive code review with focus on understanding intent before critiquing
**When to use**: After implementing new features or making significant code changes
**Strengths**: Security analysis, performance optimization, maintainability assessment

### frontend-ui-engineer

**Purpose**: UI/UX implementation and testing with Next.js, Chakra UI, and TypeScript
**When to use**: When creating or modifying UI components, implementing responsive designs, or updating Playwright tests
**Strengths**: Component architecture, accessibility, visual testing

### test-engineer-sdet

**Purpose**: Test creation, improvement, and reliability enhancements
**When to use**: When writing new tests, fixing flaky tests, or improving test architecture
**Strengths**: Test abstractions, parameterized testing, reliability improvements

### ux-ui-designer

**Purpose**: Design user interfaces and improve user experience
**When to use**: When designing new features, creating layouts, or improving visual design
**Strengths**: Design systems, responsive layouts, accessibility standards

## Useful Commands

```bash
# Development
pnpm dev                          # Start development server
DISABLE_RATE_LIMIT=true pnpm dev # Dev without rate limiting
pnpm build                        # Build for production
pnpm start                        # Start production server

# Testing
pnpm test                         # Run all tests
pnpm test:ui                      # Playwright UI mode
pnpm test:debug                   # Debug tests
pnpm db:list                      # List test database entries
pnpm db:clean                     # Clean test data

# Code Quality
pnpm lint                         # Run ESLint
pnpm format                       # Format with Prettier
npx tsc --noEmit                  # Type checking

# Git Operations
git status                        # Check changes
git diff                          # View uncommitted changes
git log --oneline -10            # Recent commits
```

## Environment Variables

Required environment variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `DISABLE_RATE_LIMIT` - Optional: disable rate limiting for development/testing

## Notes

- MongoDB database name: `iwe-backend`
- Collections: `users`, `projects` (world bibles will be added in future)
- Authentication uses HTTP-only cookies with JWT tokens
- Rate limiting is applied to API endpoints (configurable)
- The portal is the main dashboard for logged-in users to manage their writing projects
- AI agent integration with Mastra is planned for future implementation
- never use the --no-verify flag when committing code, always fix failing builds or tests

- when analyzing failing tests, fixing tests, or updating tests or the test framework in any way, use @agent-test-engineer-sdet
