import { notReallyACrossChainTokenModuleNotReallyACrossChainTokenAbi } from "../generated";
import { useWriteContract } from "wagmi";

import { useState } from "react";

export function Mint(params: {
  contractAddress: `0x${string}`;
  decimals: number;
  symbol: string;
}) {
  const [amount, setAmount] = useState(0);
  const [address, setAddress] = useState<`0x${string}`>(
    "0x932217f9faf715808c1f76eA9EeAb7026806C963",
  );

  const { writeContract, status, data, error } = useWriteContract();

  return (
    <div className="my-5 mx-2 p-2 w-fit inline-block">
      <h3 className="px-2 block mb-2 font-bold text-lg">
        Mint {params.symbol}s
      </h3>
      <div className="text-right my-2">
        <label htmlFor="amount" className="px-2 mb-2 inline-block">
          Amount
        </label>
        <input
          id="amount"
          type="number"
          placeholder="0"
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={status === "pending"}
          className="
            border rounded-md padding-1 pl-2 h-10 w-[400px]
            focus:ring-2 focus:ring-inset focus:ring-indigo-600
          "
        />
      </div>

      <button
        onClick={() =>
          writeContract({
            address: params.contractAddress,
            abi: notReallyACrossChainTokenModuleNotReallyACrossChainTokenAbi,
            functionName: "mint",
            value: BigInt(amount) * 10n ** BigInt(params.decimals),
          })
        }
        disabled={status === "pending"}
        className="
        my-0 mx-3 h-10 py-0
        focus:ring-2 focus:ring-inset focus:ring-indigo-600
      "
      >
        Mint{" "}
        {status === "pending"
          ? "⏳"
          : status === "success"
            ? "✅"
            : status === "error"
              ? "❌"
              : ""}
      </button>
    </div>
  );
}
