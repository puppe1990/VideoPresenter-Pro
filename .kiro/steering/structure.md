# Project Structure & Organization

## Directory Layout

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page (VideoPresenter)
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── [feature].tsx     # Feature components
├── lib/                  # Utilities and hooks
│   ├── utils.ts          # Common utilities (cn helper)
│   ├── translations.ts   # i18n translations
│   ├── useTranslation.tsx # Translation hook/provider
│   └── videoConverter.ts # Video processing utilities
└── types/                # TypeScript type definitions
```

## Component Architecture

### Main Components
- **VideoPresenter** - Main application container with state management
- **VideoCanvas** - Video rendering and drag-drop functionality  
- **ControlsPanel** - Settings sidebar with all controls
- **TopBar** - Application header with branding
- **Teleprompter** - Text overlay for presentations
- **DocumentViewer** - Document display functionality

### UI Components (shadcn/ui)
- Consistent component variants using CVA
- Radix UI primitives for accessibility
- Tailwind CSS for styling with design tokens

## State Management Patterns

- **useState** for local component state
- **useRef** for DOM references and mutable values
- **useEffect** for side effects and cleanup
- **useCallback** for performance optimization
- **Context API** for translation state

## File Naming Conventions

- **PascalCase** for React components (`VideoPresenter.tsx`)
- **camelCase** for utilities and hooks (`useTranslation.tsx`)
- **kebab-case** for UI components (`dropdown-menu.tsx`)
- **lowercase** for configuration files (`next.config.ts`)

## Import Patterns

- Use `@/*` path aliases for internal imports
- Group imports: external libraries, internal components, utilities
- Prefer named exports over default exports for utilities

## Code Organization Principles

- **Single responsibility** - Each component has one clear purpose
- **Composition over inheritance** - Build complex UI from simple components  
- **Separation of concerns** - Logic, presentation, and data separate
- **Feature-based grouping** - Related functionality grouped together
- **Consistent error handling** - Try/catch with user-friendly messages