'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 })
  const [cursorType, setCursorType] = useState<'default' | 'pointer' | 'text'>('default')
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
          opacity: isVisible ? 1 : 0
        }}
        transition={{ type: "tween", duration: 0 }}
      >
        <div className={`w-full h-full bg-[#E5F500] ${isText ? '' : 'rounded-none shadow-[2px_2px_0_#101010]'}`} />
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
          className={`border-[3px] border-[#E5F500] w-full h-full transition-all duration-200 shadow-[4px_4px_0_#101010] ${
            isPointer ? 'bg-[#E5F500]/20 scale-75' : 'bg-transparent'
          }`} 
        />
      </motion.div>
    </>
  )
}
