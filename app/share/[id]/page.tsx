import { Metadata, ResolvingMetadata } from 'next';
import { kv } from '@vercel/kv';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Props = {
  params: { id: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  const data = await kv.get<{ name: string }>(`hh-goa:${id}`);

  if (!data) {
    return {
      title: 'Not Found - HH Goa ID Card',
    };
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  const ogImageUrl = `${baseUrl}/api/og?id=${id}`;

  return {
    title: `${data.name}'s Hacker House Goa 2026 ID Card`,
    description: `Check out my Hacker House Goa 2026 ID card. #FrameInGoa`,
    openGraph: {
      images: [
        {
          url: ogImageUrl,
          width: 720,
          height: 900,
          alt: `${data.name}'s HH Goa ID Card`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImageUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const id = params.id;
  const data = await kv.get<{ name: string; stack: string; role: string; avatar_url: string }>(`hh-goa:${id}`);

  if (!data) {
    notFound();
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  const imageUrl = `${baseUrl}/api/og?id=${id}`;

  return (
    <main className="paper-ui min-h-screen bg-[#0B6839] text-[#f4f0df] flex flex-col items-center py-20 px-5 font-mono">
      <h1 className="text-3xl md:text-5xl font-black mb-12 text-center text-[#E5F500] font-[family-name:var(--font-imbue)] uppercase">
        {data.name}&apos;s ID CARD
      </h1>
      
      <div className="relative w-full max-w-sm md:max-w-md card-paper border-4 border-black bg-[#f4f0df] p-2 shadow-[12px_16px_0_#101010] transform -rotate-1">
        <img 
          src={imageUrl} 
          alt={`${data.name}'s ID Card`}
          className="w-full h-auto block border-2 border-black"
        />
      </div>

      <div className="mt-20 w-full max-w-md text-center">
        <p className="mb-6 text-sm font-bold opacity-80 uppercase tracking-widest text-[#E5F500]">Join the Build Station</p>
        <Link 
          href="/"
          className="block w-full border-4 border-black bg-[#E5F500] px-6 py-6 text-lg md:text-xl font-black uppercase tracking-[0.1em] text-black shadow-[8px_8px_0_#101010] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_#101010]"
        >
          GENERATE YOUR HH GOA ID ↗
        </Link>
      </div>
    </main>
  );
}
