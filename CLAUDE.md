# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
**PixelAI** is a Next.js 15 SaaS application for AI-powered image editing, featuring background removal, AI upscaling, and generative expansion with user authentication and subscription management.

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
- **Authentication**: Supabase Auth with React Context
- **AI Processing**: 
  - Client-side: `@imgly/background-removal` (free, fast)
  - Server-side: Replicate API (AI upscaling + generative expansion)
- **Backend**: Supabase (auth, database, storage)
- **File Upload**: react-dropzone with drag-and-drop

### App Structure
```
/app/
├── api/
│   ├── ai-upscaler/        # AI upscaling endpoint
│   ├── reframe-image/      # Generative expansion endpoint
│   └── poll-prediction/    # Polling for async results
├── login/                  # Authentication pages
├── signup/
├── dashboard/              # User dashboard with quota tracking
├── editor/                 # Canvas-based advanced editor
└── page.tsx               # Landing page with pricing

/components/
├── ui/                     # Shadcn components (button, card, etc.)
├── header.tsx             # Navigation with auth state
├── premium-uploader.tsx   # Landing page + upload interface
└── advanced-image-editor.tsx # Canvas editor with AI features

/contexts/
└── AuthContext.tsx        # Authentication state management

/lib/
└── supabase.ts           # Database helpers and auth functions
```

### Key Features Architecture

#### User Authentication Flow
1. Landing page with pricing tiers (Free vs Pro)
2. Sign up/login via Supabase Auth
3. User profile creation with quota tracking
4. Dashboard with usage statistics and project history

#### Background Removal Flow (Free)
1. Upload via drag-and-drop (`premium-uploader.tsx`)
2. Client-side processing with `@imgly/background-removal`
3. Progress tracking with real-time updates
4. Instant PNG download with transparency
5. Save to user's project history (if logged in)

#### AI Upscaling Flow (Pro)
1. Navigate to `/editor?image=<url>` (`advanced-image-editor.tsx`)
2. Select "AI Upscaler" tab
3. Submit to `/api/ai-upscaler` → Replicate API
4. Before/after drag comparison interface
5. Quota tracking and deduction

#### Image Expansion Flow (Pro)
1. Navigate to `/editor?image=<url>` (`advanced-image-editor.tsx`)
2. Select "Expand Image" tab
3. Choose preset aspect ratios or freestyle mode
4. Enter text prompt for expanded area content
5. Submit to `/api/reframe-image` → Luma Reframe API
6. Quota tracking and deduction

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

## Pricing & Subscription Model

### Free Tier
- Unlimited background removal
- High-quality PNG exports
- No watermarks
- Basic editing tools
- Project history (if logged in)

### Pro Tier ($9/month)
- Everything in Free
- 50 AI upscales per month
- 50 generative expansions per month
- Priority processing
- Advanced editing features

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free',
  upscale_quota INTEGER DEFAULT 0,
  expand_quota INTEGER DEFAULT 0,
  upscale_used INTEGER DEFAULT 0,
  expand_used INTEGER DEFAULT 0
);
```

### User Images Table
```sql
CREATE TABLE user_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  original_url TEXT NOT NULL,
  processed_url TEXT,
  operation_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Current State
- ✅ Background removal working
- ✅ AI upscaling working with before/after comparison
- ✅ Image expansion/reframing working
- ✅ User authentication with Supabase
- ✅ User dashboard with quota tracking
- ✅ Landing page with pricing tiers
- ✅ Project history and management
- ✅ Image persistence with Supabase storage
- ✅ Fast dashboard loading with session persistence
- ✅ Header dropdown menu with proper styling
- ✅ Logo navigation without flicker
- ❌ Payment system not implemented (Stripe ready)
- ❌ Email confirmations and notifications

## Recent Improvements (2024)

### Authentication & Session Management
- **Fast Dashboard Loading**: Optimized session persistence with localStorage
- **Reduced Timeouts**: Auth timeout 10s → 3s, retry delays 3s → 2s, image loading 15s → 8s
- **Better Error Handling**: No more aggressive sign-outs on temporary network issues
- **Graceful Retries**: Auto-refresh on profile loading failures

### Image Persistence & Storage
- **Supabase Storage Integration**: Images now stored in `temp-images` bucket instead of blob URLs
- **Permanent URLs**: Images persist after page refresh with public Supabase URLs
- **Dual Upload System**: Both original and processed images uploaded to storage
- **Progress Indication**: Enhanced progress tracking during upload process

### UI/UX Improvements
- **Header Dropdown Fix**: Proper background, borders, and z-index for user menu
- **Logo Navigation**: Conditional linking (dashboard for logged-in users, home for guests)
- **No More Flicker**: Eliminated redirect loop when clicking logo while authenticated

### Performance Optimizations
- **Session Persistence**: Custom storage key (`pixelai-auth`) with explicit localStorage config
- **Faster Fallbacks**: Reduced timeout values across authentication flow
- **Better State Management**: Improved loading states and error boundaries

## Common Issues

### Shadcn Import Paths
- Use `@/lib/utils` not `components/lib/utils`
- All UI components reference `@/lib/utils` for className merging

### Canvas Cursor Handling  
- Set `cursor: 'none'` on mask canvas
- Implement custom cursor with dashed circle outline
- Handle mouse enter/leave for cursor visibility

### Image Storage Best Practices
- Always upload processed images to Supabase storage via `/api/upload-image`
- Use `temp-images` bucket for all image operations
- Name files with `processed-` or `original-` prefixes plus timestamps
- Convert blobs to base64 before uploading to storage

### Environment Variables
- Client variables need `NEXT_PUBLIC_` prefix
- Replicate token is server-side only
- No `.env.local.example` file exists (should be created)