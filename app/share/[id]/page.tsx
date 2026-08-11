import { Metadata, ResolvingMetadata } from 'next';
import { getCardData as fetchRedisCardData } from '@/lib/redis';
import Link from 'next/link';

type Props = {
  params: Promise<{ id: string }>;
};

async function getCardData(id: string) {
  try {
    const res = await fetchRedisCardData(id);
    if (res) return res;
  } catch (e) {
    console.warn('Redis read warning on share page:', e);
  }
  return {
    name: 'GOA BUILDER',
    stack: 'FULLSTACK',
    role: 'BUILDER CLASS',
    avatar_url: ''
  };
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const data = await getCardData(id);

  const rawHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'frame-in-goa-weld.vercel.app';
  const baseUrl = rawHost.startsWith('http') ? rawHost : `https://${rawHost}`;
  const ogImageUrl = `${baseUrl}/api/og?id=${id}`;

  return {
    title: `${data.name}'s Hacker House Goa 2026 ID Card`,
    description: `Check out my Hacker House Goa 2026 ID card. #FrameInGoa #HHGOA`,
    openGraph: {
      title: `${data.name}'s HH Goa ID Card`,
      description: `Check out my Hacker House Goa 2026 ID card. #FrameInGoa #HHGOA`,
      url: `${baseUrl}/share/${id}`,
      siteName: 'Hacker House Goa 2026',
      images: [
        {
          url: ogImageUrl,
          width: 1024,
          height: 1536,
          alt: `${data.name}'s HH Goa ID Card`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.name}'s HH Goa ID Card`,
      description: `Check out my Hacker House Goa 2026 ID card. #FrameInGoa #HHGOA`,
      images: [ogImageUrl],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const data = await getCardData(id);
  const imageUrl = `/api/og?id=${id}`;

  return (
    <main className="paper-ui min-h-screen bg-[#0B6839] text-[#f4f0df] flex flex-col items-center py-20 px-5 font-mono" suppressHydrationWarning>
      <h1 className="text-3xl md:text-5xl font-black mb-12 text-center text-[#E5F500] font-[family-name:var(--font-imbue)] uppercase">
        {data.name}&apos;s ID CARD
      </h1>
      
      <div className="relative w-full max-w-sm md:max-w-md transform -rotate-1 shadow-[12px_16px_0_#101010] rounded-2xl overflow-hidden border-4 border-black">
        <img 
          src={imageUrl} 
          alt={`${data.name}'s ID Card`}
          className="w-full h-auto block"
          suppressHydrationWarning
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
