'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export function ShareCardPreview({ imageUrl, altText }: { imageUrl: string; altText: string }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springConfig = { damping: 20, stiffness: 300 };
  const mouseX = useSpring(x, springConfig);
  const mouseY = useSpring(y, springConfig);

  const rotateX = useTransform(mouseY, [0, 1], [4, -4]);
  const rotateY = useTransform(mouseX, [0, 1], [-4, 4]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width);
    y.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <div className="w-full md:w-1/2 flex justify-center items-center shrink-0">
      <motion.div 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] lg:max-w-[420px] aspect-[2/3] transform rotate-[4deg] shadow-[12px_16px_0_#101010] rounded-2xl overflow-hidden border-4 border-black shrink-0 mx-auto cursor-pointer"
      >
        <img 
          src={imageUrl} 
          alt={altText}
          className="w-full h-auto block"
          suppressHydrationWarning
        />
      </motion.div>
    </div>
  );
}
