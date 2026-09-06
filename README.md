# Memoir

A private, vintage-styled photo and video journal dedicated to shared memories with someone special. Drop a file (or tap the shutter button on mobile) and it develops straight into your private reel.

---

## Features

- **Vintage Darkroom Aesthetic**: Polaroid-style photo prints, subtle tilts, washi tape styling, and film exposure counters powered by Fraunces & Special Elite typography.
- **Photo & Video Support**: Drag and drop images or videos on desktop, or tap the shutter button on mobile.
- **Cloudinary Storage**: Secure cloud storage for all your photos and videos, keeping them organized in a dedicated folder.
- **Passcode Gate**: Optional "Enter the darkroom" passcode screen (`NEXT_PUBLIC_ACCESS_CODE`) so the space remains intimate between the two of you.
- **Per-file Progress**: Real-time progress percentage bar during developing/uploading.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Cloudinary

1. Create a free account at [Cloudinary](https://cloudinary.com).
2. Go to your **Cloudinary Console Dashboard** ([console.cloudinary.com](https://console.cloudinary.com)).
3. Under **Product Environment Credentials**, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
4. Create a `.env.local` file in the root of the project (copy from `.env.example`):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
CLOUDINARY_FOLDER=memoir

# Optional lock screen passcode
NEXT_PUBLIC_ACCESS_CODE=our-secret-code
```

> **Note**: If you run the app without `.env.local`, Memoir will simulate uploads with mock latency so you can still preview and test the UI. Once you add your Cloudinary keys, uploads are stored directly in your Cloudinary media library.

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```text
memoir/
├── app/
│   ├── api/
│   │   └── upload/
│   │       ├── route.ts            # Next.js Route Handler uploading to Cloudinary
│   │       └── signature/route.ts  # Generates signed params for direct browser uploads
│   ├── globals.css                 # Darkroom & paper aesthetic styles
│   ├── layout.tsx                  # Font loading (Fraunces & Special Elite) & metadata
│   └── page.tsx                    # Main reel view with DropZone & UploadGrid
├── components/
│   ├── AccessGate.tsx              # Passcode lock screen
│   ├── DropZone.tsx                # Drag-and-drop & mobile shutter button
│   ├── FilmHeader.tsx              # "Memoir" vintage header & exposure counter
│   ├── PhotoPrint.tsx              # Polaroid card with tape, rotation, & status
│   └── UploadGrid.tsx              # Dynamic layout for uploads
├── lib/
│   ├── cloudinary.ts               # Cloudinary Node SDK setup & signature helper
│   ├── format.ts                   # Formatting utilities (file names, sizes, ids)
│   ├── types.ts                    # Upload status & item types
│   └── uploadClient.ts             # Browser XHR upload client with progress events
└── tailwind.config.ts              # Custom warm paper, ink, tape, and rust palette
```

---

## Deploying to Vercel

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), import the repository.
3. Under **Settings > Environment Variables**, add:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_FOLDER` (optional, defaults to `memoir`)
   - `NEXT_PUBLIC_ACCESS_CODE` (optional)
4. Click **Deploy**.
