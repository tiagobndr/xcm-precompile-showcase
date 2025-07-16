<template>
    <div class="wallet-connect">
        <div v-if="!isConnected" class="connect-section">
            <button @click="walletStore.connectWallet" class="btn btn-primary">
                Connect MetaMask
            </button>
        </div>

        <div v-else class="wallet-info">
            <div class="address-info">
                <span class="address">{{ shortAddress }}</span>
                <span class="balance">{{ parseFloat(balance).toFixed(4) }} ETH</span>
            </div>
            <button @click="walletStore.disconnectWallet" class="btn btn-secondary">
                Disconnect
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useWalletStore } from '../stores/wallet'

const walletStore = useWalletStore()
const { isConnected, shortAddress, balance } = storeToRefs(walletStore)
</script>

<style scoped>
.wallet-connect {
    display: flex;
    align-items: center;
    gap: 15px;
}

.wallet-info {
    display: flex;
    align-items: center;
    gap: 15px;
}

.address-info {
    display: flex;
    flex-direction: column;
    text-align: right;
}

.address {
    font-weight: 600;
    color: #333;
}

.balance {
    font-size: 0.9em;
    color: #666;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
}

.btn-primary {
    background-color: #007bff;
    color: white;
}

.btn-secondary {
    background-color: #6c757d;
    color: white;
}

.btn:hover {
    opacity: 0.9;
}
</style>