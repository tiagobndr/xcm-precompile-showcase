import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface NFT {
  id: string
  imageUrl: string
  ipfsHash: string
  tokenId: number
  isConverted: boolean
}

export const useDrawingStore = defineStore('drawing', () => {
  const canvas = ref<HTMLCanvasElement | null>(null)
  const ctx = ref<CanvasRenderingContext2D | null>(null)
  const isDrawing = ref(false)
  const currentColor = ref('#000000')
  const brushSize = ref(5)

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ]

  const initCanvas = (canvasElement: HTMLCanvasElement) => {
    canvas.value = canvasElement
    ctx.value = canvasElement.getContext('2d')
    if (ctx.value) {
      ctx.value.lineCap = 'round'
      ctx.value.lineJoin = 'round'
    }
  }

  const startDrawing = (event: MouseEvent) => {
    if (!ctx.value) return
    isDrawing.value = true
    ctx.value.beginPath()
    ctx.value.moveTo(event.offsetX, event.offsetY)
  }

  const draw = (event: MouseEvent) => {
    if (!isDrawing.value || !ctx.value) return
    ctx.value.lineWidth = brushSize.value
    ctx.value.strokeStyle = currentColor.value
    ctx.value.lineTo(event.offsetX, event.offsetY)
    ctx.value.stroke()
  }

  const stopDrawing = () => {
    isDrawing.value = false
  }

  const clearCanvas = () => {
    if (!canvas.value || !ctx.value) return
    ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
  }

  const exportImage = (): string => {
    if (!canvas.value) return ''
    return canvas.value.toDataURL('image/png')
  }

  const uploadToIPFS = async (imageData: string): Promise<string> => {
    try {
      const response = await fetch(imageData)
      const blob = await response.blob()
      
      const formData = new FormData()
      formData.append('file', blob, 'drawing.png')
      
      const uploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer YOUR_PINATA_JWT_TOKEN`
        },
        body: formData
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }
      
      const result = await uploadResponse.json()
      return `ipfs://${result.IpfsHash}`
    } catch (error) {
      console.error('IPFS upload failed:', error)
      return `ipfs://QmMockHash${Date.now()}`
    }
  }

  return {
    canvas,
    ctx,
    isDrawing,
    currentColor,
    brushSize,
    colors,
    initCanvas,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    exportImage,
    uploadToIPFS
  }
})