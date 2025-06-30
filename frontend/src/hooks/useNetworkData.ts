import { useEffect, useState } from "react";
import { Contract, formatEther } from "ethers";
import { ContractData } from "contracts";
import { ethersProvider } from "../ethersProvider";

export function useNetworkData(contractData: ContractData) {
  const [storedValue, setStoredValue] = useState("");
  const [balance, setBalance] = useState("");
  const [chainId, setChainId] = useState("");

  useEffect(() => {
    if (ethersProvider !== null) {
      const provider = ethersProvider;
      provider.getSigner().then(signer => {
        const contract = new Contract(contractData.address, contractData.abi, signer);

        Promise.all([
          contract.retrieve(),
          provider.getBalance(contractData.address),
          provider.getNetwork()
        ]).then(([storedValue, contractBalance, network]) => {
          setStoredValue(storedValue.toString());
          setBalance(`${formatEther(contractBalance)} ETH`);
          setChainId(network.chainId.toString());
        });
      });
    }
  }, [contractData.abi, contractData.address]);

  return { storedValue, balance, chainId };
}
