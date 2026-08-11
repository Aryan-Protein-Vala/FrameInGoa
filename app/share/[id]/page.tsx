import { Metadata, ResolvingMetadata } from 'next';
import { getCardData as fetchRedisCardData } from '@/lib/redis';
import { ShareCardPreview } from '@/components/share-card-preview';
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
    <main className="paper-ui min-h-screen bg-[#0B6839] text-[#f4f0df] flex items-center justify-center py-10 px-5 font-mono overflow-y-auto" suppressHydrationWarning>
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 lg:gap-16">
        
        {/* Left Column: Animated ID Card */}
        <ShareCardPreview imageUrl={imageUrl} altText={`${data.name}'s ID Card`} />

        {/* Right Column: Title, Info & CTA Button */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E5F500] mb-2">
            HACKER HOUSE GOA 2026
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#E5F500] font-[family-name:var(--font-imbue)] uppercase tracking-tight leading-none mb-6">
            {data.name}&apos;s<br />ID CARD
          </h1>

          <p className="text-xs sm:text-sm font-semibold opacity-90 leading-relaxed mb-8 max-w-sm">
            Official builder pass created for Hacker House Goa 2026. Join the station, build your stack, and claim your card.
          </p>

          <div className="w-full">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#E5F500]">Ready to build?</p>
            <Link 
              href="/"
              className="block w-full border-4 border-black bg-[#E5F500] px-6 py-5 text-lg md:text-xl font-black uppercase tracking-[0.08em] text-black shadow-[8px_8px_0_#101010] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_#101010] text-center"
            >
              GENERATE YOUR HH GOA ID ↗
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
