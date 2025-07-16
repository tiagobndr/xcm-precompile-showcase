<template>
  <div class="nft-gallery">
    <div class="gallery-header">
      <h3>Your NFTs</h3>
      <div class="stats-display">
        <div class="stat-item">
          <span class="stat-label">Exchange Rate:</span>
          <span class="stat-value">{{ formatExchangeTokens }} Tokens</span>
        </div>
        <button 
          @click="refreshNFTs" 
          :disabled="isLoading"
          class="btn btn-refresh"
        >
          {{ isLoading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="clearError" class="error-close">×</button>
    </div>
    
    <div v-if="isLoading && userNFTs.length === 0" class="loading-state">
      <p>Loading your NFTs...</p>
    </div>
    
    <div v-else-if="userNFTs.length === 0" class="empty-state">
      <p>No NFTs found. Create your first drawing and mint it as an NFT!</p>
    </div>
    
    <div v-else class="nft-grid">
      <div
        v-for="nft in userNFTs"
        :key="nft.tokenId"
        class="nft-card"
      >
        <div class="nft-image-container">
          <img 
            v-if="nft.tokenURI.startsWith('data:')"
            :src="nft.tokenURI" 
            :alt="`NFT ${nft.tokenId}`" 
            class="nft-image" 
          />
          <div v-else class="nft-placeholder">
            <span>NFT #{{ nft.tokenId }}</span>
          </div>
        </div>
        
        <div class="nft-info">
          <div class="nft-details">
            <span class="token-id">Token ID: {{ nft.tokenId }}</span>
            <span class="token-uri">{{ formatTokenURI(nft.tokenURI) }}</span>
            <span class="approval-status" :class="{ approved: nft.approved === contractAddress }">
              {{ nft.approved === contractAddress ? 'Approved for Trading' : 'Not Approved' }}
            </span>
          </div>
          
          <div class="nft-actions">
            <button
              v-if="nft.approved !== contractAddress"
              @click="approveForTrading(nft.tokenId)"
              :disabled="isLoading"
              class="btn btn-approve"
            >
              Approve for Trading
            </button>
            
            <button
              v-else
              @click="tradeNFT(nft.tokenId)"
              :disabled="isLoading"
              class="btn btn-trade"
            >
              Trade for {{ formatExchangeTokens }} Tokens
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="tradeEvents.length > 0" class="trade-history">
      <h4>Recent Trades</h4>
      <div class="trade-list">
        <div
          v-for="trade in tradeEvents.slice(0, 5)"
          :key="trade.transactionHash"
          class="trade-item"
        >
          <span class="trade-token">NFT #{{ trade.tokenId }}</span>
          <span class="trade-tokens">{{ formatEther(trade.tokensReceived) }} Tokens</span>
          <a 
            :href="`https://etherscan.io/tx/${trade.transactionHash}`"
            target="_blank"
            class="trade-link"
          >
            View Transaction
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { formatEther } from 'viem'
import { useContractStore } from '../stores/contract'
import { useWalletStore } from '../stores/wallet'

const contractStore = useContractStore()
const walletStore = useWalletStore()

const {
  isLoading,
  error,
  userNFTs,
  formatExchangeTokens,
  tradeEvents,
  loadUserNFTs,
  approveMarketplace,
  tradeToken,
  clearError,
  contractAddress
} = contractStore



onMounted(async () => {
  if (walletStore.isConnected) {
    contractStore.initClients()
    await contractStore.loadContractConstants()
    await loadUserNFTs()
  }
})

const refreshNFTs = async () => {
  await loadUserNFTs()
}

const formatTokenURI = (uri: string): string => {
  if (uri.startsWith('ipfs://')) {
    return `IPFS: ${uri.slice(7, 17)}...`
  }
  if (uri.startsWith('data:')) {
    return 'Data URI (Drawing)'
  }
  return uri.length > 30 ? `${uri.slice(0, 30)}...` : uri
}

const approveForTrading = async (tokenId: number) => {
  const hash = await approveMarketplace(tokenId)
  if (hash) {
    alert(`NFT approved for trading! Transaction: ${hash}`)
  }
}

const tradeNFT = async (tokenId: number) => {
  const xcmMessage = `Trade NFT ${tokenId} for tokens`
  const hash = await tradeToken(tokenId, xcmMessage)
  if (hash) {
    alert(`NFT traded successfully! You received ${formatExchangeTokens} tokens. Transaction: ${hash}`)
  }
}
</script>

<style scoped>
.nft-gallery {
  margin-top: 40px;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.gallery-header h3 {
  margin: 0;
  color: #333;
}

.tokens-display {
  padding: 8px 16px;
  background-color: #f8f9fa;
  border-radius: 20px;
  font-weight: 600;
  color: #28a745;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.nft-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.nft-card {
  border: 1px solid #ddd;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.nft-card:hover {
  transform: translateY(-4px);
}

.nft-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.nft-info {
  padding: 15px;
}

.nft-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}

.token-id {
  font-weight: 600;
  color: #333;
}

.ipfs-hash {
  font-size: 0.9em;
  color: #666;
  font-family: monospace;
}

.nft-actions {
  display: flex;
  justify-content: center;
}

.btn-convert {
  padding: 8px 16px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.btn-convert:hover {
  background-color: #218838;
}

.converted-label {
  padding: 8px 16px;
  background-color: #f8f9fa;
  color: #6c757d;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: 500;
}
</style>


