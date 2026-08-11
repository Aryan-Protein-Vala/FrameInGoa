'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export function ShareCardPreview({ imageUrl, altText }: { imageUrl: string; altText: string }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const springConfig = { damping: 20, stiffness: 300 };
  const mouseX = useSpring(x, springConfig);
  const mouseY = useSpring(y, springConfig);

  const rotateX = useTransform(mouseY, [0, 1], [8, -8]);
  const rotateY = useTransform(mouseX, [0, 1], [-8, 8]);

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
    <motion.div 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      whileHover={{ scale: 1.04, y: -8 }}
      transition={{ type: "spring", stiffness: 350, damping: 15 }}
      className="relative w-full max-w-[300px] sm:max-w-[340px] md:max-w-[380px] lg:max-w-[420px] aspect-[2/3] transform -rotate-1 shadow-[14px_18px_0_#101010] rounded-2xl overflow-hidden border-4 border-black shrink-0 cursor-pointer"
    >
      <img 
        src={imageUrl} 
        alt={altText}
        className="w-full h-auto block"
        suppressHydrationWarning
      />
    </motion.div>
  );
}
