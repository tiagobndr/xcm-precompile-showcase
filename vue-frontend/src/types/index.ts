import { Address, Hash } from "viem"

export type ContractNFT = {
    tokenId: number
    tokenURI: string
    owner: Address
    approved: Address
    isListed: boolean
}

export type TradeEvent = {
    tokenId: number
    tokensReceived: bigint
    xcmMessage: string
    transactionHash: Hash
}