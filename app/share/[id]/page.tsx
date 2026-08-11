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
    <main className="paper-ui min-h-screen h-screen max-h-screen bg-[#0B6839] text-[#f4f0df] flex flex-col items-center justify-between py-6 px-4 font-mono overflow-hidden" suppressHydrationWarning>
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-center text-[#E5F500] font-[family-name:var(--font-imbue)] uppercase tracking-wide">
        {data.name}&apos;s ID CARD
      </h1>
      
      <div className="relative w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px] transform -rotate-1 shadow-[10px_14px_0_#101010] rounded-2xl overflow-hidden border-4 border-black my-auto">
        <img 
          src={imageUrl} 
          alt={`${data.name}'s ID Card`}
          className="w-full h-auto block"
          suppressHydrationWarning
        />
      </div>

      <div className="w-full max-w-sm text-center">
        <p className="mb-2 text-xs font-bold opacity-80 uppercase tracking-widest text-[#E5F500]">Join the Build Station</p>
        <Link 
          href="/"
          className="block w-full border-4 border-black bg-[#E5F500] px-5 py-4 text-base md:text-lg font-black uppercase tracking-[0.1em] text-black shadow-[6px_6px_0_#101010] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[3px_3px_0_#101010]"
        >
          GENERATE YOUR HH GOA ID ↗
        </Link>
      </div>
    </main>
  );
}
