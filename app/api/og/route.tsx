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
    const bgUrl = `${baseUrl}/template.png`;

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
            borderRadius: '40px',
            overflow: 'hidden',
          }}
        >
          {/* User Photo Base Layer */}
          <div
            style={{
              position: 'absolute',
              top: '147px', left: '82px',
              width: '860px', height: '976px',
              display: 'flex',
            }}
          >
             <img 
               src={data.avatar_url} 
               style={{ 
                 width: '100%', height: '100%',
                 objectFit: 'cover', filter: 'grayscale(100%)' 
               }} 
             />
          </div>

          {/* Tropical Template Overlay */}
          <img 
            src={bgUrl} 
            style={{ 
              position: 'absolute',
              top: 0, left: 0,
              width: '1024px', height: '1536px',
            }} 
          />
          
          {/* Stamp Layer */}
          <img 
            src={`${baseUrl}/stamp.png`} 
            style={{ 
              position: 'absolute',
              top: '10px', right: '10px',
              width: '380px', height: '380px',
              opacity: 0.9,
            }} 
          />

          {/* Name & Class Badge */}
          <div style={{
            position: 'absolute',
            top: '1220px',
            left: '82px',
            right: '82px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div
              style={{
                fontSize: '68px',
                fontWeight: 900,
                color: '#101010',
              }}
            >
              {data.name}
            </div>

            <div
              style={{
                backgroundColor: '#ebd90b',
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
                fontWeight: 900,
                color: '#101010',
                border: '4px solid #101010',
              }}
            >
              {data.role}
            </div>
          </div>

          {/* Stack */}
          <div
            style={{
              position: 'absolute',
              top: '1280px',
              left: '82px',
              fontSize: '36px',
              fontWeight: 700,
              color: '#101010',
            }}
          >
            {data.stack}
          </div>
          
          <div
            style={{
              position: 'absolute',
              top: '1370px',
              left: '82px',
              width: '860px',
              height: '4px',
              backgroundColor: '#101010',
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: '1410px',
              left: '82px',
              fontSize: '28px',
              fontWeight: 700,
              color: '#101010',
            }}
          >
            HH GOA / 2026 | #FRAMEINGOA
          </div>
        </div>
      ),
      {
        width: 1024,
        height: 1536,
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
