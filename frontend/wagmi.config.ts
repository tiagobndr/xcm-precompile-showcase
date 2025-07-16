import { defineConfig, ContractConfig } from "@wagmi/cli";
import { Abi } from "viem";
import fs from "fs";
import path from "path";

let dirEntries: fs.Dirent[] = [];

const deploymentsDir = path.join("..", "contracts", "ignition", "deployments");

try {
  dirEntries.push(
    ...fs.readdirSync(deploymentsDir, { recursive: true, withFileTypes: true }),
  );
} catch (e: unknown) {
  if (!(e instanceof Error && "code" in e && e.code === "ENOENT")) {
    throw e;
  }

  console.warn(`No contracts found in ${deploymentsDir}. Deploy one first.`);
  process.exit(1);
}

const deployedAddressesEntries = dirEntries.filter(
  (entry) => entry.name === "deployed_addresses.json",
);

const artifactEntries = dirEntries.filter(
  (entry) =>
    entry.isFile() &&
    entry.parentPath.includes("artifacts") &&
    entry.name.endsWith(".json") &&
    !entry.name.endsWith(".dbg.json"),
);

if (artifactEntries.length === 0) {
  console.warn(`No contracts found in ${deploymentsDir}. Deploy one first.`);
  process.exit(1);
}

const abisByContractName: Record<string, Abi> = {};

for (const entry of artifactEntries) {
  const fileContents = fs.readFileSync(
    path.join(entry.parentPath, entry.name),
    "utf-8",
  );
  const abi = JSON.parse(fileContents).abi as Abi;

  abisByContractName[entry.name.replace(/\.json$/, "")] = abi;
}

type ContractName = string;
const deployedContracts: Record<ContractName, ContractConfig> = {};

const chainIdRegex = /(chain-)(\d+)/;
for (const entry of deployedAddressesEntries) {
  const chainId = entry.parentPath.match(chainIdRegex)?.[2];
  if (!chainId) {
    throw new Error(`chainId is missing in path ${entry.parentPath}`);
  }
  const fileContents = fs.readFileSync(
    path.join(entry.parentPath, entry.name),
    "utf-8",
  );

  for (const [name, address] of Object.entries(JSON.parse(fileContents)) as [
    ContractName,
    `0x${string}`,
  ][]) {
    const abi = abisByContractName[name];
    if (!abi) {
      throw new Error(
        `Can't find abi for deployed contract ${name} in chain ${chainId}`,
      );
    }

    if (!deployedContracts[name])
      deployedContracts[name] = { name, abi, address: {} };
    const addressMap = deployedContracts[name].address! as Record<
      number,
      `0x${string}`
    >;
    addressMap[parseInt(chainId)] = address;
  }
}

if (process.env.DEBUG === "1") {
  console.log("deployedAddressesEntries", deployedAddressesEntries);
  console.log("artifactEntries", artifactEntries);
  console.log("deployedAddresses", deployedContracts);
}

export default defineConfig({
  out: "src/generated.ts",
  contracts: Object.values(deployedContracts),
  plugins: [],
});
