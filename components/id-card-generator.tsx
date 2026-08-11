'use client'

import { useEffect, useRef, useState, useCallback, type ChangeEvent, type DragEvent } from 'react'
import { Download, ImagePlus, Share2, Upload, X, Crop as CropIcon } from 'lucide-react'
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import Cropper, { Area } from 'react-easy-crop'

// Dynamic import for heic2any to avoid SSR issues
const getHeic2Any = async () => {
  const heic2any = (await import('heic2any')).default
  return heic2any
}

type FormState = { name: string; stack: string; className: string }

const defaultForm: FormState = { name: 'YOUR NAME', stack: 'YOUR STACK', className: 'BUILDER CLASS' }

// Helper for crop
const createImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

async function getCroppedImg(imageSrc: string, pixelCrop: Area) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) resolve(URL.createObjectURL(file))
      else reject(new Error('Canvas is empty'))
    }, 'image/jpeg')
  })
}

export function IdCardGenerator() {
  const [form, setForm] = useState(defaultForm)
  
  // Cropper state
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  
  const [photo, setPhoto] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const [isDeveloping, setIsDeveloping] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  
  const fileInput = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Magnetic tilt state
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  const springConfig = { damping: 20, stiffness: 300 }
  const mouseX = useSpring(x, springConfig)
  const mouseY = useSpring(y, springConfig)
  
  const rotateX = useTransform(mouseY, [0, 1], [10, -10])
  const rotateY = useTransform(mouseX, [0, 1], [-10, 10])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width)
    y.set((e.clientY - rect.top) / rect.height)
  }
  function handleMouseLeave() {
    x.set(0.5)
    y.set(0.5)
  }

  async function loadFile(file?: File) {
    if (!file) return
    let processFile = file

    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      const heic2any = await getHeic2Any()
      const converted = await heic2any({ blob: file, toType: 'image/jpeg' })
      processFile = Array.isArray(converted) ? converted[0] : converted
    }

    const reader = new FileReader()
    reader.onload = () => {
      setRawImage(String(reader.result))
      setIsCropping(true)
    }
    reader.readAsDataURL(processFile)
  }

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  async function handleCropSave() {
    if (rawImage && croppedAreaPixels) {
      const cropped = await getCroppedImg(rawImage, croppedAreaPixels)
      if (cropped) {
        setPhoto(cropped)
        setIsCropping(false)
        setGenerated(false)
      }
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false); loadFile(event.dataTransfer.files[0])
  }

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value.toUpperCase() }))
    setGenerated(false)
  }

  useEffect(() => {
    if (canvasRef.current) drawIdCard(canvasRef.current, form, photo)
  }, [form, photo])

  function generate() {
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 150)
    
    setIsDeveloping(true)
    setTimeout(() => setIsDeveloping(false), 600)
    
    setGenerated(true)
    setTimeout(() => {
      document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a'); link.download = 'hh-goa-id-card.png'; link.href = canvas.toDataURL('image/png'); link.click()
  }

  async function share() {
    const canvas = canvasRef.current
    if (!canvas || !photo) return
    
    setIsSharing(true)
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8))
      if (!blob) throw new Error('Failed to create blob')
      
      const formData = new FormData()
      formData.append('image', blob)
      formData.append('name', form.name)
      formData.append('stack', form.stack)
      formData.append('role', form.className)
      
      const res = await fetch('/api/share', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Failed to share')
      
      const { id } = await res.json()
      
      const shareUrl = `${window.location.origin}/share/${id}`
      const text = encodeURIComponent(`I made my Hacker House Goa 2026 ID card. #FrameInGoa #HHGOA`)
      window.open(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`, '_blank', 'noopener,noreferrer')
    } catch (e) {
      console.error(e)
      alert("Failed to share card. Please try again.")
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <main className="paper-ui min-h-screen font-mono text-[#f4f0df]">
      {/* Cropper Modal */}
      {isCropping && rawImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
          <div className="relative mb-4 flex-1">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="flex shrink-0 justify-end gap-4 p-4">
            <button onClick={() => setIsCropping(false)} className="border-2 border-[#f4f0df] px-4 py-2 uppercase text-[#f4f0df] transition-colors hover:bg-white/10">Cancel</button>
            <button onClick={handleCropSave} className="bg-[#E5F500] px-6 py-2 uppercase text-black font-bold shadow-[4px_4px_0_#f4f0df] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_#f4f0df] transition-all">Save Crop</button>
          </div>
        </div>
      )}

      <header className="border-b-2 border-[#f4f0df] px-5 py-4 md:px-12 bg-[#0B6839]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a href="#top" className="text-xs font-bold tracking-tight sm:text-sm">HH GOA / 2026</a>
          <nav className="hidden items-center gap-7 text-[11px] font-bold uppercase tracking-[0.18em] sm:flex">
            <a href="#generator" className="hover:text-[#E5F500]">ID GENERATOR</a><a href="#about" className="hover:text-[#E5F500]">ABOUT HH GOA</a>
          </nav>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#f4f0df]/70">GOA, INDIA · 28–31 OCT</span>
        </div>
      </header>

      <section id="top" className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:px-12 md:py-20">
        <div className="flex flex-col justify-center">
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.25em] text-[#E5F500]">// TASK #1 · FRAME IN GOA</p>
          <h1 className="text-[clamp(3.3rem,8vw,7.5rem)] font-black leading-[0.84] tracking-[-0.1em] text-balance font-[family-name:var(--font-imbue)]">MAKE YOUR<br /><span className="text-[#E5F500]">ID CARD.</span></h1>
          <p className="mt-8 max-w-md text-sm font-semibold leading-6">Upload your photo. Enter your details. Get your Hacker House Goa 2026 ID card in seconds.</p>
          <a href="#generator" className="mt-8 w-fit border-2 border-black bg-[#E5F500] px-6 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[5px_5px_0_#101010] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_#101010]">START GENERATING ↘</a>
        </div>
        <div className="relative flex min-h-[330px] items-center justify-center md:min-h-[440px]">
          <div className="card-paper pencil-card w-[min(82vw,370px)] -rotate-1 border-2 border-black bg-[#f4f0df] p-3 shadow-[6px_8px_0_rgba(0,0,0,0.25)] text-black rounded-sm">
            <div className="aspect-[4/5] overflow-hidden border-2 border-black bg-[#E5F500] p-2">
              {photo ? <img src={photo} alt="Uploaded builder" className="h-full w-full object-cover grayscale" /> : <div className="flex h-full flex-col items-center justify-center gap-4 border-2 border-dashed border-black text-center"><ImagePlus className="size-12" strokeWidth={1.5} /><span className="text-xs font-bold uppercase">Your face<br />goes here</span></div>}
            </div>
            <div className="flex items-end justify-between gap-3 px-1 pt-3"><div><p className="text-lg font-black leading-none">{form.name}</p><p className="mt-1 text-[10px] font-bold uppercase">{form.stack}</p></div><span className="bg-[#E5F500] px-2 py-1 text-[9px] font-black uppercase">{form.className}</span></div>
            <div className="mt-3 flex items-center justify-between border-t-2 border-black pt-2 text-[9px] font-bold"><span>HH GOA / 2026</span><span>NO. 0001</span></div>
          </div>
          <div className="absolute bottom-3 right-4 rotate-[-8deg] bg-[#E5F500] px-3 py-2 text-[10px] font-black uppercase text-black shadow-[4px_4px_0_#101010]">BUILD. SHIP. REPEAT.</div>
        </div>
      </section>

      <section id="generator" className="border-y-2 border-[#101010] bg-[#E5F500] px-5 py-12 text-black md:px-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.22em]">01 / YOUR DETAILS</p><h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.08em] font-[family-name:var(--font-imbue)]">LET&apos;S<br />MAKE IT<br /><span className="bg-black px-2 text-[#E5F500]">OFFICIAL.</span></h2><p className="mt-6 max-w-xs text-xs font-bold leading-5">This card is your pass to the build station. Make it yours.</p></div>
          <div className="grid gap-5">
            <div onClick={() => fileInput.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`flex min-h-32 cursor-pointer items-center justify-center gap-4 border-2 border-dashed border-black bg-[#f4f0df] p-6 text-center transition-colors ${dragging ? 'bg-white' : ''}`}><Upload className="size-7" /><div><p className="text-xs font-black uppercase">Drag & drop your photo here</p><p className="mt-2 text-[10px] font-bold uppercase opacity-70">or click to browse · JPG, PNG, HEIC · max 5MB</p></div><input ref={fileInput} type="file" accept="image/*,.heic" className="sr-only" onChange={(e: ChangeEvent<HTMLInputElement>) => loadFile(e.target.files?.[0])} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-[10px] font-black uppercase">Name<input value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-2 w-full border-2 border-black bg-[#f4f0df] px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black" maxLength={20} /></label><label className="text-[10px] font-black uppercase">Stack<input value={form.stack} onChange={(e) => update('stack', e.target.value)} className="mt-2 w-full border-2 border-black bg-[#f4f0df] px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black" maxLength={30} /></label></div>
            <label className="text-[10px] font-black uppercase">Builder class<input value={form.className} onChange={(e) => update('className', e.target.value)} className="mt-2 w-full border-2 border-black bg-[#f4f0df] px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black" maxLength={30} /></label>
            <button onClick={generate} disabled={!photo} className="w-full border-2 border-black bg-black px-6 py-4 text-xs font-black uppercase tracking-[0.2em] text-[#E5F500] shadow-[5px_5px_0_#101010] transition-transform hover:translate-x-1 hover:translate-y-1 disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_#101010]">{generated ? 'CARD GENERATED ✓' : 'GENERATE MY ID CARD ↗'}</button>
          </div>
        </div>
      </section>

      <section id="result-section" className="mx-auto max-w-7xl px-5 py-12 md:px-12 md:py-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E5F500]">02 / YOUR CARD</p><h2 className="mt-3 text-4xl font-black tracking-[-0.08em] font-[family-name:var(--font-imbue)]">LOOKS GOOD.<br />FEELS OFFICIAL.</h2></div>
          <div className="flex gap-3">
            <button onClick={download} className="flex items-center gap-2 border-2 border-black bg-[#E5F500] text-black px-5 py-3 text-xs font-black uppercase shadow-[4px_4px_0_#101010] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#101010] transition-all"><Download className="size-4" /> DOWNLOAD</button>
            <button onClick={share} disabled={isSharing} className="flex items-center gap-2 border-2 border-black bg-[#f4f0df] text-black px-5 py-3 text-xs font-black uppercase shadow-[4px_4px_0_#101010] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#101010] transition-all disabled:opacity-50"><Share2 className="size-4" /> {isSharing ? 'SHARING...' : 'SHARE TO X'}</button>
          </div>
        </div>

        <div className="mt-10 grid place-items-center border-2 border-dashed border-[#f4f0df]/30 bg-black/20 p-6 relative overflow-hidden">
          
          <AnimatePresence>
            {isFlashing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-10 bg-white pointer-events-none"
              />
            )}
          </AnimatePresence>

          <canvas ref={canvasRef} className="hidden" width="720" height="900" />
          
          <motion.div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ scale: 1.02 }}
            style={{ rotateX, rotateY, perspective: 1000 }}
            className="relative z-0"
          >
            <motion.div 
              initial={false}
              animate={{
                filter: isDeveloping 
                  ? 'brightness(0) contrast(2)' 
                  : 'brightness(1) contrast(1)'
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="card-paper pencil-card w-[min(82vw,390px)] border-2 border-black bg-[#f4f0df] p-3 shadow-[8px_10px_0_#101010] text-black rounded-sm"
            >
              <div className="aspect-[4/5] overflow-hidden border-2 border-black bg-[#E5F500] p-2">
                {photo ? <img src={photo} alt="Generated builder card" className="h-full w-full object-cover grayscale" /> : <div className="flex h-full items-center justify-center text-xs font-bold uppercase">Upload a photo above</div>}
              </div>
              <div className="flex items-end justify-between gap-2 px-1 pt-3">
                <div>
                  <p className="text-lg font-black leading-none">{form.name}</p>
                  <p className="mt-1 text-[10px] font-bold">{form.stack}</p>
                </div>
                <span className="bg-[#E5F500] px-2 py-1 text-[9px] font-black">{form.className}</span>
              </div>
              <div className="mt-3 flex justify-between border-t-2 border-black pt-2 text-[9px] font-bold">
                <span>HH GOA / 2026</span><span>#FRAMEINGOA</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <footer id="about" className="border-t-2 border-[#f4f0df] bg-[#101010] px-5 py-8 text-[#E5F500] md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-[10px] font-bold uppercase tracking-widest sm:flex-row sm:items-center sm:justify-between">
          <span>HH GOA / 2026</span><span>LESS NOISE. MORE SIGNAL.</span><span>© 2026 HH-GOA</span>
        </div>
      </footer>
    </main>
  )
}

export function drawIdCard(canvas: HTMLCanvasElement, data: FormState, photo: string | null) {
  const context = canvas.getContext('2d'); if (!context) return
  context.fillStyle = '#E5F500'; context.fillRect(0, 0, 720, 900); context.fillStyle = '#f4f0df'; context.fillRect(24, 24, 672, 852)
  context.fillStyle = '#E5F500'; context.fillRect(52, 52, 616, 610)
  
  // Outer frame for photo
  context.strokeStyle = '#101010'; context.lineWidth = 4; context.strokeRect(52, 52, 616, 610)
  
  context.fillStyle = '#101010'; 
  context.font = '900 40px "Victor Mono", monospace'; context.fillText(data.name, 52, 730); 
  context.font = '700 22px "Victor Mono", monospace'; context.fillText(data.stack, 52, 765); 
  
  const classWidth = context.measureText(data.className).width;
  context.fillStyle = '#E5F500'; context.fillRect(668 - classWidth - 20, 690, classWidth + 20, 40)
  context.fillStyle = '#101010'; context.fillText(data.className, 668 - classWidth - 10, 718)
  
  if (photo) { 
    const image = new Image(); 
    image.crossOrigin = 'anonymous'; 
    image.onload = () => { 
      // Draw grayscale photo
      context.filter = 'grayscale(100%)';
      context.drawImage(image, 72, 72, 576, 570) 
      context.filter = 'none';
    }; 
    image.src = photo 
  }
}
