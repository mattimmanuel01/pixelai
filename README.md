# PixelAI - AI-Powered Image Editor SaaS
 
A modern, full-featured image editing SaaS application built with Next.js, featuring AI background removal and generative fill capabilities.

## 🚀 Features

### Core Features
- **AI Background Removal** - Client-side processing using @imgly/background-removal
- **AI Generative Fill** - Photoshop-like inpainting using Stable Diffusion
- **Drag & Drop Upload** - Multiple file support with real-time preview
- **Canvas-based Editor** - Interactive selection tools for precise editing
- **Real-time Processing** - Live progress indicators and status updates

### Technical Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **AI Services**: Replicate API (Stable Diffusion Inpainting)
- **Image Processing**: Client-side AI background removal
- **Payments**: Stripe integration (ready)

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.local.example` to `.env.local` and configure:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Service Configuration
REPLICATE_API_TOKEN=your_replicate_api_token

# Stripe (Optional)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase Setup
1. Create a new Supabase project
2. Run the database schema (coming soon)
3. Configure authentication providers
4. Set up storage buckets for images

### 4. AI Service Setup (Replicate)
1. Sign up at [replicate.com](https://replicate.com)
2. Get your API token from the account settings
3. Add to environment variables

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🎨 How to Use

### Background Removal
1. Upload an image using drag & drop or file picker
2. Click "Remove Background" to process
3. Download the processed image

### AI Generative Fill
1. Upload an image
2. Click "AI Edit" to open the editor
3. Paint over areas you want to fill/replace
4. Enter a description of what should appear
5. Click "Generate Fill" to process
6. Download or save the edited image

## 📊 Project Structure

```
bgremover/
├── app/
│   ├── api/generative-fill/    # Replicate API integration
│   ├── globals.css             # Tailwind styles + Shadcn variables
│   ├── layout.tsx              # Root layout with header
│   └── page.tsx                # Main page with ImageUploader
├── components/
│   ├── ui/                     # Shadcn UI components
│   ├── header.tsx              # Navigation header
│   ├── image-editor.tsx        # Canvas-based editor for AI fill
│   └── image-uploader.tsx      # Main upload interface
├── lib/
│   ├── supabase.ts             # Supabase client configuration
│   └── utils.ts                # Utility functions
└── public/                     # Static assets
```

## 🔧 Next Steps (TODO)

- [ ] Complete Supabase authentication integration
- [ ] Add user dashboard with usage tracking
- [ ] Implement subscription tiers and Stripe payments
- [ ] Add batch processing for Pro users
- [ ] Create API endpoints for external access
- [ ] Add image history and cloud storage
- [ ] Implement usage limits and quota management

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Environment Variables for Production
Make sure to set all environment variables in your deployment platform.

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Contact the maintainer for contribution guidelines.

---

**Built with ❤️ using Next.js, Supabase, and AI**
