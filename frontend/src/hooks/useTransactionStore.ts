import { useCallback, useState } from "react";
import { Contract, ContractTransactionResponse } from "ethers";
import { ContractData } from "contracts";
import { ethersProvider } from "../ethersProvider";

enum Status {Initial, Loading, Success, Revert};

export function useTransactionStore(contractData: ContractData) {
  const [status, setStatus] = useState(Status.Initial);
  const [amount, setAmount] = useState(0);
  const [moneyAmount, setMoneyAmount] = useState(0n);

  const submit = useCallback(() => {
    if (ethersProvider !== null) {
      const provider = ethersProvider;
      setStatus(Status.Loading);
      provider.getSigner().then(async signer => {
        const contract = new Contract(contractData.address, contractData.abi, signer);

        const response: ContractTransactionResponse = await (
          moneyAmount > 0 ?
            contract.addMoney(amount, { value: moneyAmount })
            : contract.store(amount)
        );
        console.log("Transaction response", response);

        const receipt = await response.wait();
        console.log("Transaction receipt", receipt);

        if (receipt === null) {
          setStatus(Status.Revert);
          return;
        }

        setStatus(Status.Success);
      }).catch((e) => {
        console.error(e);
        setStatus(Status.Revert);
      });
    }
  }, [amount, moneyAmount, contractData.abi, contractData.address]);

  return { status, setAmount, setMoneyAmount, submit };
}
