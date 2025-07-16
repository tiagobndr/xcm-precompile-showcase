import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createWalletClient, custom, formatEther, parseEther } from 'viem'
import { mainnet } from 'viem/chains'

declare global {
  interface Window {
    ethereum?: any
  }
}

export const useWalletStore = defineStore('wallet', () => {
  const isConnected = ref(false)
  const address = ref<string>('')
  const balance = ref<string>('0')
  const client = ref<any>(null)
  const contractAddress = ref<string>('')
  const shortAddress = computed(() => {
    if (!address.value) return ''
    return `${address.value.slice(0, 6)}...${address.value.slice(-4)}`
  })

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('MetaMask not found')
        return
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts.length > 0) {
        address.value = accounts[0]
        isConnected.value = true

        client.value = createWalletClient({
          chain: mainnet,
          transport: custom(window.ethereum)
        })

        await updateBalance()
      }
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  const disconnectWallet = () => {
    isConnected.value = false
    address.value = ''
    balance.value = '0'
    client.value = null
  }

  const updateBalance = async () => {
    if (!client.value || !address.value) return

    try {
      const balanceWei = await client.value.getBalance({ address: address.value })
      balance.value = formatEther(balanceWei)
    } catch (error) {
      console.error('Failed to get balance:', error)
    }
  }

  return {
    isConnected,
    address,
    balance,
    shortAddress,
    client,
    connectWallet,
    disconnectWallet,
    updateBalance,
    contractAddress
  }
})