import { http, createConfig } from "@wagmi/core";
import { type Chain } from "viem";
import { metaMask } from "@wagmi/connectors";

const passetHub = {
  id: 420420422,
  name: "Passet Hub",
  nativeCurrency: {
    name: "PAS",
    symbol: "PAS",
    decimals: 12,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
    },
  },
} as const satisfies Chain;

export const config = createConfig({
  chains: [passetHub],
  transports: {
    [passetHub.id]: http(),
  },
  connectors: [
    metaMask({
      dappMetadata: {
        name: "create-polkadot-dapp",
      },
    }),
  ],
});
