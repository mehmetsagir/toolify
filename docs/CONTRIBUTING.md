# Contributing to Toolify

Thank you for your interest in contributing to Toolify! This guide will help you get started and ensure your contributions can be effectively reviewed and integrated.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Testing Expectations](#testing-expectations)
- [Code Review Criteria](#code-review-criteria)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Project Governance](#project-governance)
- [Getting Help](#getting-help)

## Code of Conduct

Be respectful, inclusive, and constructive. We aim to maintain a welcoming environment for all contributors. Disagreement is fine, but respect is mandatory.

## Getting Started

### Prerequisites

- **macOS**: 10.12 or later (Toolify is macOS-specific)
- **Node.js**: Latest LTS version (check `.nvmrc` if present)
- **npm**: Comes with Node.js
- **Git**: For version control
- **OpenAI API Key**: Required for testing transcription features

### Initial Setup

1. **Fork and Clone**

```bash
# Fork the repository on GitHub
# Clone your fork locally
git clone https://github.com/YOUR_USERNAME/toolify.git
cd toolify

# Add the original repository as upstream
git remote add upstream https://github.com/mehmetsagir/toolify.git
```

2. **Install Dependencies**

```bash
npm install
```

3. **Development Mode**

```bash
npm run dev
```

This starts Electron with hot-reload enabled for the renderer process.

4. **Verify Setup**

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Format code
npm run format
```

### Project Structure

```
toolify/
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Electron preload scripts (IPC bridge)
│   ├── renderer/       # React UI (renderer process)
│   └── shared/         # Shared TypeScript types and utilities
├── docs/               # Project documentation
├── resources/          # Static assets (icons, images)
├── scripts/            # Build and utility scripts
└── electron.vite.config.ts  # Electron + Vite configuration
```

Key files to understand:

- `src/main/index.ts` - Main process entry point
- `src/preload/index.ts` - Type-safe IPC bridge
- `src/shared/types/` - TypeScript type definitions
- `eslint.config.mjs` - Linting configuration
- `package.json` - Dependencies and scripts

## Development Workflow

### 1. Create a Branch

Always create a branch for your work. Never work directly on `master`.

```bash
git checkout master
git pull upstream master
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes
- `chore/` - Maintenance tasks
- `style/` - Code style changes (no logic change)

### 2. Make Changes

- Write clean, readable code
- Follow the code style guidelines (below)
- Test your changes thoroughly
- Update documentation if needed

### 3. Run Quality Checks

Before committing, always run:

```bash
# Type checking (must pass)
npm run typecheck

# Linting (must pass)
npm run lint

# Format code (automatically fixes issues)
npm run format
```

### 4. Commit Changes

Use [Conventional Commits](#commit-message-conventions) format:

```bash
git add .
git commit -m "feat: add new transcription language support"
```

### 5. Sync and Push

```bash
# Keep your branch up to date
git fetch upstream
git rebase upstream/master

# Push to your fork
git push origin feature/your-feature-name
```

### 6. Create Pull Request

See [Pull Request Process](#pull-request-process).

## Code Style Guidelines

### TypeScript

- **Type Safety**: Always define types. Avoid `any`.
- **Interfaces vs Types**: Use `interface` for object shapes, `type` for unions/intersections
- **Null Checks**: Use strict null checking. Handle `undefined` and `null` explicitly
- **Async/Await**: Prefer async/await over promises chaining

Example:

```typescript
// Good
interface TranscriptionOptions {
  language: string
  translate?: boolean
}

async function transcribe(audio: Buffer, options: TranscriptionOptions): Promise<string> {
  if (!audio || audio.length === 0) {
    throw new Error('Audio buffer is empty')
  }

  const result = await whisperAPI.transcribe(audio, options)
  return result.text
}

// Bad
async function transcribe(audio: any, options: any): Promise<any> {
  return await whisperAPI.transcribe(audio, options)
}
```

### React

- **Functional Components**: Use function components with hooks
- **Props Destructuring**: Destructure props in function signature
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Type Safety**: Define prop interfaces

Example:

```typescript
// Good
interface RecordingButtonProps {
  isRecording: boolean
  onStart: () => void
  onStop: () => void
}

export function RecordingButton({ isRecording, onStart, onStop }: RecordingButtonProps) {
  return (
    <button onClick={isRecording ? onStop : onStart}>
      {isRecording ? 'Stop' : 'Start'}
    </button>
  )
}

// Bad
export function RecordingButton(props: any) {
  return (
    <button onClick={props.handleClick}>
      {props.label}
    </button>
  )
}
```

### IPC (Inter-Process Communication)

Toolify uses type-safe IPC. Always:

1. Define types in `src/shared/types/`
2. Add handlers in `src/main/index.ts`
3. Expose in `src/preload/index.ts`
4. Use via `window.api` in renderer

Example:

```typescript
// src/shared/types/settings.types.ts
export interface Settings {
  apiKey: string
  language: string
  shortcut: string
}

// src/main/index.ts
ipcMain.handle('settings:get', (): Settings => {
  return store.get('settings') as Settings
})

ipcMain.handle('settings:set', (_event, settings: Settings) => {
  store.set('settings', settings)
})

// src/preload/index.ts
const api = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Settings) => ipcRenderer.invoke('settings:set', settings)
}

// src/renderer/src/components/Settings.tsx
const settings = await window.api.getSettings()
```

### Error Handling

- **Specific Errors**: Throw specific error messages
- **Error Boundaries**: Use error boundaries in React
- **User Feedback**: Show user-friendly error messages in UI
- **Logging**: Log errors with context

Example:

```typescript
// Good
async function loadModel(modelType: string): Promise<void> {
  try {
    const modelPath = getModelPath(modelType)
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found: ${modelPath}`)
    }
    await loadModelFile(modelPath)
  } catch (error) {
    console.error('Failed to load model:', { modelType, error })
    throw new Error(`Failed to load ${modelType} model. Please download it first.`)
  }
}

// Bad
async function loadModel(modelType: string): Promise<void> {
  await loadModelFile(getModelPath(modelType))
}
```

### File Naming

- **Components**: PascalCase (e.g., `RecordingButton.tsx`)
- **Utilities**: camelCase (e.g., `formatDuration.ts`)
- **Types**: \*.types.ts (e.g., `settings.types.ts`)
- **Constants**: \*.constants.ts (e.g., `api.constants.ts`)

### Imports

- **Absolute Imports**: Use `@renderer` alias for renderer imports
- **Grouping**: Group imports by type (third-party, internal, types)
- **Ordering**: Keep import order consistent

```typescript
// Third-party imports
import { useState, useEffect } from 'react'

// Internal imports
import { Button } from '@renderer/components/ui/Button'
import { useRecording } from '@renderer/hooks/useRecording'

// Type imports
import type { RecordingState } from '@shared/types/recording.types'
```

## Commit Message Conventions

Toolify follows [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `build`: Build system changes
- `ci`: CI/CD changes

### Scopes

Common scopes:

- `main`: Main process (Electron)
- `preload`: Preload scripts (IPC)
- `renderer`: Renderer process (React UI)
- `ui`: UI components
- `api`: API integrations
- `types`: TypeScript types
- `settings`: Settings management
- `audio`: Audio recording/processing
- `overlay`: Recording overlay
- `window`: Window management

### Examples

```bash
feat(ui): add dark mode toggle
fix(audio): resolve microphone permission error
refactor(renderer): migrate recording state to useReducer
docs(readme): update installation instructions
chore(deps): upgrade electron to v38.0.0
feat(types): add transcription history types
fix(settings): prevent duplicate keyboard shortcuts
```

### Good Commit Messages

```bash
# Good - clear and specific
feat(ui): add recording duration display to overlay

# Add recording duration indicator to the overlay showing
# elapsed time in MM:SS format. Helps users track recording length.

# Bad - vague and unhelpful
feat: add stuff
fix: fix bug
update: update things
```

## Pull Request Process

### Before Creating PR

1. **Update Documentation**
   - Update README if user-facing changes
   - Update relevant docs in `docs/`
   - Add comments to complex code

2. **Quality Checks**

   ```bash
   # All must pass
   npm run typecheck  # TypeScript compilation
   npm run lint       # ESLint
   npm run format     # Prettier
   ```

3. **Test Thoroughly**
   - Manual testing checklist (see below)
   - Test on different macOS versions if possible
   - Test edge cases (empty inputs, network errors, etc.)

### Creating PR

1. **Title**: Use conventional commit format
   - Example: `feat(ui): add dark mode toggle`

2. **Description Template**

```markdown
## Summary

Brief description of changes (2-3 sentences).

## Changes

- Bullet list of main changes
- Include any breaking changes
- Note any API changes

## Testing

- [ ] Tested manually on macOS [version]
- [ ] All quality checks pass (typecheck, lint)
- [ ] Documentation updated
- [ ] No console errors during testing

## Screenshots

Include for UI changes.

## Related Issues

Closes #123
Related to #456
```

3. **Review Requirements**
   - At least one approval required
   - All CI checks must pass
   - No merge conflicts

### During Review

- **Be Open**: Feedback is about code, not you
- **Ask Questions**: If you don't understand feedback
- **Push Updates**: Commit changes to your branch; PR updates automatically
- **Signal Ready**: Comment when ready for re-review

### After Merge

- **Delete Branch**: Keep your workspace clean
- **Sync Master**: Update local master branch
- **Celebrate**: Thank you for contributing!

## Testing Expectations

Toolify uses manual QA for most features. Always test your changes before submitting PR.

### Manual QA Checklist

#### Core Functionality

- [ ] App launches without errors
- [ ] Settings can be opened and modified
- [ ] Keyboard shortcut works (default: Cmd+Space)
- [ ] Recording starts/stops correctly
- [ ] Transcription completes successfully
- [ ] Result is copied to clipboard
- [ ] Notification appears on completion
- [ ] History is saved and displayed

#### UI Testing

- [ ] All buttons and controls work
- [ ] Settings persist after restart
- [ ] Overlay appears/disappears correctly
- [ ] Audio visualizer responds to input
- [ ] Dock icon visibility toggle works
- [ ] Window position persists

#### Edge Cases

- [ ] Handle missing API key gracefully
- [ ] Handle network errors gracefully
- [ ] Handle empty recordings
- [ ] Handle very long recordings
- [ ] Handle rapid start/stop clicks
- [ ] Handle invalid settings input

#### Platform-Specific

- [ ] Accessibility permission warning appears (if needed)
- [ ] Microphone permission requested
- [ ] Works on different macOS versions (if possible)

#### Local Model Testing

- [ ] Model download progress displays
- [ ] Model can be deleted
- [ ] Multiple models can be managed
- [ ] Local transcription works

### Testing Before Commit

```bash
# 1. Clean build
npm run build:skip-check

# 2. Run production build
npm run start

# 3. Test all functionality
# - Go through the checklist above

# 4. Check console for errors
# Open DevTools: Cmd+Option+I
# Look for red errors in console
```

### Regression Testing

When modifying core features:

- Test related features to ensure nothing broke
- Check settings migration works
- Verify history data integrity
- Test keyboard shortcuts still work

## Code Review Criteria

When reviewing or preparing code for review:

### Functionality

- ✓ Does it solve the intended problem?
- ✓ Are edge cases handled?
- ✓ Error handling is robust?
- ✓ User feedback is clear?

### Code Quality

- ✓ Code is readable and maintainable?
- ✓ Follows project style guidelines?
- ✓ No unnecessary complexity?
- ✓ Good naming and organization?
- ✓ Proper TypeScript typing?
- ✓ No console.log or debug code?

### Performance

- ✓ No obvious performance issues?
- ✓ Efficient algorithms used?
- ✓ No memory leaks?
- ✓ Proper cleanup in useEffect?

### Security

- ✓ No sensitive data in logs?
- ✓ API keys handled properly?
- ✓ Input validation where needed?
- ✓ No XSS vulnerabilities in UI?

### Documentation

- ✓ Complex code has comments?
- ✓ Prop/types are documented?
- ✓ README/docs updated if needed?
- ✓ Commit messages are clear?

### Testing

- ✓ Manual testing completed?
- ✓ Edge cases tested?
- ✓ No console errors?
- ✓ Works on target macOS versions?

## Reporting Bugs

### Before Reporting

1. **Search Existing Issues**
   - Check if bug is already reported
   - Check if it's fixed in latest version

2. **Verify It's a Bug**
   - Reproduce the issue consistently
   - Confirm it's not expected behavior
   - Try on different macOS versions if possible

### Bug Report Template

```markdown
## Description

Clear, concise description of the bug.

## Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Screenshots

If applicable, add screenshots.

## Environment

- macOS Version: [e.g. Sonoma 14.2]
- Toolify Version: [e.g. 0.0.12]
- Electron Version: [run `npm list electron`]
- Node Version: [run `node --version`]

## Console Errors

Check DevTools (Cmd+Option+I) and paste any errors.

## Additional Context

Add any other context about the problem.
```

### Good Bug Reports

- **Specific**: "Recording stops after 30 seconds with error: 'Audio buffer overflow'"
- **Reproducible**: Provide exact steps to reproduce
- **Environment**: Include macOS version, Toolify version
- **Evidence**: Screenshots, console errors, logs

### Bad Bug Reports

- "It doesn't work" (too vague)
- "Fix the bug" (no description)
- "App is broken" (no details)

## Suggesting Features

### Before Suggesting

1. **Search Existing Issues**
   - Check if feature is already requested
   - Discuss in existing issue if found

2. **Think It Through**
   - Is it within project scope?
   - Is it feasible to implement?
   - Would others benefit from it?
   - Can you help implement it?

### Feature Request Template

```markdown
## Summary

One sentence description of the feature.

## Motivation

Why would this feature be useful?
What problem does it solve?
Who would benefit from it?

## Detailed Description

Detailed description of the feature.
Include user stories or use cases.

## Proposed Solution

How do you envision this feature working?
UI/UX considerations.

## Alternatives Considered

What alternatives did you consider?
Why is this approach better?

## Additional Context

Screenshots, mockups, examples, or references.
```

### Good Feature Requests

- **Clear Problem**: "I want to export transcription history to TXT file"
- **Use Case**: "I need to archive my transcriptions for later reference"
- **Thoughtful**: Considers implementation complexity
- **Collaborative**: Willingness to help implement

### Feature Requests Less Likely

- **Out of Scope**: "Add Windows support" (Toolify is macOS-specific)
- **Too Vague**: "Make it better"
- **Too Complex**: "Add video editing features"

## Project Governance

### Decision Making

- **Maintainer**: @mehmetsagir has final say on decisions
- **Collaborative**: Feedback and discussion encouraged
- **Merit-Based**: Best technical solution wins
- **User-Focused**: Decisions prioritize user experience

### What Gets Accepted

- Features aligning with project vision
- Well-implemented, tested code
- Improvements to code quality
- Bug fixes and performance improvements
- Documentation improvements

### What Might Not Get Accepted

- Features out of scope
- Features that add significant complexity
- Features without clear use case
- Features requiring heavy maintenance
- Features that degrade UX

### Breaking Changes

Breaking changes are avoided but sometimes necessary:

- **Version Bump**: Follow semantic versioning
- **Migration Guide**: Document how to migrate
- **Deprecation Period**: Warn before removing features
- **Discussion**: Discuss major changes in issues first

## Getting Help

### Where to Ask

1. **GitHub Issues** - Bug reports and feature requests
2. **GitHub Discussions** - General questions and ideas (if enabled)
3. **Pull Requests** - Code contributions

### Asking Good Questions

1. **Search First**: Check existing issues and docs
2. **Be Specific**: Include details, context, and what you've tried
3. **Show Research**: Demonstrate you've tried to solve it
4. **Use Format**: Clear title, structured description

### Example Question

```markdown
## Question

How do I add a new transcription language?

## Context

I want to add support for Japanese transcription.
I've looked at the openai.ts file and see the language parameter.

## What I've Tried

I tried adding 'japanese' to the language list but got an error.
```

### Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- Project docs in `/docs` folder

## Recognition

All contributors are valued and appreciated. Whether you're:

- Reporting bugs
- Suggesting features
- Writing code
- Improving documentation
- Helping others

**Thank you for contributing to Toolify!** 🎉

---

### Quick Reference

```bash
# Development
npm run dev              # Start development server
npm run typecheck        # Type check
npm run lint             # Lint code
npm run format           # Format code

# Building
npm run build            # Build for production
npm run build:mac        # Build macOS app
npm run build:dmg        # Build DMG installer

# Branches
git checkout -b feature/name    # Feature branch
git checkout -b fix/name        # Bug fix branch

# Commits
git commit -m "feat: add feature"
git commit -m "fix: resolve bug"

# Pull Request
git push origin feature/name    # Push to fork
# Then create PR on GitHub
```

### Additional Documentation

- [ARCHITECTURE.md](/docs/ARCHITECTURE.md) - Architecture overview
- [TECH_STACK.md](/docs/TECH_STACK.md) - Technology stack details
- [PRD.md](/docs/PRD.md) - Product requirements document
- [AGENTS.md](/docs/AGENTS.md) - AI agent guidelines

---

**Ready to contribute?** Check out [good first issues](https://github.com/mehmetsagir/toolify/labels/good%20first%20issue) and start contributing!
