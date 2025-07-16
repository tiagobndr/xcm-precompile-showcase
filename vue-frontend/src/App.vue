<template>
  <div id="app">
    <header class="app-header">
      <h1>NFT Drawing Studio</h1>
      <WalletConnect />
    </header>
    
    <main class="app-main">
      <div v-if="!isConnected" class="connect-prompt">
        <div class="prompt-content">
          <h2>Welcome to NFT Drawing Studio</h2>
          <p>Connect your MetaMask wallet to start creating and minting NFTs from your drawings.</p>
        </div>
      </div>
      
      <div v-else class="app-content">
        <DrawingCanvas />
        <NFTGallery />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useWalletStore } from './stores/wallet'
import WalletConnect from './components/WalletConnect.vue'
import DrawingCanvas from './components/DrawingCanvas.vue'
import NFTGallery from './components/NFTGallery.vue'
import { storeToRefs } from 'pinia'

const walletStore = useWalletStore()
const { isConnected } = storeToRefs(walletStore)


 
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: white;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-header h1 {
  color: #333;
  font-size: 1.8em;
}

.app-main {
  flex: 1;
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.connect-prompt {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.prompt-content {
  text-align: center;
  max-width: 500px;
}

.prompt-content h2 {
  margin-bottom: 20px;
  color: #333;
}

.prompt-content p {
  color: #666;
  line-height: 1.6;
}

.app-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

@media (max-width: 768px) {
  .app-header {
    padding: 15px 20px;
    flex-direction: column;
    gap: 15px;
  }
  
  .app-main {
    padding: 20px;
  }
  
  .app-header h1 {
    font-size: 1.5em;
  }
}
</style>