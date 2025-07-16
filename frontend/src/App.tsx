import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import "./App.css";
import { notReallyACrossChainTokenModuleNotReallyACrossChainTokenAddress } from "./generated";

import polkadotLogo from "./assets/polkadot-logo.svg";
import { ContractData } from "./components/ContractData";

const contractAddress =
  notReallyACrossChainTokenModuleNotReallyACrossChainTokenAddress[420420422];

function App() {
  const accountData = useAccount();

  const { connect } = useConnect();

  return (
    <>
      <img
        src={polkadotLogo}
        className="mx-auto h-52	p-4 logo"
        alt="Polkadot logo"
      />
      {accountData.connector !== undefined ? (
        <div className="container mx-auto p-2 leading-6">
          <h2 className="text-2xl font-bold">Success!</h2>
          <p>Metamask wallet connected!</p>
          <p>
            Connected to chain ID:{" "}
            <span className="font-bold">{accountData.chainId}</span>
          </p>

          <p>
            {accountData.addresses && accountData.addresses.length > 0 ? (
              <>
                <b>{accountData.addresses.length}</b> addresses connected!
              </>
            ) : (
              <>No addresses connected</>
            )}
          </p>
        </div>
      ) : (
        <div className="container mx-auto p-2 leading-6">
          <p>
            Metamask wallet not connected or installed. Chain interaction is
            disabled.
          </p>

          <button onClick={() => connect({ connector: injected() })}>
            Connect
          </button>
        </div>
      )}

      <ContractData
        contractAddress={contractAddress}
        userAddresses={accountData.addresses}
      />
    </>
  );
}

export default App;
