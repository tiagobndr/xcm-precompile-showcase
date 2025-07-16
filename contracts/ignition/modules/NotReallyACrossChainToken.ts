// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const NotReallyACrossChainTokenModule = buildModule(
  "NotReallyACrossChainTokenModule",
  (m) => {
    const token = m.contract("NotReallyACrossChainToken");

    return { token };
  },
);

export default NotReallyACrossChainTokenModule;
