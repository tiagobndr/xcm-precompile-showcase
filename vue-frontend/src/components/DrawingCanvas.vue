<template>
  <div class="drawing-canvas">
    <div class="canvas-container">
      <canvas
        ref="canvasRef"
        width="800"
        height="600"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        class="canvas"
      />
    </div>
    
    <div class="controls">
      <div class="color-palette">
        <div
          v-for="color in colors"
          :key="color"
          :style="{ backgroundColor: color }"
          :class="['color-swatch', { active: currentColor === color }]"
          @click="currentColor = color"
        />
        <input
          v-model="currentColor"
          type="color"
          class="custom-color"
        />
      </div>
      
      <div class="brush-controls">
        <label>Brush Size: {{ brushSize }}px</label>
        <input
          v-model="brushSize"
          type="range"
          min="1"
          max="50"
          class="brush-slider"
        />
      </div>
      
      <div class="action-buttons">
        <button @click="clearCanvas" class="btn btn-secondary">Clear</button>
        <button @click="exportDrawing" class="btn btn-primary">Export</button>
        <button 
          @click="mintNFT" 
          :disabled="isLoading"
          class="btn btn-success"
        >
          {{ isLoading ? 'Minting...' : `Mint NFT (${formatListingCost} ETH)` }}
        </button>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
        <button @click="clearError" class="error-close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDrawingStore } from '../stores/drawing'
import { useContractStore } from '../stores/contract'
import { useWalletStore } from '../stores/wallet'

const drawingStore = useDrawingStore()
const contractStore = useContractStore()
const walletStore = useWalletStore()
const canvasRef = ref<HTMLCanvasElement>()

const {
  currentColor,
  brushSize,
  colors,
  startDrawing: storeStartDrawing,
  draw: storeDraw,
  stopDrawing,
  clearCanvas,
  exportImage,
  uploadToIPFS
} = drawingStore

const {
  isLoading,
  error,
  formatListingCost,
  mintNFT: contractMintNFT,
  clearError
} = contractStore

onMounted(async () => {
  if (canvasRef.value) {
    drawingStore.initCanvas(canvasRef.value)
  }
  
  if (walletStore.isConnected) {
    contractStore.initClients()
    await contractStore.loadContractConstants()
  }
})

const startDrawing = (event: MouseEvent) => {
  storeStartDrawing(event)
}

const draw = (event: MouseEvent) => {
  storeDraw(event)
}

const exportDrawing = () => {
  const imageData = exportImage()
  const link = document.createElement('a')
  link.download = 'drawing.png'
  link.href = imageData
  link.click()
}

const mintNFT = async () => {
  if (!walletStore.isConnected) {
    alert('Please connect your wallet first')
    return
  }

  const imageData = exportImage()
  if (!imageData) {
    alert('Please draw something first')
    return
  }

  try {
    const ipfsURI = await uploadToIPFS(imageData)
    const hash = await contractMintNFT(ipfsURI)
    
    if (hash) {
      alert(`NFT minted successfully! Transaction: ${hash}`)
      clearCanvas()
    }
  } catch (err) {
    console.error('Minting failed:', err)
  }
}
</script>

<style scoped>
.drawing-canvas {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.canvas-container {
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.canvas {
  cursor: crosshair;
  display: block;
  background: white;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.color-palette {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-swatch {
  width: 40px;
  height: 40px;
  border: 2px solid #ddd;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.color-swatch.active {
  border-color: #007bff;
  border-width: 3px;
}

.custom-color {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.brush-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.brush-slider {
  width: 150px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 6px;
  border: 1px solid #f5c6cb;
}

.error-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #721c24;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>