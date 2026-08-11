'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 })
  const [cursorType, setCursorType] = useState<'default' | 'pointer' | 'text'>('default')
  const [cursorColor, setCursorColor] = useState<'yellow' | 'green'>('yellow')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      setIsVisible(true)
    }
    
    const handleMouseLeave = () => setIsVisible(false)
    const handleMouseEnter = () => setIsVisible(true)

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      const isInput = target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'textarea'
      const isClickable = 
        target.tagName.toLowerCase() === 'button' ||
        target.tagName.toLowerCase() === 'a' ||
        target.closest('button') ||
        target.closest('a') ||
        window.getComputedStyle(target).cursor === 'pointer'

      if (isInput) {
        setCursorType('text')
      } else if (isClickable) {
        setCursorType('pointer')
      } else {
        setCursorType('default')
      }

      // Check background color for contrast
      let el: HTMLElement | null = target;
      let isLight = false;
      
      while (el) {
        const style = window.getComputedStyle(el);
        const bgColor = style.backgroundColor;
        
        if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (match) {
            const r = parseInt(match[1], 10);
            const g = parseInt(match[2], 10);
            const b = parseInt(match[3], 10);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            // Yellow and White have high brightness, Dark Green is low.
            isLight = brightness > 150;
            break;
          }
        }
        el = el.parentElement;
      }
      
      setCursorColor(isLight ? 'green' : 'yellow');
    }

    window.addEventListener('mousemove', updateMousePosition)
    window.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      window.removeEventListener('mousemove', updateMousePosition)
      window.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [])

  if (typeof window === 'undefined') return null

  const isPointer = cursorType === 'pointer'
  const isText = cursorType === 'text'
  const isYellow = cursorColor === 'yellow'

  return (
    <>
      {/* Inner dot / text bar */}
      <motion.div
        className="fixed top-0 left-0 z-[9999] pointer-events-none"
        animate={{
          x: mousePosition.x - (isText ? 1 : 4),
          y: mousePosition.y - (isText ? 10 : 4),
          width: isText ? 2 : 8,
          height: isText ? 20 : 8,
          opacity: isVisible ? 1 : 0,
          backgroundColor: isYellow ? '#E5F500' : '#0B6839'
        }}
        transition={{ type: "tween", duration: 0 }}
      >
        <div className={`w-full h-full ${isText ? '' : 'rounded-none shadow-[2px_2px_0_#101010]'}`} />
      </motion.div>

      
      {/* Outer frame */}
      <motion.div
        className="fixed top-0 left-0 z-[9998] pointer-events-none flex items-center justify-center"
        animate={{
          x: mousePosition.x - (isPointer ? 24 : 16),
          y: mousePosition.y - (isPointer ? 24 : 16),
          width: isPointer ? 48 : 32,
          height: isPointer ? 48 : 32,
          opacity: isVisible && !isText ? 1 : 0,
          rotate: isPointer ? 45 : 0,
        }}
        transition={{ 
          x: { type: "tween", duration: 0 },
          y: { type: "tween", duration: 0 },
          default: { type: "spring", stiffness: 400, damping: 25, mass: 0.5 }
        }}
      >
        <div 
          className={`border-[3px] w-full h-full transition-all duration-200 shadow-[4px_4px_0_#101010] ${
            isYellow ? 'border-[#E5F500]' : 'border-[#0B6839]'
          } ${
            isPointer 
              ? (isYellow ? 'bg-[#E5F500]/20 scale-75' : 'bg-[#0B6839]/20 scale-75') 
              : 'bg-transparent'
          }`} 
        />
      </motion.div>
    </>
  )
}
