import { type Abi } from "wagmi";

export type ContractData = {
  contractName: string;
  sourceName: string;
  abi: Abi;
  bytecode: string;
};
