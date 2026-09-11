# Memoir 🎞️

A private, vintage-styled photo and video journal dedicated to shared memories with someone special. Drop a file (or tap the shutter button on mobile) and it develops straight into your private reel.

---

## Features

- **Vintage Film & Memory Reel**: Polaroid-style photo prints, subtle tilts, washi tape styling, and film exposure counters powered by Fraunces & Special Elite typography.
- **Memoir Photobooth**: Craft romantic, retro 4-cut and 8-cut printable photo strips (`Classic 4-Cut`, `Wide 8-Grid`, `Mini 3-Cut`, `Double 6-Cut`).
  - **Vintage Themes**: Warm Film, Classic Paper, Midnight Darkroom, Sepia Antique, Blossom Pink, and Retro Polaroid frames.
  - **Photo Tones**: Instant vintage filters including Original, Warm, B&W, and Soft.
  - **Effortless Organization**: Drag and drop photos to rearrange, auto-fill random memories, shuffle order, and tap to remove.
  - **Keepsake Export**: Download high-resolution PNGs ready for physical printing or digital sharing.
- **Progressive Web App (PWA) & Draft Caching**:
  - Installable directly to home screens on iOS, Android, macOS, and Windows.
  - Offline asset caching with Service Worker (`public/sw.js`).
  - Automatic debounced draft caching (`localStorage`) so accidental back-navigation or tab closures never lose your photobooth work.
- **Discord Bot Integration & Keepsakes**:
  - Automatically sends high-resolution photobooth keepsakes directly to your private Discord channel.
  - Adaptive batching: uploads any number of photos (e.g. 50+ photos) seamlessly within Discord's 10-attachment API limits.
- **Cloudinary Storage & Capture Metadata**: Secure, organized cloud media storage for all your photos and videos. Automatically extracts capture/taken dates from image EXIF metadata and device timestamps.
- **Monthly & Daily Chronological Views**: Sort memories seamlessly on a **Monthly** or **Daily** basis using true capture dates.
- **Passcode Gate**: Optional intimate lock screen (`ACCESS_CODE` or `NEXT_PUBLIC_ACCESS_CODE`) keeping the space private between the two of you.
- **90-Day Device & IP Recall**: Backed by Upstash Redis, authorized devices and IP addresses are remembered for up to 90 days without repeated passcode prompts.
- **Per-file Realtime Progress**: Darkroom developing animations and live upload percentage indicators.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root of the project (copy from `.env.example`):

```env
# ── Cloudinary (Image & Video Storage) ──────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
CLOUDINARY_FOLDER=memoir

# ── Shared Passcode (Optional) ──────────────────────────────────────────
# Leave blank to skip the "Enter our memories" screen entirely.
ACCESS_CODE=our-secret-code
NEXT_PUBLIC_ACCESS_CODE=our-secret-code

# ── Discord Integration (Optional) ───────────────────────────────────────
# Option A: Standalone Discord Bot
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CHANNEL_ID=your_channel_id_here

# Option B: Discord Webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# ── Upstash Redis (90-day Device & IP Session Memory) ────────────────────
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

> **Note**: If you run the app without `.env.local`, Memoir simulates uploads with mock latency so you can explore and test the UI. Once your Cloudinary keys are added, uploads are stored directly in your Cloudinary media library.

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
│   │   ├── discord/
│   │   │   └── route.ts            # Delivers photobooth keepsakes via Discord Bot/Webhook
│   │   ├── media/
│   │   │   ├── route.ts            # Fetches real Cloudinary assets & total storage usage
│   │   │   └── trash/route.ts      # Soft-delete archive & restore
│   │   └── upload/
│   │       ├── route.ts            # Next.js Route Handler uploading to Cloudinary
│   │       └── signature/route.ts  # Generates signed params for direct browser uploads
│   ├── globals.css                 # Darkroom & paper aesthetic styles
│   ├── layout.tsx                  # Font loading, metadata, and PWA registration
│   └── page.tsx                    # Main reel view, photobooth card, & upload grid
├── components/
│   ├── AccessGate.tsx              # Passcode lock screen with 90-day device recall
│   ├── ConfirmUploadModal.tsx      # Pre-upload romantic confirmation modal
│   ├── DevelopingSplash.tsx        # Darkroom chemical developing transition screen
│   ├── DropZone.tsx                # Drag-and-drop & mobile shutter button
│   ├── FilmHeader.tsx              # "Memoir" vintage header & exposure counter
│   ├── MemoryDeck.tsx              # Physical card deck stack & fan-out component
│   ├── PhotoPrint.tsx              # Polaroid card with tape, rotation, & status
│   ├── PhotoStripStudio.tsx        # Memoir Photobooth creation studio & canvas renderer
│   ├── PwaRegister.tsx             # Service worker registration for PWA installation
│   ├── UploadGrid.tsx              # Dynamic layout for uploads (Decks or Spread)
│   └── VintageFilmBackground.tsx   # Subtle 35mm film tape scrolling animation
├── lib/
│   ├── cloudinary.ts               # Cloudinary Node SDK setup & signature helper
│   ├── discord.ts                  # Discord Bot & Webhook multi-attachment delivery
│   ├── format.ts                   # Formatting utilities (dates, bytes, names, ids)
│   ├── photoStripStorage.ts        # Safe debounced localStorage draft persistence
│   ├── types.ts                    # Upload status, item, & photobooth types
│   ├── upstash.ts                  # Upstash Redis client & 90-day device session store
│   └── uploadClient.ts             # Browser XHR upload client with progress events
├── public/
│   ├── manifest.webmanifest        # PWA web manifest metadata
│   └── sw.js                       # Service worker for offline asset caching
└── tailwind.config.ts              # Custom warm paper, ink, tape, and rust palette
```

---

## Deploying to Vercel

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), import the repository.
3. Under **Settings > Environment Variables**, configure your keys:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_FOLDER` (optional, defaults to `memoir`)
   - `ACCESS_CODE` or `NEXT_PUBLIC_ACCESS_CODE` (optional)
   - `DISCORD_BOT_TOKEN` and `DISCORD_CHANNEL_ID` (or `DISCORD_WEBHOOK_URL`)
   - `UPSTASH_REDIS_REST_URL` (optional)
   - `UPSTASH_REDIS_REST_TOKEN` (optional)
4. Click **Deploy**.
