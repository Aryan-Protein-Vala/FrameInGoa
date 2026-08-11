# Hacker House Goa 2026: ID Card Generator 🌴

> **BUILD. SHIP. REPEAT. #FrameInGoa**

A high-performance, brutalist ID Card generator built for the builders of Hacker House Goa 2026. This isn't just a basic React app—it's a viral acquisition engine powered by Edge architecture and client-side canvas manipulation.

## 🚀 Features

- **Brutalist Aesthetic**: Strict, uncompromised design system using `Victor Mono` & `Imbue` typography, aggressive `#0B6839` / `#E5F500` palettes, and tactile drop shadows.
- **Client-Side Image Engine**: Zero server round-trips for generation. Uses `react-easy-crop` for precise 1:1 user framing and HTML5 Canvas for pixel-perfect ID composition. Supports HEIC via `heic2any`.
- **"Darkroom" Motion Dynamics**: Premium micro-interactions via `framer-motion`. Includes a magnetic hover tilt, camera flash, and a simulated photographic development reveal.
- **The Viral "Share to X" Loop**: 
  - Generates highly compressed WebP avatars client-side.
  - Uploads to **Vercel Blob** and stores lightweight metadata in **Vercel KV** at the Edge.
  - Leverages `@vercel/og` (Satori) to dynamically construct Twitter link previews in milliseconds using absolute positioning over base brand assets.
  - Custom share pages drive a viral acquisition loop by placing a massive "Generate Your ID" CTA directly under the shared card.

## 🛠 Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS, CSS variables for noise/texture
- **Motion**: Framer Motion
- **Image Processing**: Canvas API, `react-easy-crop`, `heic2any`
- **Edge Infrastructure**: Vercel Blob (Storage), Vercel KV (Redis metadata), Vercel OG (Dynamic OpenGraph Images)

## 💻 Local Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/Aryan-Protein-Vala/FrameInGoa.git
   cd FrameInGoa
   npm install
   ```

2. **Environment Variables**
   You need to provision Vercel Blob and Vercel KV via your Vercel Dashboard. Create a `.env.local`:
   ```env
   # Vercel Blob
   BLOB_READ_WRITE_TOKEN="your_blob_token"
   
   # Vercel KV (Upstash Redis)
   KV_URL="your_kv_url"
   KV_REST_API_URL="your_kv_rest_url"
   KV_REST_API_TOKEN="your_kv_rest_token"
   KV_REST_API_READ_ONLY_TOKEN="your_kv_read_only_token"
   ```

3. **Brand Assets**
   Place the base ID card frame image in `public/base-frame.png` and the Victor Mono font in `public/fonts/VictorMono-Bold.ttf`.

4. **Run the Dev Server**
   ```bash
   npm run dev
   ```

## 🏗 Architecture Notes

The Share to X engine is specifically designed to avoid the "heavy payload" trap. Instead of uploading a 2MB generated ID card to the server:
1. The frontend isolates the cropped user photo, compresses it to a ~30kb WebP, and uploads it.
2. The Edge Route composites this tiny WebP over the pre-cached static `base-frame.png` using Satori.
3. The result is cached aggressively (`Cache-Control: public, immutable, max-age=604800`) by the CDN, meaning zero compute cost after the first Twitter crawler hit.

---
*Built for the signal. Less noise.*
