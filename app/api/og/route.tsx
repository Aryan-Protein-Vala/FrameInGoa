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

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: '#f4f0df',
            fontFamily: '"Victor Mono"',
            position: 'relative',
            border: '8px solid #101010',
          }}
        >
          {/* Inner Photo Frame */}
          <div
            style={{
              position: 'absolute',
              top: '24px', left: '24px',
              width: '672px', height: '832px',
              backgroundColor: '#ebd90b',
              border: '4px solid #101010',
              display: 'flex',
            }}
          >
             {/* Photo Inner Border */}
             <div
               style={{
                 position: 'absolute',
                 top: '16px', left: '16px',
                 width: '640px', height: '800px',
                 border: '4px solid #101010',
               }}
             />
             
             <img 
               src={data.avatar_url} 
               style={{ 
                 position: 'absolute',
                 top: '18px', left: '18px',
                 width: '636px', height: '796px',
                 objectFit: 'cover', filter: 'grayscale(100%)' 
               }} 
             />
          </div>

          {/* Name */}
          <div
            style={{
              position: 'absolute',
              top: '710px',
              left: '32px',
              fontSize: '44px',
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
              top: '765px',
              left: '32px',
              fontSize: '20px',
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
              right: '32px',
              backgroundColor: '#ebd90b',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 900,
              color: '#101010',
            }}
          >
            {data.role}
          </div>
          
          <div
            style={{
              position: 'absolute',
              top: '805px',
              left: '32px',
              width: '656px',
              height: '3px',
              backgroundColor: '#101010',
            }}
          />
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
