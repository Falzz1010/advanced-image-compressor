'use client'  

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Download, Settings, Crop, Filter, Save, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { 
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast, Toaster } from 'react-hot-toast'
import Image from 'next/image'

type ImageFile = File & {
  id: string
  preview: string
  compressed?: string
  originalSize: number
  compressedSize?: number
  progress: number
}

type Preset = {
  name: string
  quality: number
  format: string
  maxWidth: number
  applyFilter: boolean
}

const filters = {
  none: 'none',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(100%)',
  invert: 'invert(100%)',
}

export default function AdvancedImageCompressor() {
  const [files, setFiles] = useState<ImageFile[]>([])
  const [quality, setQuality] = useState(80)
  const [format, setFormat] = useState('jpeg')
  const [maxWidth, setMaxWidth] = useState(1920)
  const [applyFilter, setApplyFilter] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState('none')
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedPreset, setSelectedPreset] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const savedPresets = localStorage.getItem('compressionPresets')
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets))
    }
  }, [])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [
      ...prevFiles,
      ...acceptedFiles.map(file => 
        Object.assign(file, {
          id: Math.random().toString(36).substr(2, 9),
          preview: URL.createObjectURL(file),
          originalSize: file.size,
          progress: 0,
        })
      )
    ])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {'image/*': []}
  })

  const applyImageFilter = (img: HTMLImageElement, filter: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.filter = filter
      ctx.drawImage(img, 0, 0, img.width, img.height)
      canvas.toBlob((blob) => resolve(blob!), `image/${format}`, quality / 100)
    })
  }

  const compressImage = async (file: ImageFile) => {
    return new Promise<ImageFile>((resolve) => {
      const img = document.createElement('img')
      img.src = file.preview
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('Unable to get 2D context')
        }
  
        const scaleFactor = maxWidth / img.width
        canvas.width = maxWidth
        canvas.height = img.height * scaleFactor
  
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
        let blob: Blob
        if (applyFilter) {
          ctx.filter = filters[selectedFilter as keyof typeof filters]
          ctx.drawImage(canvas, 0, 0)
          blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), `image/${format}`, quality / 100))
        } else {
          blob = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), `image/${format}`, quality / 100))
        }
  
        const compressedFile = new File([blob], file.name, {
          type: `image/${format}`,
          lastModified: Date.now(),
        }) as ImageFile
  
        compressedFile.id = file.id
        compressedFile.preview = URL.createObjectURL(compressedFile)
        compressedFile.compressed = compressedFile.preview
        compressedFile.originalSize = file.size
        compressedFile.compressedSize = blob.size
        compressedFile.progress = 100
  
        resolve(compressedFile)
      }
    })
  }

  const handleCompress = async () => {
    setIsProcessing(true)
    const compressedFiles = await Promise.all(
      files.map(async (file) => {
        const compressedFile = await compressImage(file)
        setFiles(prevFiles => 
          prevFiles.map(f => f.id === file.id ? { ...f, progress: 100 } : f)
        )
        return compressedFile
      })
    )
    setFiles(compressedFiles)
    setIsProcessing(false)
    toast.success('All images compressed successfully!')
  }

  const handleDownload = (file: ImageFile) => {
    const link = document.createElement('a')
    link.href = file.compressed || file.preview
    link.download = `compressed_${file.name}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadAll = () => {
    files.forEach(handleDownload)
    toast.success('All compressed images downloaded!')
  }

  const handleRemove = (fileToRemove: ImageFile) => {
    setFiles(files.filter(file => file !== fileToRemove))
  }

  const handleClearAll = () => {
    setFiles([])
    toast.success('All images cleared!')
  }

  const handleSavePreset = () => {
    const presetName = prompt('Enter a name for this preset:')
    if (presetName) {
      const newPreset: Preset = { name: presetName, quality, format, maxWidth, applyFilter }
      setPresets([...presets, newPreset])
      localStorage.setItem('compressionPresets', JSON.stringify([...presets, newPreset]))
      toast.success('Preset saved successfully!')
    }
  }

  const handleLoadPreset = (preset: Preset) => {
    setQuality(preset.quality)
    setFormat(preset.format)
    setMaxWidth(preset.maxWidth)
    setApplyFilter(preset.applyFilter)
    setSelectedPreset(preset.name)
    toast.success(`Preset "${preset.name}" loaded!`)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Advanced Image Compressor</h1>
      
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 text-center cursor-pointer hover:border-primary transition-colors">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <div>
            <Upload className="mx-auto mb-4" />
            <p>Drag 'n' drop some files here, or click to select files</p>
          </div>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Compression Settings</CardTitle>
          <CardDescription>Adjust the compression parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quality">Quality</Label>
            <Slider
              id="quality"
              min={1}
              max={100}
              step={1}
              value={[quality]}
              onValueChange={(value) => setQuality(value[0])}
            />
            <p className="text-sm text-muted-foreground">{quality}%</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxWidth">Max Width</Label>
            <Input
              id="maxWidth"
              type="number"
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="applyFilter"
              checked={applyFilter}
              onCheckedChange={setApplyFilter}
            />
            <Label htmlFor="applyFilter">Apply Filter</Label>
          </div>
          {applyFilter && (
            <div className="space-y-2">
              <Label htmlFor="filter">Filter</Label>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="grayscale">Grayscale</SelectItem>
                  <SelectItem value="sepia">Sepia</SelectItem>
                  <SelectItem value="invert">Invert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleCompress} disabled={isProcessing || files.length === 0}>
            {isProcessing ? 'Processing...' : 'Compress Images'}
          </Button>
          <Button onClick={handleSavePreset} variant="outline">
            <Save className="mr-2 h-4 w-4" /> Save Preset
          </Button>
        </CardFooter>
      </Card>

      {presets.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Saved Presets</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPreset} onValueChange={(value) => {
              const preset = presets.find(p => p.name === value)
              if (preset) handleLoadPreset(preset)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <Card key={file.id} className="overflow-hidden">
            <CardHeader className="p-0">
              <Image
                src={file.compressed || file.preview}
                alt={file.name}
                width={300}
                height={200}
                className="w-full h-48 object-cover"
                style={{ filter: applyFilter ? filters[selectedFilter as keyof typeof filters] : 'none' }}
              />
            </CardHeader>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">{file.name}</h3>
              <p className="text-sm text-muted-foreground">
                Original: {(file.originalSize / 1024).toFixed(2)} KB
              </p>
              {file.compressedSize && (
                <p className="text-sm text-muted-foreground">
                  Compressed: {(file.compressedSize / 1024).toFixed(2)} KB
                </p>
              )}
              <Progress value={file.progress} className="mt-2" />
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download compressed image</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="sm" onClick={() => handleRemove(file)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove image</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardFooter>
          </Card>
        ))}
      </div>

      {files.length > 0 && (
        <div className="mt-6 flex justify-center space-x-4">
          <Button onClick={handleDownloadAll}>
            <Download className="mr-2 h-4 w-4" /> Download All
          </Button>
          <Button variant="destructive" onClick={handleClearAll}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear All
          </Button>
        </div>
      )}

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="fixed bottom-4 right-4">
            <Settings className="mr-2 h-4 w-4" /> About
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About Advanced Image Compressor</DialogTitle>
            <DialogDescription>
              This application allows you to compress, resize, and apply filters to images directly in your browser. 
              It uses modern web technologies to provide a fast and efficient compression solution 
              without  uploading your images to any server.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Features:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Drag and drop file upload</li>
              <li>Adjustable compression quality</li>
              <li>Multiple output formats (JPEG, PNG, WebP)</li>
              <li>Image resizing</li>
              <li>Apply filters (Grayscale, Sepia, Invert)</li>
              <li>Save and load compression presets</li>
              <li>Batch processing with progress indicators</li>
              <li>Individual and bulk download options</li>
              <li>Clear all processed images</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
