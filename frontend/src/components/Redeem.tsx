import { notReallyACrossChainTokenModuleNotReallyACrossChainTokenAbi } from "../generated";
import { useWriteContract } from "wagmi";

import { useState } from "react";
import { generateXcmMessage } from "../utils/get-XCM-message";

export function Redeem(params: {
  contractAddress: `0x${string}`;
  decimals: number;
  symbol: string;
}) {
  const [amount, setAmount] = useState<bigint>(0n);
  const [chainId, setChainId] = useState(0);

  const { writeContract, status, data, error } = useWriteContract();

  type ChainLabel = "Asset Hub" | "People" | "Coretime" | "Relay Chain";

  const chainOptions: Record<ChainLabel, number | null> = {
    "Asset Hub": 1000,
    People: 1004,
    Coretime: 1005,
    "Relay Chain": null,
  };

  return (
    <div className="my-5 mx-2 p-2 w-fit inline-block">
      <h3 className="px-2 block mb-2 font-bold text-lg">
        Reedem {params.symbol}s to PAS
      </h3>

      <div className="text-right my-2">
        <label htmlFor="chainSelect" className="px-2 mb-2 inline-block">
          Chain
        </label>
        <select
          id="chainSelect"
          onChange={(e) => {
            const selected = e.target.value as ChainLabel;
            if (chainOptions[selected] !== null) {
              setChainId(chainOptions[selected] as number);
            }
          }}
          disabled={status === "pending"}
          defaultValue=""
          className="
      border rounded-md pl-2 h-10 w-[400px]
      focus:ring-2 focus:ring-inset focus:ring-indigo-600
    "
        >
          <option value="" disabled hidden>
            Select a chain
          </option>
          {Object.entries(chainOptions).map(([label, id]) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="text-right my-2">
        <label htmlFor="amount" className="px-2 inline-block mb-2">
          Amount
        </label>
        <input
          id="amount"
          type="number"
          placeholder="0"
          onChange={(e) =>
            setAmount(BigInt(e.target.value) * 10n ** BigInt(params.decimals))
          }
          disabled={status === "pending"}
          className="
            border rounded-md padding-1 pl-2 h-10 w-[400px]
            focus:ring-2 focus:ring-inset focus:ring-indigo-600
          "
        />
      </div>

      <button
        onClick={async () => {
          const message = await generateXcmMessage(
            "5CPWuyB5HLfEx2SVKXp4CvyjRBta7GKu2X3GUNSVjJtNMapa", // TODO
            chainId,
            amount / 10n ** BigInt(params.decimals - 10), // Convert to 10 decimals (used on PAsset Hub and Paseo)
          );

          writeContract({
            address: params.contractAddress,
            abi: notReallyACrossChainTokenModuleNotReallyACrossChainTokenAbi,
            functionName: "redeem",
            args: [amount, message as `0x${string}`],
          });
        }}
        disabled={status === "pending"}
        className="
        my-0 mx-3 h-10 py-0
        focus:ring-2 focus:ring-inset focus:ring-indigo-600
      "
      >
        Redeem{" "}
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
