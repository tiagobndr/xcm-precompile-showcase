import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  parseEther, 
  formatEther, 
  parseAbi,
  getContract,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient
} from 'viem'
import { mainnet } from 'viem/chains'
import { useWalletStore } from './wallet'
import { ContractNFT, TradeEvent } from '../types'
import { ABI } from '../abis/xcmMarketPlace'




const CONTRACT_ADDRESS = '0x...' 

export const useContractStore = defineStore('contract', () => {
  const walletStore = useWalletStore()
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const userNFTs = ref<ContractNFT[]>([])
  const minListingCost = ref<bigint>(0n)
  const minExchangeTokens = ref<bigint>(0n)
  const tradeEvents = ref<TradeEvent[]>([])

  const publicClient = ref<PublicClient | null>(null)
  const walletClient = ref<WalletClient | null>(null)

  const contract = computed(() => {
    if (!publicClient.value) return null
    return getContract({
      address: CONTRACT_ADDRESS as Address,
      abi: ABI,
      client: publicClient.value
    })
  })

  const walletContract = computed(() => {
    if (!walletClient.value) return null
    return getContract({
      address: CONTRACT_ADDRESS as Address,
      abi: ABI,
      client: walletClient.value
    })
  })

  const initClients = () => {
    publicClient.value = createPublicClient({
      chain: mainnet,
      transport: custom(window.ethereum)
    })

    if (walletStore.isConnected) {
      walletClient.value = createWalletClient({
        chain: mainnet,
        transport: custom(window.ethereum),
        account: walletStore.address as Address
      })
    }
  }

  const loadContractConstants = async () => {
    if (!contract.value) return

    try {
      const [listingCost, exchangeTokens] = await Promise.all([
        contract.value.read.MIN_LISTING_COST(),
        contract.value.read.MIN_EXCHANGE_TOKENS()
      ])

      minListingCost.value = listingCost as bigint
      minExchangeTokens.value = exchangeTokens as bigint
    } catch (err) {
      console.error('Failed to load contract constants:', err)
      error.value = 'Failed to load contract data'
    }
  }

  const loadUserNFTs = async () => {
    if (!contract.value || !walletStore.address) return

    try {
      isLoading.value = true
      const nfts: ContractNFT[] = []
      let index = 0

      while (true) {
        try {
          const tokenId = await contract.value.read.playerNFTs([
            walletStore.address as Address, 
            BigInt(index)
          ]) as bigint

          const [tokenURI, owner, approved, listedURI] = await Promise.all([
            contract.value.read.tokenURI([tokenId]),
            contract.value.read.ownerOf([tokenId]),
            contract.value.read.getApproved([tokenId]),
            contract.value.read.listedTokens([tokenId])
          ])

          nfts.push({
            tokenId: Number(tokenId),
            tokenURI: tokenURI as string,
            owner: owner as Address,
            approved: approved as Address,
            isListed: (listedURI as string).length > 0
          })

          index++
        } catch {
          break
        }
      }

      userNFTs.value = nfts
      error.value = null
    } catch (err) {
      console.error('Failed to load user NFTs:', err)
      error.value = 'Failed to load NFTs'
    } finally {
      isLoading.value = false
    }
  }

  const mintNFT = async (tokenURI: string): Promise<Hash | null> => {
    if (!walletContract.value || !walletStore.isConnected) {
      error.value = 'Wallet not connected'
      return null
    }

    try {
      isLoading.value = true
      error.value = null

      const hash = await walletContract.value.write.mintNFT([tokenURI], {
        value: minListingCost.value,
        account: walletStore.address as Address
      })

      await publicClient.value?.waitForTransactionReceipt({ hash })
      await loadUserNFTs()
      
      return hash
    } catch (err: any) {
      console.error('Mint failed:', err)
      if (err.message?.includes('NotEnoughEther')) {
        error.value = `Insufficient payment. Required: ${formatEther(minListingCost.value)} ETH`
      } else {
        error.value = 'Minting failed'
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  const approveMarketplace = async (tokenId: number): Promise<Hash | null> => {
    if (!walletContract.value || !walletStore.isConnected) {
      error.value = 'Wallet not connected'
      return null
    }

    try {
      isLoading.value = true
      error.value = null

      const hash = await walletContract.value.write.approve([
        CONTRACT_ADDRESS as Address,
        BigInt(tokenId)
      ], {
        account: walletStore.address as Address
      })

      await publicClient.value?.waitForTransactionReceipt({ hash })
      await loadUserNFTs()
      
      return hash
    } catch (err) {
      console.error('Approval failed:', err)
      error.value = 'Approval failed'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const tradeToken = async (tokenId: number, xcmMessage: string): Promise<Hash | null> => {
    if (!walletContract.value || !walletStore.isConnected) {
      error.value = 'Wallet not connected'
      return null
    }

    const nft = userNFTs.value.find(n => n.tokenId === tokenId)
    if (!nft || nft.approved !== CONTRACT_ADDRESS) {
      error.value = 'NFT must be approved for marketplace first'
      return null
    }

    try {
      isLoading.value = true
      error.value = null

      const messageBytes = new TextEncoder().encode(xcmMessage)

      const hash = await walletContract.value.write.tradeToken([
        BigInt(tokenId),
        `0x${Array.from(messageBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`
      ], {
        account: walletStore.address as Address
      })

      await publicClient.value?.waitForTransactionReceipt({ hash })
      
      const tradeEvent: TradeEvent = {
        tokenId,
        tokensReceived: minExchangeTokens.value,
        xcmMessage,
        transactionHash: hash
      }
      tradeEvents.value.unshift(tradeEvent)
      
      await loadUserNFTs()
      
      return hash
    } catch (err: any) {
      console.error('Trade failed:', err)
      if (err.message?.includes('MarketPlaceNotApproved')) {
        error.value = 'Marketplace not approved for this NFT'
      } else if (err.message?.includes('NFTTradeFailed')) {
        error.value = 'Trade execution failed'
      } else {
        error.value = 'Trade failed'
      }
      return null
    } finally {
      isLoading.value = false
    }
  }

  const checkApproval = async (tokenId: number): Promise<boolean> => {
    if (!contract.value) return false

    try {
      const approved = await contract.value.read.getApproved([BigInt(tokenId)]) as Address
      return approved.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
    } catch {
      return false
    }
  }

  const formatListingCost = computed(() => {
    return formatEther(minListingCost.value)
  })

  const formatExchangeTokens = computed(() => {
    return formatEther(minExchangeTokens.value)
  })
  
  const clearError = () => {
    error.value = null
  }

  return {
    isLoading,
    error,
    userNFTs,
    minListingCost,
    minExchangeTokens,
    tradeEvents,
    formatListingCost,
    formatExchangeTokens,
    initClients,
    loadContractConstants,
    loadUserNFTs,
    mintNFT,
    approveMarketplace,
    tradeToken,
    checkApproval,
    clearError
  }
})
