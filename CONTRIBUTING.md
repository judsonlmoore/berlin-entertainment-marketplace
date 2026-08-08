# Contributing to Berlin Entertainment Marketplace

Thank you for contributing! This guide will help you set up your development environment and understand our workflow.

## Getting Started

### Prerequisites

- Node.js 22 or higher
- npm (comes with Node.js)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd berlin-entertainment-marketplace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   
   This will automatically:
   - Install all project dependencies
   - Set up Git hooks via Husky (pre-commit and pre-push hooks)

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in the required values

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Before You Start Coding

1. Pull the latest changes from `main`:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### While Coding

#### Automatic Code Quality Checks

We have **automatic pre-commit hooks** that will:
- ✨ Auto-format your code with Prettier
- 🔍 Auto-fix ESLint issues
- ⚠️  Block commits if there are unfixable issues

**You don't need to manually run format commands** - the hooks do it for you!

#### VS Code Setup (Recommended)

If you're using VS Code, the project includes settings that will:
- Auto-format on save
- Auto-fix ESLint issues on save
- Use the project's TypeScript version

Just install the recommended extensions when prompted.

#### Manual Commands

If you want to run checks manually:

```bash
# Format all files
npm run format

# Check formatting without fixing
npm run format:check

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run all checks (format, typecheck, lint, test, build)
npm run check
```

### Before Pushing

When you try to push, the **pre-push hook** will automatically:
- ✅ Run TypeScript type checking
- ✅ Run the full test suite

If either fails, the push will be blocked. Fix the issues and try again.

### Committing Your Changes

1. **Stage your changes:**
   ```bash
   git add .
   ```

2. **Commit with a clear message:**
   ```bash
   git commit -m "feat: add user authentication"
   ```
   
   The pre-commit hook will automatically:
   - Format your staged files with Prettier
   - Fix auto-fixable ESLint issues
   - Prevent the commit if there are errors

3. **Push your changes:**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   The pre-push hook will run type checks and tests.

### Creating a Pull Request

1. Push your feature branch to GitHub
2. Create a Pull Request targeting the `main` branch
3. Wait for CI checks to pass
4. Request review from team members

## CI/CD Pipeline

Our GitHub Actions CI runs on every pull request and push to main:

1. **Code Formatting Check** - Ensures consistent code style
2. **Type Checking** - Validates TypeScript types
3. **Linting** - Checks for code quality issues
4. **Tests** - Runs the full test suite
5. **Build** - Ensures the app builds successfully

**All checks must pass before merging.**

## Troubleshooting

### "Code formatting issues found" in CI

If CI fails on formatting:
```bash
npm run format
git add .
git commit -m "fix: format code"
git push
```

This shouldn't happen if you have pre-commit hooks installed!

### Pre-commit hooks not working

Reinstall hooks:
```bash
npm run prepare
```

### Tests failing locally

1. Ensure you have the latest dependencies:
   ```bash
   npm install
   ```

2. Check if your environment variables are set correctly

3. Run tests in watch mode to debug:
   ```bash
   npm run test:watch
   ```

### Type errors

Run the type checker to see detailed errors:
```bash
npm run typecheck
```

## Code Style

- **Formatting**: Handled automatically by Prettier (via pre-commit hooks)
- **Linting**: ESLint rules are enforced
- **TypeScript**: Strict mode enabled

## Database

### Running Migrations

```bash
npm run db:migrate
```

### Generating New Migrations

```bash
npm run db:generate
```

### Seeding Database

```bash
npm run db:seed
```

### Database Studio

```bash
npm run db:studio
```

## Questions?

If you have questions or run into issues:
- Check existing issues on GitHub
- Ask in the team chat
- Create a new issue with the `question` label

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run format` | Format all files |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Lint code |
| `npm run test` | Run tests |
| `npm run check` | Run all checks |
| `npm run prepare` | Set up Git hooks |

---

Happy coding! 🚀
