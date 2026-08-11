'use client'

export function ShareCardPreview({ imageUrl, altText }: { imageUrl: string; altText: string }) {
  return (
    <div className="w-full md:w-1/2 flex justify-center items-center shrink-0">
      <div 
        className="card-paper relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] lg:max-w-[420px] aspect-[2/3] rotate-[4deg] shadow-[12px_16px_0_#101010] rounded-2xl overflow-hidden border-4 border-black shrink-0 mx-auto cursor-pointer"
      >
        <img 
          src={imageUrl} 
          alt={altText}
          className="w-full h-auto block"
          suppressHydrationWarning
        />
      </div>
    </div>
  );
}
