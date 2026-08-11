'use client'

import { useEffect, useRef, useState, useCallback, type ChangeEvent, type DragEvent } from 'react'
import { Download, ImagePlus, Share2, Upload, X } from 'lucide-react'
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Cropper, { type Area } from 'react-easy-crop'

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
  const [isCanvasReady, setIsCanvasReady] = useState(false)
  
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
    try {
      let processFile: File | Blob = file
      if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        const heic2any = await getHeic2Any()
        const converted = await heic2any({ blob: file, toType: 'image/jpeg' })
        processFile = Array.isArray(converted) ? converted[0] : converted
      }
      if (rawImage) URL.revokeObjectURL(rawImage)
      setRawImage(URL.createObjectURL(processFile))
      setIsCropping(true)
    } catch (e) {
      console.error(e)
      toast.error("Failed to load image. Please try another one.")
    }
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
    let active = true;
    if (canvasRef.current) {
      setIsCanvasReady(false);
      drawIdCard(canvasRef.current, form, photo).then(() => {
        if (active) setIsCanvasReady(true);
      });
    }
    return () => { active = false; };
  }, [form, photo])

  function generate() {
    if (!photo) {
      toast.error("Please upload your photo first!")
      return
    }

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
    if (!canvas || !photo || !isCanvasReady) return
    
    setIsSharing(true)
    const newWindow = window.open('about:blank', '_blank')
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
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
      if (newWindow) newWindow.location.href = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`
    } catch (e: any) {
      if (newWindow) newWindow.close()
      console.error(e)
      toast.error(e.message || "Failed to share card. Please try again.")
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
              aspect={2/3}
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
          <nav className="hidden gap-6 md:flex">
          <a href="#about" className="group relative font-mono text-sm font-bold uppercase no-pencil">
            About
            <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-foreground transition-all duration-300 group-hover:w-full"></span>
          </a>
          <a href="#generator" className="group relative font-mono text-sm font-bold uppercase no-pencil">
            Generator
            <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-foreground transition-all duration-300 group-hover:w-full"></span>
          </a>
        </nav>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">GOA, INDIA · 28–31 OCT</span>
        </div>
      </header>

      <section id="top" className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:px-12 md:py-20">
        {/* Tropical Comp 1: Sneaking behind hero title */}
        <motion.img 
          src="/tropical/comp-1.png" 
          alt="Tropical deco" 
          className="absolute -top-10 -left-10 w-28 md:w-40 pointer-events-auto z-0 -rotate-12 opacity-85 cursor-pointer md:z-10" 
          whileHover={{ y: -14, scale: 1.15, rotate: -6 }}
          transition={{ type: "spring", stiffness: 350, damping: 12 }}
        />

        <div className="flex flex-col justify-center relative z-10">
          <p className="mb-5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-primary">// TASK #1 · FRAME IN GOA</p>
          <h1 className="font-mono text-[clamp(3.3rem,8vw,7.5rem)] font-black leading-[0.84] tracking-[-0.1em] text-balance font-[family-name:var(--font-imbue)]">MAKE YOUR<br /><span className="text-primary">ID CARD.</span></h1>
          <p className="mt-8 max-w-md font-mono text-sm font-semibold leading-6">Upload your photo. Enter your details. Get your Hacker House Goa 2026 ID card in seconds.</p>
          <a href="#generator" className="mt-8 w-fit border-2 border-foreground bg-primary px-6 py-3 font-mono text-xs font-black uppercase tracking-widest shadow-[5px_5px_0_var(--foreground)] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0_var(--foreground)]">START GENERATING ↘</a>
        </div>
        <div className="relative flex min-h-[330px] items-center justify-center md:min-h-[440px]">
          {/* Tropical Comp 2: Peeking behind hero card */}
          <motion.img 
            src="/tropical/comp-2.png" 
            alt="Tropical deco" 
            className="absolute -bottom-8 -right-8 w-32 md:w-44 pointer-events-auto z-0 rotate-12 opacity-90 cursor-pointer md:z-10" 
            whileHover={{ y: -12, scale: 1.15, rotate: 18 }}
            transition={{ type: "spring", stiffness: 350, damping: 12 }}
          />

          <div className="card-paper pencil-card relative w-[min(82vw,300px)] aspect-[2/3] rotate-[4deg] shadow-[10px_10px_0_var(--primary)] overflow-hidden bg-[#f4f0df] rounded-2xl border-2 border-foreground z-10">
            {/* User Photo Base Layer */}
            {photo ? (
              <img src={photo} alt="Uploaded builder" className="absolute top-[9.5%] left-[8%] w-[84%] h-[64.5%] object-cover grayscale z-0" />
            ) : (
              <div className="absolute top-[9.5%] left-[8%] w-[84%] h-[64.5%] bg-[#ebd90b] flex flex-col items-center justify-center gap-2 font-mono text-center z-0">
                <ImagePlus className="size-10" strokeWidth={1.5} />
                <span className="text-[10px] font-bold uppercase leading-tight">Your face<br />goes here</span>
              </div>
            )}
            
            {/* Tropical Template Overlay */}
            <img src="/template.png" alt="Card Template" className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />
            
            {/* Stamp Layer */}
            <img src="/stamp.png" alt="Stamp" className="absolute top-[1%] right-[1%] w-[37%] z-20 pointer-events-none opacity-90" />
            
            {/* Text Overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none text-[#101010]">
              <div className="absolute bottom-[16.5%] left-[8%] right-[8%] flex items-center justify-between">
                <p className="font-mono text-[19px] font-black leading-none uppercase">{form.name}</p>
                <span className="bg-[#ebd90b] px-2 py-1 border-2 border-[#101010] font-mono text-[9px] font-black uppercase shadow-[2px_2px_0_#101010] whitespace-nowrap">{form.className}</span>
              </div>
              
              <p className="absolute bottom-[13%] left-[8%] font-mono text-[11px] font-bold uppercase">{form.stack}</p>
              
              <div className="absolute bottom-[9.5%] left-[8%] right-[8%] font-mono text-[9px] font-bold border-t-2 border-[#101010] pt-[2px]">
                <span>HH GOA / 2026 | #FRAMEINGOA</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-3 right-4 rotate-[-8deg] bg-primary px-3 py-2 font-mono text-[10px] font-black uppercase shadow-[4px_4px_0_var(--foreground)] z-30">BUILD. SHIP. REPEAT.</div>
        </div>
      </section>

      <section id="generator" className="relative border-y-2 border-foreground bg-primary px-5 py-12 md:px-12 md:py-16">
        {/* Tropical Comp 3: Sneaking at top-left of generator */}
        <motion.img 
          src="/tropical/comp-3.png" 
          alt="Tropical deco" 
          className="absolute -top-12 left-4 w-28 md:w-36 pointer-events-auto z-0 -rotate-6 opacity-85 cursor-pointer md:z-10" 
          whileHover={{ y: -12, scale: 1.15, rotate: -12 }}
          transition={{ type: "spring", stiffness: 350, damping: 12 }}
        />

        {/* Tropical Comp 4: Sneaking at bottom-right of generator */}
        <motion.img 
          src="/tropical/comp-4.png" 
          alt="Tropical deco" 
          className="absolute -bottom-10 right-8 w-28 md:w-40 pointer-events-auto z-0 rotate-6 opacity-85 cursor-pointer md:z-10" 
          whileHover={{ y: -12, scale: 1.15, rotate: 12 }}
          transition={{ type: "spring", stiffness: 350, damping: 12 }}
        />

        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-20 relative z-10">
          <div><p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]">01 / YOUR DETAILS</p><h2 className="mt-4 font-mono text-4xl font-black leading-none tracking-[-0.08em] font-[family-name:var(--font-imbue)]">LET&apos;S<br />MAKE IT<br /><span className="bg-foreground px-2 text-primary">OFFICIAL.</span></h2><p className="mt-6 max-w-xs font-mono text-xs font-bold leading-5">This card is your pass to the build station. Make it yours.</p></div>
          <div className="grid gap-5">
            <div 
              onClick={() => !rawImage && fileInput.current?.click()} 
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }} 
              onDragLeave={() => setDragging(false)} 
              onDrop={onDrop} 
              className={`flex min-h-32 ${!rawImage ? 'cursor-pointer' : ''} items-center justify-center gap-4 border-2 border-dashed border-foreground bg-background p-6 text-center transition-colors ${dragging ? 'bg-card' : ''}`}
            >
              {rawImage ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-[#0B6839]">
                    <ImagePlus className="size-6" />
                    <p className="font-mono text-xs font-black uppercase">Photo Uploaded</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); fileInput.current?.click(); }}
                    className="mt-2 border-2 border-foreground bg-primary px-4 py-2 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0_var(--foreground)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_var(--foreground)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    Reupload Photo
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="size-7" />
                  <div>
                    <p className="font-mono text-xs font-black uppercase">Drag & drop your photo here</p>
                    <p className="mt-2 font-mono text-[10px] font-bold uppercase opacity-70">or click to browse · JPG, PNG, HEIC</p>
                  </div>
                </>
              )}
              <input onClick={(e) => ((e.target as HTMLInputElement).value = '')} ref={fileInput} type="file" accept="image/*,.heic" className="sr-only" onChange={(e: ChangeEvent<HTMLInputElement>) => loadFile(e.target.files?.[0])} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="font-mono text-[10px] font-black uppercase">Name<input value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-2 w-full border-2 border-foreground bg-background px-3 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-foreground" /></label><label className="font-mono text-[10px] font-black uppercase">Stack<input value={form.stack} onChange={(e) => update('stack', e.target.value)} className="mt-2 w-full border-2 border-foreground bg-background px-3 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-foreground" /></label></div>
            <label className="font-mono text-[10px] font-black uppercase">Builder class<input value={form.className} onChange={(e) => update('className', e.target.value)} className="mt-2 w-full border-2 border-foreground bg-background px-3 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-foreground" /></label>
            <button onClick={generate} className="w-full border-2 border-foreground bg-[#0B6839] px-6 py-4 font-mono text-xs font-black uppercase tracking-[0.2em] text-white">{generated ? 'CARD GENERATED ✓' : 'GENERATE MY ID CARD ↗'}</button>
          </div>
        </div>
      </section>

      <section id="result-section" className="relative mx-auto max-w-7xl px-5 py-12 md:px-12 md:py-20">
        {/* Tropical Comp 5: Top-right of result header */}
        <motion.img 
          src="/tropical/comp-5.png" 
          alt="Tropical deco" 
          className="absolute -top-10 right-6 w-28 md:w-36 pointer-events-auto z-0 rotate-12 opacity-85 cursor-pointer md:z-10" 
          whileHover={{ y: -12, scale: 1.15, rotate: 18 }}
          transition={{ type: "spring", stiffness: 350, damping: 12 }}
        />

        {/* Tropical Comp 6: Bottom-left of result section */}
        <motion.img 
          src="/tropical/comp-6.png" 
          alt="Tropical deco" 
          className="absolute -bottom-8 -left-6 w-32 md:w-44 pointer-events-auto z-0 -rotate-12 opacity-90 cursor-pointer md:z-10" 
          whileHover={{ y: -12, scale: 1.15, rotate: -18 }}
          transition={{ type: "spring", stiffness: 350, damping: 12 }}
        />

        {/* Tropical Comp 8: Bottom-right of result section */}
        <motion.img 
          src="/tropical/comp-8.png" 
          alt="Tropical deco" 
          className="absolute -bottom-10 -right-6 w-32 md:w-44 pointer-events-auto z-0 rotate-12 opacity-85 cursor-pointer md:z-10" 
          whileHover={{ y: -14, scale: 1.15, rotate: 18 }}
          transition={{ type: "spring", stiffness: 350, damping: 12 }}
        />

        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between relative z-10">
          <div><p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">02 / YOUR CARD</p><h2 className="mt-3 font-mono text-4xl font-black tracking-[-0.08em] font-[family-name:var(--font-imbue)]">LOOKS GOOD.<br /><span className="text-primary">FEELS OFFICIAL.</span></h2></div>
          <div className="flex gap-3">
            <button onClick={download} disabled={!isCanvasReady} className="flex items-center gap-2 border-2 border-foreground bg-primary px-5 py-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0_var(--foreground)] disabled:opacity-50"><Download className="size-4" /> DOWNLOAD</button>
            <button onClick={share} disabled={isSharing || !isCanvasReady} className="flex items-center gap-2 border-2 border-foreground bg-card px-5 py-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0_var(--foreground)] disabled:opacity-50"><Share2 className="size-4" /> {isSharing ? 'SHARING...' : 'SHARE TO X'}</button>
          </div>
        </div>
        <div className="mt-10 grid place-items-center border-2 border-dashed border-primary bg-transparent p-6 relative overflow-hidden">
          {/* Tropical Comp 7: Peeking inside result preview box */}
          <motion.img 
            src="/tropical/comp-7.png" 
            alt="Tropical deco" 
            className="absolute top-2 left-2 w-24 md:w-32 pointer-events-auto z-0 -rotate-6 opacity-75 cursor-pointer md:z-10" 
            whileHover={{ y: -10, scale: 1.15, rotate: 6 }}
            transition={{ type: "spring", stiffness: 350, damping: 12 }}
          />

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

          <canvas ref={canvasRef} className="hidden" width="720" height="1020" />
          
          <motion.div 
            initial={false}
            animate={{
              filter: isDeveloping 
                ? 'brightness(0) contrast(2)' 
                : 'brightness(1) contrast(1)'
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="card-paper pencil-card relative w-[min(82vw,340px)] aspect-[2/3] rotate-[-1.5deg] shadow-[10px_10px_0_var(--primary)] overflow-hidden bg-[#f4f0df] rounded-2xl border-2 border-foreground z-10"
          >
            {/* User Photo Base Layer */}
            {photo ? (
              <img src={photo} alt="Generated builder card" className="absolute top-[9.5%] left-[8%] w-[84%] h-[64.5%] object-cover grayscale z-0" />
            ) : (
              <div className="absolute top-[9.5%] left-[8%] w-[84%] h-[64.5%] bg-[#ebd90b] flex items-center justify-center font-mono text-[10px] font-bold uppercase text-center z-0">
                Upload a photo above
              </div>
            )}
            
            {/* Tropical Template Overlay */}
            <img src="/template.png" alt="Card Template" className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />
            
            {/* Stamp Layer */}
            <img src="/stamp.png" alt="Stamp" className="absolute top-[1%] right-[1%] w-[37%] z-20 pointer-events-none opacity-90" />
            
            {/* Text Overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none text-[#101010]">
              <div className="absolute bottom-[16.5%] left-[8%] right-[8%] flex items-center justify-between">
                <p className="font-mono text-[20px] font-black leading-none uppercase">{form.name}</p>
                <span className="bg-[#ebd90b] px-2 py-1 border-2 border-[#101010] font-mono text-[10px] font-black uppercase shadow-[2px_2px_0_#101010] whitespace-nowrap">{form.className}</span>
              </div>
              
              <p className="absolute bottom-[13%] left-[8%] font-mono text-[12px] font-bold uppercase">{form.stack}</p>
              
              <div className="absolute bottom-[9.5%] left-[8%] right-[8%] font-mono text-[9px] font-bold border-t-2 border-[#101010] pt-[2px]">
                <span>HH GOA / 2026 | #FRAMEINGOA</span>
              </div>
            </div>
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

function drawImageCover(
  context: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = w / h;
  let sx = 0, sy = 0, sWidth = img.naturalWidth, sHeight = img.naturalHeight;

  if (imgRatio > targetRatio) {
    sWidth = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sWidth) / 2;
  } else {
    sHeight = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sHeight) / 2;
  }

  context.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

export async function drawIdCard(canvas: HTMLCanvasElement, data: FormState, photo: string | null) {
  const context = canvas.getContext('2d'); if (!context) return
  
  await document.fonts.ready;

  canvas.width = 1024;
  canvas.height = 1536;
  
  // Background (Fallback cream)
  context.fillStyle = '#f4f0df';
  context.fillRect(0, 0, 1024, 1536);
  
  // 1. Clip rounded corners for canvas overall (48px radius for 1024 width)
  context.beginPath();
  context.roundRect(0, 0, 1024, 1536, 48);
  context.clip();

  // 1.1 Draw User Photo (Bottom Layer) with object-cover aspect ratio preservation
  if (photo) { 
    await new Promise((resolve) => {
      const image = new Image(); 
      image.crossOrigin = 'anonymous'; 
      image.onload = () => { 
        context.filter = 'grayscale(100%)';
        drawImageCover(context, image, 82, 146, 860, 991);
        context.filter = 'none';
        resolve(true);
      }; 
      image.src = photo 
    });
  } else {
    context.fillStyle = '#ebd90b';
    context.fillRect(82, 146, 860, 991);
  }

  // 2. Draw Tropical Template (Middle Layer)
  await new Promise((resolve) => {
    const template = new Image();
    template.onload = () => {
      context.drawImage(template, 0, 0, 1024, 1536);
      resolve(true);
    };
    template.src = '/template.png';
  });

  // 2.5 Draw Stamp (Top Right) - Preserve natural aspect ratio
  await new Promise((resolve) => {
    const stamp = new Image();
    stamp.onload = () => {
      context.globalAlpha = 0.9;
      const stampWidth = 379;
      const stampHeight = (stamp.naturalHeight / stamp.naturalWidth) * stampWidth;
      const stampX = 1024 - 10 - stampWidth;
      const stampY = 15;
      context.drawImage(stamp, stampX, stampY, stampWidth, stampHeight);
      context.globalAlpha = 1.0;
      resolve(true);
    };
    stamp.src = '/stamp.png';
  });
  
  // 3. Draw Text (Top Layer)
  context.fillStyle = '#101010'; 
  context.textBaseline = 'top';

  // Name (DOM: font-mono text-[20px] font-black)
  context.font = '900 58px "Victor Mono", monospace'; 
  context.textAlign = 'left';
  context.fillText(data.name || 'YOUR NAME', 82, 1216); 
  
  // Class badge on the right (slightly bigger font & padding)
  context.font = '900 31px "Victor Mono", monospace';
  const badgeText = data.className || 'BUILDER CLASS';
  const textWidth = context.measureText(badgeText).width;
  const paddingX = 26;
  const paddingY = 12;
  const badgeWidth = textWidth + paddingX * 2;
  const badgeHeight = 31 + paddingY * 2;
  const badgeX = 942 - badgeWidth; 
  const badgeY = 1216; 
  
  // Shadow
  context.fillStyle = '#101010';
  context.fillRect(badgeX + 6, badgeY + 6, badgeWidth, badgeHeight);

  // Background
  context.fillStyle = '#ebd90b';
  context.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

  // Border
  context.lineWidth = 6;
  context.strokeStyle = '#101010';
  context.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

  // Badge Text
  context.fillStyle = '#101010';
  context.textBaseline = 'top';
  context.fillText(badgeText, badgeX + paddingX, badgeY + paddingY);

  // Stack (DOM: bottom-[13%], font-mono text-[12px] font-bold)
  context.textAlign = 'left';
  context.font = '700 36px "Victor Mono", monospace'; 
  context.fillText(data.stack || 'YOUR STACK', 82, 1294); 

  // Footer separator line
  context.lineWidth = 6;
  context.strokeStyle = '#101010';
  context.beginPath();
  context.moveTo(82, 1348);
  context.lineTo(942, 1348);
  context.stroke();

  // Footer text
  context.font = '700 27px "Victor Mono", monospace';
  context.fillText('HH GOA / 2026 | #FRAMEINGOA', 82, 1357);
}
