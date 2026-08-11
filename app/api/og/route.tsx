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

    let data: { name: string; stack: string; role: string; avatar_url: string } | null = null;
    try {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        data = await kv.get<{ name: string; stack: string; role: string; avatar_url: string }>(`hh-goa:${id}`);
      }
    } catch (e) {
      console.warn('KV get warning in OG route:', e);
    }

    if (!data) {
      data = {
        name: 'BUILDER',
        stack: 'FULLSTACK',
        role: 'BUILDER CLASS',
        avatar_url: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/stamp.png`
      };
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
            borderRadius: '48px',
            overflow: 'hidden',
          }}
        >
          {/* User Photo Base Layer */}
          <div
            style={{
              position: 'absolute',
              top: '146px', left: '82px',
              width: '860px', height: '991px',
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
              top: '15px', right: '10px',
              width: '379px',
              objectFit: 'contain',
              opacity: 0.9,
            }} 
          />

          {/* Name & Class Badge */}
          <div style={{
            position: 'absolute',
            top: '1216px',
            left: '82px',
            right: '82px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div
              style={{
                fontSize: '58px',
                fontWeight: 900,
                color: '#101010',
                lineHeight: 1,
              }}
            >
              {data.name}
            </div>

            <div
              style={{
                backgroundColor: '#ebd90b',
                padding: '12px 26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '31px',
                fontWeight: 900,
                color: '#101010',
                border: '6px solid #101010',
                boxShadow: '6px 6px 0px #101010',
              }}
            >
              {data.role}
            </div>
          </div>

          {/* Stack */}
          <div
            style={{
              position: 'absolute',
              top: '1294px',
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
              top: '1348px',
              left: '82px',
              width: '860px',
              height: '6px',
              backgroundColor: '#101010',
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: '1357px',
              left: '82px',
              fontSize: '27px',
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
