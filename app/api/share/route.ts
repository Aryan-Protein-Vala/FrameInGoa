import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { setCardData } from '@/lib/redis';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

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

    await setCardData(id, { name, stack, role, avatar_url: blob.url });

    return NextResponse.json({ id, url: blob.url });
  } catch (error: any) {
    console.error('Error in share route:', error);
    return NextResponse.json({ error: error?.message || 'Failed to share card' }, { status: 500 });
  }
}
