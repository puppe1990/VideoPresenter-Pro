# Tech Stack & Build System

## Framework & Core Technologies

- **Next.js 15.3.3** with App Router architecture
- **React 19** with TypeScript 5
- **Tailwind CSS 4** for styling with PostCSS
- **Node.js 18+** runtime requirement

## UI Component System

- **shadcn/ui** components built on **Radix UI** primitives
- **Lucide React** for consistent iconography
- **class-variance-authority (CVA)** for component variants
- **clsx** and **tailwind-merge** for conditional styling

## Key Libraries

- **ffmpeg.js** for video processing and format conversion
- **next-intl** for internationalization (English/Portuguese)
- **MediaRecorder API** for native browser recording
- **Canvas API** for real-time video effects and shapes

## Development Tools

- **ESLint 9** with Next.js configuration
- **TypeScript** with strict mode enabled
- **Turbopack** for fast development builds

## Common Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint

# Installation
npm install          # Install dependencies
```

## Browser APIs Used

- **getUserMedia** - Camera access
- **getDisplayMedia** - Screen capture
- **MediaRecorder** - Video recording
- **Picture-in-Picture** - Floating video window
- **Canvas** - Real-time video processing
- **Web Workers** - FFmpeg processing

## Build Configuration

- **Webpack fallbacks** configured for FFmpeg WASM files
- **Path aliases** using `@/*` for `src/*`
- **High DPI support** with devicePixelRatio scaling
- **HTTPS required** for camera/screen recording in production