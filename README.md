# Memoir

A private, vintage-styled photo and video journal dedicated to shared memories with someone special. Drop a file (or tap the shutter button on mobile) and it develops straight into your private reel.

---

## Features

- **Vintage Darkroom Aesthetic**: Polaroid-style photo prints, subtle tilts, washi tape styling, and film exposure counters powered by Fraunces & Special Elite typography.
- **Photo & Video Support**: Drag and drop images or videos on desktop, or tap the shutter button on mobile.
- **Cloudinary Storage**: Secure cloud storage for all your photos and videos, keeping them organized in a dedicated folder.
- **Passcode Gate**: Optional "Enter the darkroom" passcode screen (`NEXT_PUBLIC_ACCESS_CODE`) so the space remains intimate between the two of you.
- **90-Day Device & IP Memory**: Backed by Upstash Redis, authorized devices and IP addresses are remembered for up to 90 days so you and your partner don't have to keep re-entering the passcode.
- **Per-file Progress**: Real-time progress percentage bar during developing/uploading.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Cloudinary & Upstash Redis

1. Create a free account at [Cloudinary](https://cloudinary.com) and copy your credentials.
2. (Optional for 90-day memory) Create a free Redis database at [Upstash](https://upstash.com) and copy your REST URL & Token.
3. Create a `.env.local` file in the root of the project (copy from `.env.example`):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
CLOUDINARY_FOLDER=memoir

# Optional lock screen passcode
NEXT_PUBLIC_ACCESS_CODE=our-secret-code

# Optional Upstash Redis for 90-day device & IP recall
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
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
│   │   ├── auth/
│   │   │   ├── session/route.ts    # Checks 90-day device cookie or IP in Upstash Redis
│   │   │   ├── verify/route.ts     # Validates code, saves 90-day device session in Upstash
│   │   │   └── logout/route.ts     # Clears device session
│   │   ├── media/
│   │   │   ├── route.ts            # Fetches real Cloudinary assets & total byte usage
│   │   │   └── trash/route.ts      # Soft-delete archive & restore
│   │   └── upload/
│   │       ├── route.ts            # Next.js Route Handler uploading to Cloudinary
│   │       └── signature/route.ts  # Generates signed params for direct browser uploads
│   ├── globals.css                 # Darkroom & paper aesthetic styles
│   ├── layout.tsx                  # Font loading (Fraunces & Special Elite) & metadata
│   └── page.tsx                    # Main reel view with DropZone & UploadGrid
├── components/
│   ├── AccessGate.tsx              # Passcode lock screen with 90-day device recall
│   ├── ConfirmUploadModal.tsx      # Pre-upload romantic confirmation modal
│   ├── DevelopingSplash.tsx        # Darkroom chemical developing transition screen
│   ├── DropZone.tsx                # Drag-and-drop & mobile shutter button
│   ├── FilmHeader.tsx              # "Memoir" vintage header & exposure counter
│   ├── MemoryDeck.tsx              # Physical card deck stack & fan-out component
│   ├── PhotoPrint.tsx              # Polaroid card with tape, rotation, & status
│   ├── UploadGrid.tsx              # Dynamic layout for uploads (Decks or Spread)
│   └── VintageFilmBackground.tsx   # Subtle 35mm film tape scrolling animation
├── lib/
│   ├── cloudinary.ts               # Cloudinary Node SDK setup & signature helper
│   ├── format.ts                   # Formatting utilities (file names, sizes, ids)
│   ├── types.ts                    # Upload status & item types
│   ├── upstash.ts                  # Upstash Redis client & 90-day device session store
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
   - `UPSTASH_REDIS_REST_URL` (optional)
   - `UPSTASH_REDIS_REST_TOKEN` (optional)
4. Click **Deploy**.
