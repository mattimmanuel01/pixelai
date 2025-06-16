# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
**PixelAI** is a Next.js 15 SaaS application for AI-powered image editing, specializing in background removal and generative fill capabilities.

## Development Commands

### Core Commands
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint code checking
```

### Testing and Quality
- No test framework configured yet
- Use `npm run lint` to check code quality before commits

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **UI**: Shadcn/UI components with Tailwind CSS v4
- **AI Processing**: 
  - Client-side: `@imgly/background-removal` (free, fast)
  - Server-side: Replicate API with Stable Diffusion Inpainting
- **Backend**: Supabase (auth, database, storage)
- **File Upload**: react-dropzone with drag-and-drop

### App Structure
```
/app/
├── api/generative-fill/     # Replicate API integration
├── editor/                  # Canvas-based advanced editor
└── page.tsx                 # Main upload interface

/components/
├── ui/                      # 9 Shadcn components
├── premium-uploader.tsx     # Main upload + background removal
└── advanced-image-editor.tsx # Canvas editor with brush tools
```

### Key Features Architecture

#### Background Removal Flow
1. Upload via drag-and-drop (`premium-uploader.tsx`)
2. Client-side processing with `@imgly/background-removal`
3. Progress tracking with real-time updates
4. Instant PNG download with transparency

#### Generative Fill Flow
1. Navigate to `/editor?image=<url>` (`advanced-image-editor.tsx`)
2. Select "Generative Fill" tab
3. Paint mask with brush/eraser tools on HTML5 canvas
4. Enter text prompt for desired content
5. Submit to `/api/generative-fill` → Replicate API
6. Result overlays on original image

#### Image Expansion Flow
1. Navigate to `/editor?image=<url>` (`advanced-image-editor.tsx`)
2. Select "Expand Image" tab
3. Choose aspect ratio (16:9, 4:3, 1:1, 9:16)
4. Enter text prompt for expanded area content
5. Submit to `/api/reframe-image` → Luma Reframe API
6. Canvas resizes to show expanded image

## Environment Configuration

### Required Variables
```env
# Supabase (authentication & storage)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
REPLICATE_API_TOKEN=         # For generative fill

# Payment (planned)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Canvas Editor Implementation

### Three-Layer System
1. **Image Canvas**: Original image display
2. **Mask Canvas**: Red overlay for user selections (brush/eraser)
3. **Cursor Canvas**: Photoshop-style brush preview

### Binary Mask Generation
- Visual red overlay uses `opacity: 0.4` for UX
- Actual mask data uses full opacity `rgba(239, 68, 68, 1)`
- Prevents opacity buildup when painting over same area
- Converts to white/black mask for AI processing

## API Integration

### Async Processing with Polling
All Replicate API calls use polling to avoid Vercel's 15-second timeout:

1. **Create Prediction**: APIs return `predictionId` instead of waiting
2. **Poll Status**: Frontend polls `/api/poll-prediction?id=<predictionId>` every 2 seconds
3. **Handle Completion**: Process result when status becomes 'succeeded'

### Generative Fill API (`/api/generative-fill/route.ts`)
- **Model**: stability-ai/stable-diffusion-inpainting
- **Parameters**: 25 steps, 7.5 guidance scale
- **Input**: Base64 image + mask + text prompt
- **Output**: `predictionId` for polling
- **Polling**: Max 2 minutes (120 attempts × 2 seconds)

### Image Expansion API (`/api/reframe-image/route.ts`)
- **Model**: luma/reframe-image
- **Parameters**: aspect_ratio, prompt
- **Input**: Base64 image + aspect ratio + text prompt
- **Output**: `predictionId` for polling
- **Polling**: Max 2 minutes (120 attempts × 2 seconds)

### Polling API (`/api/poll-prediction/route.ts`)
- **Method**: GET with query parameter `id`
- **Returns**: status, output, error, logs
- **Statuses**: starting → processing → succeeded/failed/canceled

## UI Components

### Shadcn/UI Setup
- **Style**: Default with CSS variables
- **Colors**: Slate-based theme with HSL values
- **Path mapping**: `@/components/ui/*` for components
- **Dark mode**: Class-based switching supported

### Custom Components
- `CleanHeader`: Navigation with branding
- `PremiumUploader`: Main interface with file handling
- `AdvancedImageEditor`: Full canvas editor with tools

## Current State
- ✅ Background removal working
- ✅ Generative fill working  
- ✅ Canvas editor with proper masking
- ✅ Image expansion/reframing working
- ✅ Tabbed interface for Fill vs Expand
- ❌ Supabase auth not integrated
- ❌ Payment system not implemented
- ❌ User dashboard pending

## Common Issues

### Shadcn Import Paths
- Use `@/lib/utils` not `components/lib/utils`
- All UI components reference `@/lib/utils` for className merging

### Canvas Cursor Handling  
- Set `cursor: 'none'` on mask canvas
- Implement custom cursor with dashed circle outline
- Handle mouse enter/leave for cursor visibility

### Environment Variables
- Client variables need `NEXT_PUBLIC_` prefix
- Replicate token is server-side only
- No `.env.local.example` file exists (should be created)