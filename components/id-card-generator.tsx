'use client'

import { useEffect, useRef, useState, useCallback, type ChangeEvent, type DragEvent } from 'react'
import { Download, ImagePlus, Share2, Upload, X } from 'lucide-react'
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import Cropper, { Area } from 'react-easy-crop'

const getHeic2Any = async () => {
  const heic2any = (await import('heic2any')).default
  return heic2any
}

type FormState = { name: string; stack: string; className: string }

const defaultForm: FormState = { name: 'YOUR NAME', stack: 'YOUR STACK', className: 'BUILDER CLASS' }

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
  const [photo, setPhoto] = useState<string | null>(null)
  
  // Cropper state
  const [rawImage, setRawImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isCropping, setIsCropping] = useState(false)
  
  const [dragging, setDragging] = useState(false)
  const [generated, setGenerated] = useState(false)
  
  const [isFlashing, setIsFlashing] = useState(false)
  const [isDeveloping, setIsDeveloping] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const fileInput = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  const springConfig = { damping: 20, stiffness: 300 }
  const mouseX = useSpring(x, springConfig)
  const mouseY = useSpring(y, springConfig)
  
  const rotateX = useTransform(mouseY, [0, 1], [4, -4])
  const rotateY = useTransform(mouseX, [0, 1], [-4, 4])

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
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = 'hh-goa-id-card.png'
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  async function share() {
    const canvas = canvasRef.current
    if (!canvas || !photo) return
    
    setIsSharing(true)
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8))
      if (!blob) throw new Error('Failed to create image blob for sharing')
      
      const formData = new FormData()
      formData.append('image', blob)
      formData.append('name', form.name)
      formData.append('stack', form.stack)
      formData.append('role', form.className)
      
      const res = await fetch('/api/share', { method: 'POST', body: formData })
      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to communicate with share API')
      }
      
      const { id } = await res.json()
      
      const shareUrl = `${window.location.origin}/share/${id}`
      const text = encodeURIComponent(`I made my Hacker House Goa 2026 ID card. #FrameInGoa #HHGOA`)
      window.open(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      console.error(e)
      alert(e.message || "Failed to share card. Please try again.")
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <main className="paper-ui min-h-screen text-foreground">
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
          <div className="flex shrink-0 justify-end gap-4 p-4 font-mono">
            <button onClick={() => setIsCropping(false)} className="border-2 border-white px-4 py-2 uppercase text-white transition-colors hover:bg-white/10">Cancel</button>
            <button onClick={handleCropSave} className="bg-primary px-6 py-2 uppercase text-foreground font-bold shadow-[4px_4px_0_var(--foreground)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_var(--foreground)] transition-all">Save Crop</button>
          </div>
        </div>
      )}

      <header className="border-b-2 border-foreground px-5 py-4 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a href="#top" className="font-mono text-xs font-bold tracking-tight sm:text-sm">HH GOA / 2026</a>
          <nav className="hidden items-center gap-7 font-mono text-[11px] font-bold uppercase tracking-[0.18em] sm:flex">
            <a href="#generator" className="hover:text-primary">ID GENERATOR</a><a href="#about" className="hover:text-primary">ABOUT HH GOA</a>
          </nav>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">GOA, INDIA · 28–31 OCT</span>
        </div>
      </header>

      <section id="top" className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:px-12 md:py-20">
        <div className="flex flex-col justify-center">
          <p className="mb-5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-primary">// TASK #1 · FRAME IN GOA</p>
          <h1 className="font-mono text-[clamp(3.3rem,8vw,7.5rem)] font-black leading-[0.84] tracking-[-0.1em] text-balance font-[family-name:var(--font-imbue)]">MAKE YOUR<br /><span className="text-primary">ID CARD.</span></h1>
          <p className="mt-8 max-w-md font-mono text-sm font-semibold leading-6">Upload your photo. Enter your details. Get your Hacker House Goa 2026 ID card in seconds.</p>
          <a href="#generator" className="mt-8 w-fit border-2 border-foreground bg-primary px-6 py-3 font-mono text-xs font-black uppercase tracking-widest shadow-[5px_5px_0_var(--foreground)] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_var(--foreground)]">START GENERATING ↘</a>
        </div>
        <div className="relative flex min-h-[330px] items-center justify-center md:min-h-[440px]">
          <div className="card-paper pencil-card w-[min(82vw,370px)] rotate-[4deg] border-2 border-foreground bg-card p-3 shadow-[10px_10px_0_var(--primary)] rounded-sm">
            <div className="aspect-[4/5] overflow-hidden border-2 border-foreground bg-primary p-2">
              {photo ? <img src={photo} alt="Uploaded builder" className="h-full w-full object-cover grayscale" /> : <div className="flex h-full flex-col items-center justify-center gap-4 border-2 border-dashed border-foreground font-mono text-center"><ImagePlus className="size-12" strokeWidth={1.5} /><span className="text-xs font-bold uppercase">Your face<br />goes here</span></div>}
            </div>
            <div className="flex items-end justify-between gap-3 px-1 pt-3"><div><p className="font-mono text-lg font-black leading-none">{form.name}</p><p className="mt-1 font-mono text-[10px] font-bold uppercase">{form.stack}</p></div><span className="bg-primary px-2 py-1 font-mono text-[9px] font-black uppercase">{form.className}</span></div>
            <div className="mt-3 flex items-center justify-between border-t-2 border-foreground pt-2 font-mono text-[9px] font-bold"><span>HH GOA / 2026</span><span>NO. 0001</span></div>
          </div>
          <div className="absolute bottom-3 right-4 rotate-[-8deg] bg-primary px-3 py-2 font-mono text-[10px] font-black uppercase shadow-[4px_4px_0_var(--foreground)]">BUILD. SHIP. REPEAT.</div>
        </div>
      </section>

      <section id="generator" className="border-y-2 border-foreground bg-primary px-5 py-12 md:px-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
          <div><p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]">01 / YOUR DETAILS</p><h2 className="mt-4 font-mono text-4xl font-black leading-none tracking-[-0.08em] font-[family-name:var(--font-imbue)]">LET&apos;S<br />MAKE IT<br /><span className="bg-foreground px-2 text-primary">OFFICIAL.</span></h2><p className="mt-6 max-w-xs font-mono text-xs font-bold leading-5">This card is your pass to the build station. Make it yours.</p></div>
          <div className="grid gap-5">
            <div onClick={() => fileInput.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`flex min-h-32 cursor-pointer items-center justify-center gap-4 border-2 border-dashed border-foreground bg-background p-6 text-center transition-colors ${dragging ? 'bg-card' : ''}`}><Upload className="size-7" /><div><p className="font-mono text-xs font-black uppercase">Drag & drop your photo here</p><p className="mt-2 font-mono text-[10px] font-bold uppercase opacity-70">or click to browse · JPG, PNG, HEIC</p></div><input ref={fileInput} type="file" accept="image/*,.heic" className="sr-only" onChange={(e: ChangeEvent<HTMLInputElement>) => loadFile(e.target.files?.[0])} /></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="font-mono text-[10px] font-black uppercase">Name<input value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-2 w-full border-2 border-foreground bg-background px-3 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-foreground" /></label><label className="font-mono text-[10px] font-black uppercase">Stack<input value={form.stack} onChange={(e) => update('stack', e.target.value)} className="mt-2 w-full border-2 border-foreground bg-background px-3 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-foreground" /></label></div>
            <label className="font-mono text-[10px] font-black uppercase">Builder class<input value={form.className} onChange={(e) => update('className', e.target.value)} className="mt-2 w-full border-2 border-foreground bg-background px-3 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-foreground" /></label>
            <button onClick={generate} disabled={!photo} className="w-full border-2 border-foreground bg-[#0B6839] px-6 py-4 font-mono text-xs font-black uppercase tracking-[0.2em] text-[#E5F500] shadow-[5px_5px_0_var(--foreground)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_var(--foreground)] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[5px_5px_0_var(--foreground)] disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[5px_5px_0_var(--foreground)]">{generated ? 'CARD GENERATED ✓' : 'GENERATE MY ID CARD ↗'}</button>
          </div>
        </div>
      </section>

      <section id="result-section" className="mx-auto max-w-7xl px-5 py-12 md:px-12 md:py-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div><p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">02 / YOUR CARD</p><h2 className="mt-3 font-mono text-4xl font-black tracking-[-0.08em] font-[family-name:var(--font-imbue)]">LOOKS GOOD.<br />FEELS OFFICIAL.</h2></div>
          <div className="flex gap-3">
            <button onClick={download} className="flex items-center gap-2 border-2 border-foreground bg-primary px-5 py-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0_var(--foreground)]"><Download className="size-4" /> DOWNLOAD</button>
            <button onClick={share} disabled={isSharing} className="flex items-center gap-2 border-2 border-foreground bg-card px-5 py-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0_var(--foreground)] disabled:opacity-50"><Share2 className="size-4" /> {isSharing ? 'SHARING...' : 'SHARE TO X'}</button>
          </div>
        </div>
        <div className="mt-10 grid place-items-center border-2 border-dashed border-primary bg-transparent p-6 relative overflow-hidden">
          
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
              className="card-paper pencil-card w-[min(82vw,390px)] rotate-[-1.5deg] border-2 border-foreground bg-card p-3 shadow-[6px_8px_0_rgba(0,0,0,0.25)] rounded-sm"
            >
              <div className="aspect-[4/5] overflow-hidden border-2 border-foreground bg-primary p-2">
                {photo ? <img src={photo} alt="Generated builder card" className="h-full w-full object-cover grayscale" /> : <div className="flex h-full items-center justify-center font-mono text-xs font-bold uppercase">Upload a photo above</div>}
              </div>
              <div className="flex items-end justify-between gap-2 px-1 pt-3">
                <div>
                  <p className="font-mono text-lg font-black leading-none">{form.name}</p>
                  <p className="mt-1 font-mono text-[10px] font-bold">{form.stack}</p>
                </div>
                <span className="bg-primary px-2 py-1 font-mono text-[9px] font-black">{form.className}</span>
              </div>
              <div className="mt-3 flex justify-between border-t-2 border-foreground pt-2 font-mono text-[9px] font-bold">
                <span>HH GOA / 2026</span><span>#FRAMEINGOA</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <footer id="about" className="border-t-2 border-foreground bg-foreground px-5 py-8 text-primary md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 font-mono text-[10px] font-bold uppercase tracking-widest sm:flex-row sm:items-center sm:justify-between">
          <span>HH GOA / 2026</span><span>LESS NOISE. MORE SIGNAL.</span><span>© 2026 HH-GOA</span>
        </div>
      </footer>
    </main>
  )
}

export function drawIdCard(canvas: HTMLCanvasElement, data: FormState, photo: string | null) {
  const context = canvas.getContext('2d'); if (!context) return
  context.fillStyle = '#e5f500'; context.fillRect(0, 0, 720, 900); context.fillStyle = '#101010'; context.fillRect(24, 24, 672, 852)
  context.fillStyle = '#e5f500'; context.fillRect(52, 52, 616, 610)
  
  context.fillStyle = '#101010'; 
  context.font = '900 40px "Victor Mono", monospace'; context.fillText(data.name, 52, 730); 
  context.font = '700 22px "Victor Mono", monospace'; context.fillText(data.stack, 52, 765); context.fillText(data.className, 52, 820)
  
  if (photo) { 
    const image = new Image(); 
    image.crossOrigin = 'anonymous'; 
    image.onload = () => { 
      context.filter = 'grayscale(100%)';
      context.drawImage(image, 72, 72, 576, 570) 
      context.filter = 'none';
    }; 
    image.src = photo 
  }
}
