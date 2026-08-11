import { ImageResponse } from 'next/og';
import { getCardData as fetchRedisCardData } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response('Missing ID', { status: 400 });
    }

    let data: { name: string; stack: string; role: string; avatar_url: string } | null = null;
    try {
      data = await fetchRedisCardData(id);
    } catch (e) {
      console.warn('Redis get warning in OG route:', e);
    }

    if (!data) {
      data = {
        name: 'GOA BUILDER',
        stack: 'FULLSTACK',
        role: 'BUILDER CLASS',
        avatar_url: ''
      };
    }

    // Determine Absolute Base URL for asset fetching on Vercel Edge
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const rawHost = hostHeader || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'frame-in-goa-weld.vercel.app';
    const baseUrl = rawHost.includes('localhost') ? `http://${rawHost}` : `https://${rawHost}`;

    // Fetch local font file via absolute URL
    let fontData: ArrayBuffer | null = null;
    try {
      const fontRes = await fetch(`${baseUrl}/fonts/VictorMono-Bold.ttf`);
      if (fontRes.ok) {
        fontData = await fontRes.arrayBuffer();
      } else {
        // Fallback to Google Fonts if local fetch fails
        const gFontRes = await fetch('https://fonts.gstatic.com/s/victormono/v12/qWcqB6Wjgwt7OlTKYAxTzQxj.ttf');
        if (gFontRes.ok) fontData = await gFontRes.arrayBuffer();
      }
    } catch (e) {
      console.warn('Failed to load font:', e);
    }

    // Convert avatar to base64 Data URI for Satori (avoid external image cross-origin issues in Satori)
    let avatarDataUrl = data.avatar_url;
    if (avatarDataUrl && avatarDataUrl.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const avatarRes = await fetch(avatarDataUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (avatarRes.ok) {
          const buffer = await avatarRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const contentType = avatarRes.headers.get('content-type') || 'image/webp';
          avatarDataUrl = `data:${contentType};base64,${base64}`;
        }
      } catch (err) {
        console.warn('Failed to fetch avatar for OG image:', err);
        avatarDataUrl = '';
      }
    }

    // Load template and stamp via absolute URL for Edge
    const bgDataUrl = `${baseUrl}/template.png`;
    const stampDataUrl = `${baseUrl}/stamp.png`;

    const options: any = {
      width: 1024,
      height: 1536,
      headers: {
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    };

    if (fontData) {
      options.fonts = [
        {
          name: 'Victor Mono',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ];
    }

    // Truncate and scale long strings for clean 1-line rendering
    const rawName = data.name || 'YOUR NAME';
    const displayName = rawName.length > 15 ? `${rawName.slice(0, 15)}...` : rawName;
    const nameFontSize = rawName.length > 12 ? '42px' : '54px';

    const rawRole = data.role || 'BUILDER CLASS';
    const displayRole = rawRole.length > 14 ? `${rawRole.slice(0, 14)}...` : rawRole;
    const roleFontSize = rawRole.length > 12 ? '24px' : '32px';

    const rawStack = data.stack || 'YOUR STACK';
    const displayStack = rawStack.length > 22 ? `${rawStack.slice(0, 22)}...` : rawStack;
    const stackFontSize = rawStack.length > 16 ? '28px' : '34px';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: '#f4f0df',
            fontFamily: fontData ? '"Victor Mono"' : 'monospace',
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
             {avatarDataUrl ? (
               <img 
                 src={avatarDataUrl} 
                 style={{ 
                   width: '100%', height: '100%',
                   objectFit: 'cover', filter: 'grayscale(100%)' 
                 }} 
               />
             ) : (
               <div style={{ width: '100%', height: '100%', backgroundColor: '#ebd90b' }} />
             )}
          </div>

          {/* Tropical Template Overlay */}
          {bgDataUrl ? (
            <img 
              src={bgDataUrl} 
              style={{ 
                position: 'absolute',
                top: 0, left: 0,
                width: '1024px', height: '1536px',
              }} 
            />
          ) : null}
          
          {/* Stamp Layer */}
          {stampDataUrl ? (
            <img 
              src={stampDataUrl} 
              style={{ 
                position: 'absolute',
                top: '15px', right: '10px',
                width: '379px',
                objectFit: 'contain',
                opacity: 0.9,
              }} 
            />
          ) : null}

          {/* Name & Class Badge */}
          <div style={{
            position: 'absolute',
            top: '1212px',
            left: '82px',
            right: '82px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div
              style={{
                fontSize: nameFontSize,
                fontWeight: 900,
                color: '#101010',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                maxWidth: '520px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </div>

            <div
              style={{
                backgroundColor: '#ebd90b',
                padding: '14px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: roleFontSize,
                fontWeight: 900,
                color: '#101010',
                border: '6px solid #101010',
                boxShadow: '6px 6px 0px #101010',
                whiteSpace: 'nowrap',
                maxWidth: '340px',
                overflow: 'hidden',
              }}
            >
              {displayRole}
            </div>
          </div>

          {/* Stack */}
          <div
            style={{
              position: 'absolute',
              top: '1288px',
              left: '82px',
              maxWidth: '860px',
              fontSize: stackFontSize,
              fontWeight: 700,
              color: '#101010',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {displayStack}
          </div>
          
          <div
            style={{
              position: 'absolute',
              top: '1344px',
              left: '82px',
              width: '860px',
              height: '6px',
              backgroundColor: '#101010',
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: '1353px',
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
      options
    );
  } catch (e: any) {
    console.error('OG image generation catch block:', e);
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}
