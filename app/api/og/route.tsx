import { ImageResponse } from 'next/og';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

// We fetch the font as an ArrayBuffer from our own hosted public folder or via a CDN fallback if not found locally.
// The user must place VictorMono-Bold.ttf in the public/fonts directory for production.
const fontUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}/fonts/VictorMono-Bold.ttf` 
  : 'http://localhost:3000/fonts/VictorMono-Bold.ttf';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response('Missing ID', { status: 400 });
    }

    const data = await kv.get<{ name: string; stack: string; role: string; avatar_url: string }>(`hh-goa:${id}`);

    if (!data) {
      return new Response('Not found', { status: 404 });
    }

    // Try fetching local font, fallback to Google Fonts if it fails (for dev convenience)
    let fontData: ArrayBuffer;
    try {
      const fontRes = await fetch(fontUrl);
      if (!fontRes.ok) throw new Error('Local font not found');
      fontData = await fontRes.arrayBuffer();
    } catch {
      // Fallback to a known Google Font URL if the user hasn't downloaded it yet
      const fallbackRes = await fetch('https://fonts.gstatic.com/s/victormono/v12/qWcqB6Wjgwt7OlTKYAxTzQxj.ttf');
      fontData = await fallbackRes.arrayBuffer();
    }

    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const bgUrl = `${baseUrl}/base-frame.png`;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: '#0B6839',
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: '100% 100%',
            fontFamily: '"Victor Mono"',
            position: 'relative',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              position: 'absolute',
              top: '72px',
              left: '72px',
              width: '576px',
              height: '570px',
              display: 'flex',
            }}
          >
            <img 
              src={data.avatar_url} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }} 
            />
          </div>

          {/* Name */}
          <div
            style={{
              position: 'absolute',
              top: '700px',
              left: '52px',
              fontSize: '40px',
              fontWeight: 900,
              color: '#101010',
            }}
          >
            {data.name}
          </div>

          {/* Stack */}
          <div
            style={{
              position: 'absolute',
              top: '760px',
              left: '52px',
              fontSize: '22px',
              fontWeight: 700,
              color: '#101010',
            }}
          >
            {data.stack}
          </div>

          {/* Role / Class */}
          <div
            style={{
              position: 'absolute',
              top: '700px',
              right: '52px',
              backgroundColor: '#E5F500',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 900,
              color: '#101010',
            }}
          >
            {data.role}
          </div>
        </div>
      ),
      {
        width: 720,
        height: 900,
        fonts: [
          {
            name: 'Victor Mono',
            data: fontData,
            style: 'normal',
            weight: 700,
          },
        ],
        headers: {
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
