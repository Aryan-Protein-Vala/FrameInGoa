import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const name = formData.get('name') as string;
    const stack = formData.get('stack') as string;
    const role = formData.get('role') as string;

    if (!image || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ 
        error: 'BLOB_READ_WRITE_TOKEN is missing in environment variables.' 
      }, { status: 503 });
    }

    // 5MB limit
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 413 });
    }

    const id = nanoid(10);
    const filename = `hh-goa-${id}.webp`;

    const blob = await put(filename, image, {
      access: 'public',
      contentType: image.type,
    });

    try {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        await kv.set(
          `hh-goa:${id}`,
          { name, stack, role, avatar_url: blob.url },
          { ex: 7 * 24 * 60 * 60 } // 7 days TTL
        );
      }
    } catch (kvErr) {
      console.warn('KV Storage Warning (ignored for share):', kvErr);
    }

    return NextResponse.json({ id, url: blob.url });
  } catch (error: any) {
    console.error('Error in share route:', error);
    return NextResponse.json({ error: error?.message || 'Failed to share card' }, { status: 500 });
  }
}
