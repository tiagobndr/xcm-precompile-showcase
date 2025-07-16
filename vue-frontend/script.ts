import { checksumAddress, createWalletClient, encodeFunctionData, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { decodeAddress } from '@polkadot/keyring';
import { ABI, BYTECODE } from './src/abis/xcmMarketPlace';

const ACCOUNTS = {
    alice: '0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133',
    bob: '0x398f0c28f98885e046333d4a41c19cee4c37368a9832c6502f6cfd182e2aef89'
};

type Weight = {
    proofSize: string;
    refTime: string;
}

type Primitive = {
    ok?: {
        err?: any
    };
    err?: any;
}

const account = privateKeyToAccount(ACCOUNTS.alice as `0x${string}`);
const precompileAddress = checksumAddress("0x00000000000000000000000000000000000A0000");

const client = createWalletClient({
    account,
    transport: http('https://westend-asset-hub-eth-rpc.polkadot.io')
}).extend(publicActions);

const abi = [
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "message",
                "type": "bytes"
            },
            {
                "components": [
                    {
                        "internalType": "uint64",
                        "name": "refTime",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "proofSize",
                        "type": "uint64"
                    }
                ],
                "internalType": "struct IXcm.Weight",
                "name": "weight",
                "type": "tuple"
            }
        ],
        "name": "execute",
        "outputs": [
            {
                "internalType": "bytes",
                "name": "",
                "type": "bytes"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "destination",
                "type": "bytes"
            },
            {
                "internalType": "bytes",
                "name": "message",
                "type": "bytes"
            }
        ],
        "name": "send",
        "outputs": [
            {
                "internalType": "bytes",
                "name": "",
                "type": "bytes"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "message",
                "type": "bytes"
            }
        ],
        "name": "weighMessage",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "uint64",
                        "name": "refTime",
                        "type": "uint64"
                    },
                    {
                        "internalType": "uint64",
                        "name": "proofSize",
                        "type": "uint64"
                    }
                ],
                "internalType": "struct IXcm.Weight",
                "name": "weight",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const initApi = async () => {
    const wsProvider = new WsProvider('ws://localhost:8000');
    const api = await ApiPromise.create({ provider: wsProvider });
    return api;
};

const SEND_AMOUNT = '100000000000';
const OTHER_PARA_ID = 2000;

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';

async function dryRunExecute(api: ApiPromise, message: string, weight: Weight): Promise<boolean> {
    try {
        console.log('  Dry run: Testing XCM execute...');

        const xcmMessage = api.createType('XcmVersionedXcm', message);

        const originLocation = {
            V5: {
                parents: 1,
                interior: {
                    X1: [
                        { AccountId32: { network: null, id: Array.from(decodeAddress(ALICE)) } }
                    ]
                }
            }
        };

        const dryRun = await api.call.dryRunApi.dryRunXcm(
            originLocation,
            xcmMessage
        );

        const result = dryRun.toJSON() as any;

        if (result.ok && result.ok.executionResult && result.ok.executionResult.ok) {
            console.log('  Dry run: XCM execute validation passed');
            return true;
        } else {
            console.log('  Dry run: XCM execute validation failed:', result);
            return false;
        }
    } catch (error) {
        console.log('  Dry run: XCM execute validation error:', (error as Error).message);
        return false;
    }
}

async function dryRunXcmSend(api: ApiPromise, destination: string, message: string): Promise<boolean> {
    try {
        console.log('  Dry run: Testing XCM send...');

        const destLocation = api.createType('XcmVersionedLocation', destination);
        const xcmMessage = api.createType('XcmVersionedXcm', message);
        const tx = api.tx.polkadotXcm.send(destLocation, xcmMessage);

        const hash = await api.rpc.chain.getFinalizedHead();
        const dryRun = (await api.rpc.system.dryRun(tx.toHex(), hash)).toPrimitive() as Primitive;

        console.log("Dry run send result:", dryRun);

        if (dryRun.ok && !dryRun.ok.err) {
            console.log('  Dry run: XCM send validation passed');
            return true;
        } else {
            console.log('  Dry run: XCM send validation failed:', dryRun);
            return false;
        }
    } catch (error) {
        console.log('  Dry run: XCM send validation error:', (error as Error).message);
        return false;
    }
}

async function generateSystemRemarkXcm(remark: string = "Hello from XCM"): Promise<string> {
    const api = await initApi();

    const remarkCall = api.tx.system.remark(remark);

    const xcmMessage = {
        V5: [
            {
                Transact: {
                    originKind: 'SovereignAccount',
                    requireWeightAtMost: {
                        refTime: 1000000000,
                        proofSize: 10000
                    },
                    call: {
                        encoded: remarkCall.method.toHex()
                    }
                }
            }
        ]
    };

    const versionedXcm = api.createType('XcmVersionedXcm', xcmMessage);
    const hex = versionedXcm.toHex();

    await api.disconnect();
    return hex;
}

async function generateExecuteNativeTransferXcm(amount: string, beneficiary: Uint8Array): Promise<string> {
    const api = await initApi();

    const instructions = [
        {
            WithdrawAsset: [
                {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                }
            ]
        },
        {
            BuyExecution: {
                fees: {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                },
                weightLimit: 'Unlimited'
            }
        },
        {
            DepositAsset: {
                assets: { Wild: { AllCounted: 1 } },
                beneficiary: {
                    parents: 1,
                    interior: {
                        X1: [
                            {
                                AccountId32: {
                                    network: null,
                                    id: Array.from(beneficiary)
                                }
                            }
                        ]
                    }
                }
            }
        }
    ];

    const versioned = api.createType('XcmVersionedXcm', { V5: instructions });
    const hex = versioned.toHex();
    await api.disconnect();
    return hex;
}

async function generateExecuteAsset1984TransferXcm(amount: string, beneficiary: Uint8Array): Promise<string> {
    const api = await initApi();

    const instructions = [
        {
            WithdrawAsset: [
                {
                    id: {
                        parents: 1,
                        interior: {
                            X2: [
                                { PalletInstance: 50 },
                                { GeneralIndex: 1984 }
                            ]
                        }
                    },
                    fun: { Fungible: BigInt(amount) }
                }
            ]
        },
        {
            BuyExecution: {
                fees: {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt('1000000000') }
                },
                weightLimit: 'Unlimited'
            }
        },
        {
            DepositAsset: {
                assets: { Wild: { AllCounted: 1 } },
                beneficiary: {
                    parents: 1,
                    interior: {
                        X1: [
                            {
                                AccountId32: {
                                    network: null,
                                    id: Array.from(beneficiary)
                                }
                            }
                        ]
                    }
                }
            }
        }
    ];

    const versioned = api.createType('XcmVersionedXcm', { V5: instructions });
    const hex = versioned.toHex();
    await api.disconnect();
    return hex;
}

async function weighMessage(message: string): Promise<Weight | Error> {
    try {
        const weight = await client.readContract({
            address: precompileAddress,
            functionName: "weighMessage",
            abi,
            args: [message],
            blockTag: 'latest'
        }) as Weight;
        return weight;
    } catch (error) {
        console.error(`Error getting weight for message: ${(error as Error).message}`);
        return new Error(`Error getting weight for message: ${(error as Error).message}`);
    }
}

async function executeXcm(message: string): Promise<string> {
    try {
        const api = await initApi();
        const weightOrError = await weighMessage(message);

        if (weightOrError instanceof Error) {
            await api.disconnect();
            throw weightOrError;
        }

        const isValid = await dryRunExecute(api, message, weightOrError);
        await api.disconnect();

        const data = encodeFunctionData({
            abi,
            functionName: "execute",
            args: [message, weightOrError]
        });

        console.log("  Weight:", weightOrError, "Message:", message);

        const txHash = await client.sendTransaction({
            to: precompileAddress,
            data,
        });

        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        console.log('  Execute TX:', txHash, 'Status:', receipt.status);
        return txHash;
    } catch (error) {
        console.error('  Execute failed:', error);
        throw error;
    }
}

async function executeXcmWithBalanceCheck(message: string, description: string): Promise<string> {
    const api = await initApi();

    console.log(`\n--- ${description} ---`);

    // Capture before balances
    const aliceBefore = await checkBalancesDetailed(api, ALICE);
    const bobBefore = await checkBalancesDetailed(api, BOB);

    // Execute XCM
    const result = await executeXcm(message);

    // Check after balances and show changes
    await compareBalances(api, ALICE, aliceBefore);
    await compareBalances(api, BOB, bobBefore);

    await api.disconnect();
    return result;
}

async function sendXcmWithBalanceCheck(destination: string, message: string, description: string): Promise<string> {
    const api = await initApi();

    console.log(`\n--- ${description} ---`);

    // Capture before balances
    const aliceBefore = await checkBalancesDetailed(api, ALICE);
    const bobBefore = await checkBalancesDetailed(api, BOB);

    // Execute XCM
    const result = await sendXcm(destination, message);

    // Check after balances and show changes
    await compareBalances(api, ALICE, aliceBefore);
    await compareBalances(api, BOB, bobBefore);

    await api.disconnect();
    return result;
}

async function sendXcm(destination: string, message: string): Promise<string> {
    try {
        const api = await initApi();
        const isValid = await dryRunXcmSend(api, destination, message);
        await api.disconnect();

        console.log("destination: ", destination, " message: ", message)
        const data = encodeFunctionData({
            abi,
            functionName: "send",
            args: [destination, message]
        });

        const txHash = await client.sendTransaction({
            to: precompileAddress,
            data,
        });

        const receipt = await client.waitForTransactionReceipt({ hash: txHash });
        console.log('  Send TX:', txHash, 'Status:', receipt.status);
        return txHash;
    } catch (error) {
        console.error('  Send failed:', error);
        throw error;
    }
}

async function buildLocalTransferMessage(api: ApiPromise, asset: any, feeAsset: any, beneficiary: Uint8Array): Promise<string> {
    const instructions = [
        {
            WithdrawAsset: [asset]
        },
        {
            BuyExecution: {
                fees: feeAsset,
                weightLimit: 'Unlimited'
            }
        },
        {
            DepositAsset: {
                assets: { Wild: { AllCounted: 1 } },
                beneficiary: {
                    parents: 1,
                    interior: {
                        X1: [
                            { AccountId32: { network: null, id: Array.from(beneficiary) } }
                        ]
                    }
                }
            }
        }
    ];

    const xcmMessage = { V5: instructions };
    const versionedXcm = api.createType('XcmVersionedXcm', xcmMessage);
    return versionedXcm.toHex();
}

async function generateLocalTransferXcm(amount: string, beneficiary: Uint8Array): Promise<string> {
    const api = await initApi();

    const instructions = [
        {
            WithdrawAsset: [
                {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                }
            ]
        },
        {
            BuyExecution: {
                fees: {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                },
                weightLimit: 'Unlimited'
            }
        },
        {
            DepositAsset: {
                assets: { Wild: { AllCounted: 1 } },
                beneficiary: {
                    parents: 1,
                    interior: {
                        X1: [
                            {
                                AccountId32: {
                                    network: null,
                                    id: Array.from(beneficiary)
                                }
                            }
                        ]
                    }
                }
            }
        }
    ];

    const versioned = api.createType('XcmVersionedXcm', { V5: instructions });
    const hex = versioned.toHex();
    console.log("heeeeex: ", hex)
    await api.disconnect();
    return hex;
}

async function generateReserveTransferXcm(
    amount: string,
    beneficiary: Uint8Array,
    senderOrigin?: Uint8Array
): Promise<string> {
    const api = await initApi();

    const instructions = [
        {
            ReserveAssetDeposited: [
                {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                }
            ]
        },
        {
            ClearOrigin: null
        },
        {
            BuyExecution: {
                fees: {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                },
                weightLimit: 'Unlimited'
            }
        },
        {
            DepositAsset: {
                assets: { Wild: { AllCounted: 1 } },
                beneficiary: {
                    parents: 1,
                    interior: {
                        X1: [
                            {
                                AccountId32: {
                                    network: null,
                                    id: Array.from(beneficiary)
                                }
                            }
                        ]
                    }
                }
            }
        }
    ];

    const versioned = api.createType('XcmVersionedXcm', { V5: instructions });
    const hex = versioned.toHex();
    console.log("Reserve transfer XCM hex:", hex);
    await api.disconnect();
    return hex;
}

async function generateWorkingRelaychainTransferXcm(amount: string, beneficiary: Uint8Array): Promise<string> {
    const api = await initApi();

    const instructions = [
        {
            WithdrawAsset: [
                {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                }
            ]
        },
        {
            BuyExecution: {
                fees: {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                },
                weightLimit: 'Unlimited'
            }
        },
        {
            DepositAsset: {
                assets: {
                    Wild: {
                        AllOf: {
                            id: { parents: 1, interior: { Here: null } },
                            fun: 'Fungible'
                        }
                    }
                },
                beneficiary: {
                    parents: 1,
                    interior: {
                        X1: [
                            {
                                AccountId32: {
                                    network: null,
                                    id: Array.from(beneficiary)
                                }
                            }
                        ]
                    }
                }
            }
        }
    ];

    const versioned = api.createType('XcmVersionedXcm', { V5: instructions });
    const hex = versioned.toHex();
    await api.disconnect();
    return hex;
}

async function generateSendNativeToSelfXcm(amount: string, beneficiary: Uint8Array): Promise<string> {
    const api = await initApi();

    const instructions = [
        {
            DescendOrigin: {
                X1: [
                    {
                        AccountId32: {
                            network: null,
                            id: Array.from(decodeAddress(ALICE))
                        }
                    }
                ]
            }
        },
        {
            WithdrawAsset: [
                {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                }
            ]
        },
        {
            BuyExecution: {
                fees: {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt(amount) }
                },
                weightLimit: 'Unlimited'
            }
        },
        {
            DepositAsset: {
                assets: { Wild: { AllCounted: 1 } },
                beneficiary: {
                    parents: 1,
                    interior: {
                        X1: [
                            {
                                AccountId32: {
                                    network: null,
                                    id: Array.from(beneficiary)
                                }
                            }
                        ]
                    }
                }
            }
        }
    ];

    const versioned = api.createType('XcmVersionedXcm', { V5: instructions });
    const hex = versioned.toHex();
    await api.disconnect();
    return hex;
}

async function generateSendAsset1984ToSelfXcm(amount: string, beneficiary: Uint8Array): Promise<string> {
    const api = await initApi();

    const instructions = [
        {
            DescendOrigin: {
                X1: [
                    {
                        AccountId32: {
                            network: null,
                            id: Array.from(decodeAddress(ALICE))
                        }
                    }
                ]
            }
        },
        {
            WithdrawAsset: [
                {
                    id: {
                        parents: 1,
                        interior: {
                            X2: [
                                { PalletInstance: 50 },
                                { GeneralIndex: 1984 }
                            ]
                        }
                    },
                    fun: { Fungible: BigInt(amount) }
                }
            ]
        },
        {
            BuyExecution: {
                fees: {
                    id: { parents: 1, interior: { Here: null } },
                    fun: { Fungible: BigInt('1000000000') }
                },
                weightLimit: 'Unlimited'
            }
        },
        {
            DepositAsset: {
                assets: { Wild: { AllCounted: 1 } },
                beneficiary: {
                    parents: 1,
                    interior: {
                        X1: [
                            {
                                AccountId32: {
                                    network: null,
                                    id: Array.from(beneficiary)
                                }
                            }
                        ]
                    }
                }
            }
        }
    ];

    const versioned = api.createType('XcmVersionedXcm', { V5: instructions });
    const hex = versioned.toHex();
    await api.disconnect();
    return hex;
}

async function buildReserveTransferMessage(api: ApiPromise, asset: any, beneficiary: Uint8Array): Promise<string> {
    const instructions = [
        {
            ReserveAssetDeposited: [asset]
        },
        {
            ClearOrigin: null
        },
        {
            BuyExecution: {
                fees: asset,
                weightLimit: 'Unlimited'
            }
        },
        {
            DepositAsset: {
                assets: { Wild: { AllCounted: 1 } },
                beneficiary: {
                    parents: 1,
                    interior: {
                        X1: [
                            { AccountId32: { network: null, id: Array.from(beneficiary) } }
                        ]
                    }
                }
            }
        }
    ];

    const xcmMessage = { V5: instructions };
    const versionedXcm = api.createType('XcmVersionedXcm', xcmMessage);
    return versionedXcm.toHex();
}

async function reserveTransferAsset(destinationObj: any, asset: any, beneficiary: Uint8Array): Promise<string> {
    const api = await initApi();
    const destType = api.createType('XcmVersionedLocation', destinationObj);
    const destHex = destType.toHex();
    const message = await buildReserveTransferMessage(api, asset, beneficiary);
    await api.disconnect();
    return sendXcm(destHex, message);
}

async function localTransfer(asset: any, feeAsset: any, beneficiary: Uint8Array): Promise<string> {
    const api = await initApi();
    const messageHex = await buildLocalTransferMessage(api, asset, feeAsset, beneficiary);
    console.log("message: ", messageHex)
    await api.disconnect();
    return executeXcm(messageHex);
}

async function scenario1(): Promise<string> {
    console.log('\nSCENARIO 1: Reserve transfer native asset to relay chain');

    const destination = {
        V5: {
            parents: 1,
            interior: 'Here'
        }
    };
    const asset = {
        id: {
            parents: 1,
            interior: {
                X2: [
                    { PalletInstance: 50 },
                    { GeneralIndex: 0 }
                ]
            }
        },
        fun: {
            Fungible: SEND_AMOUNT
        }
    };
    const beneficiary = decodeAddress(BOB);
    return reserveTransferAsset(destination, asset, beneficiary);
}

async function checkBalances(api: ApiPromise, who: string): Promise<void> {
    try {
        console.log(`  Checking Asset Hub balances for ${who}...`);

        const polkadotAddress = decodeAddress(who);

        // Native balance (Asset Hub DOT)
        const nativeBalance: any = await api.query.system.account(polkadotAddress);
        console.log(`    Native balance: ${nativeBalance?.data.free.toHuman()}`);

        // Asset 1984 balance
        if (api.query.assets) {
            try {
                const assetAccount: any = await api.query.assets.account(1984, polkadotAddress);
                const assetBalance = assetAccount?.toJSON()?.balance ?? '0';
                console.log(`    Asset 1984 balance: ${assetBalance}`);
            } catch (error) {
                console.log(`    Asset 1984 balance: 0 (not found)`);
            }
        }

        // Foreign Assets (Relay chain tokens - WND)
        if (api.query.foreignAssets) {
            try {
                // Try common foreign asset locations for relay chain
                const relayAssetLocation = {
                    parents: 1,
                    interior: { Here: null }
                };

                const foreignAssetAccount: any = await api.query.foreignAssets.account(relayAssetLocation, polkadotAddress);
                const foreignBalance = foreignAssetAccount?.toJSON()?.balance ?? '0';
                console.log(`    Relay chain tokens (WND): ${foreignBalance}`);
            } catch (error) {
                console.log(`    Relay chain tokens: 0 (not found)`);
            }
        }

        // Check if relay tokens are stored as regular assets (some Asset Hubs do this)
        if (api.query.assets) {
            try {
                // Asset ID 0 is sometimes used for relay chain tokens
                const relayAssetAccount: any = await api.query.assets.account(0, polkadotAddress);
                const relayAssetBalance = relayAssetAccount?.toJSON()?.balance ?? '0';
                if (relayAssetBalance !== '0') {
                    console.log(`    Relay tokens (Asset ID 0): ${relayAssetBalance}`);
                }
            } catch (error) {
                // Ignore if asset 0 doesn't exist
            }
        }

    } catch (error) {
        console.log('  Balance check failed:', (error as Error).message);
    }
}

async function checkBalancesDetailed(api: ApiPromise, who: string): Promise<{ [key: string]: string }> {
    const balances: { [key: string]: string } = {};

    try {
        const polkadotAddress = decodeAddress(who);

        // Native balance
        const nativeBalance: any = await api.query.system.account(polkadotAddress);
        balances.native = nativeBalance?.data.free.toString() ?? '0';

        // Asset 1984
        if (api.query.assets) {
            try {
                const assetAccount: any = await api.query.assets.account(1984, polkadotAddress);
                balances.asset1984 = assetAccount?.toJSON()?.balance ?? '0';
            } catch (error) {
                balances.asset1984 = '0';
            }
        }

        // Foreign Assets (Relay tokens)
        if (api.query.foreignAssets) {
            try {
                const relayAssetLocation = {
                    parents: 1,
                    interior: { Here: null }
                };
                const foreignAssetAccount: any = await api.query.foreignAssets.account(relayAssetLocation, polkadotAddress);
                balances.relayTokens = foreignAssetAccount?.toJSON()?.balance ?? '0';
            } catch (error) {
                balances.relayTokens = '0';
            }
        }

        // Asset ID 0 (sometimes relay tokens)
        if (api.query.assets) {
            try {
                const relayAssetAccount: any = await api.query.assets.account(0, polkadotAddress);
                balances.asset0 = relayAssetAccount?.toJSON()?.balance ?? '0';
            } catch (error) {
                balances.asset0 = '0';
            }
        }

    } catch (error) {
        console.log('Detailed balance check failed:', (error as Error).message);
    }

    return balances;
}

async function compareBalances(api: ApiPromise, who: string, beforeBalances: { [key: string]: string }): Promise<void> {
    console.log(`\n  Balance changes for ${who}:`);
    const afterBalances = await checkBalancesDetailed(api, who);

    for (const [assetType, afterBalance] of Object.entries(afterBalances)) {
        const beforeBalance = beforeBalances[assetType] || '0';
        const diff = BigInt(afterBalance) - BigInt(beforeBalance);

        if (diff !== 0n) {
            const sign = diff > 0n ? '+' : '';
            console.log(`    ${assetType}: ${beforeBalance} -> ${afterBalance} (${sign}${diff.toString()})`);
        } else {
            console.log(`    ${assetType}: ${afterBalance} (no change)`);
        }
    }
}

async function runScenarios() {
    console.log('Starting XCM precompile tests with dry run validation');
    console.log(`Alice: ${ALICE}`);
    console.log(`Bob: ${BOB}`);

    try {
        const api = await initApi();

        console.log('\n=== INITIAL BALANCES ===');
        await Promise.all([checkBalances(api, ALICE), checkBalances(api, BOB)]);
        await api.disconnect();

        console.log('\n=== RUNNING EXECUTE SCENARIOS ===');


        //	await executeXcmWithBalanceCheck(
        //		await generateSystemRemarkXcm(),
        //		"System Remark Test"
        //	);

        //	await executeXcmWithBalanceCheck(
        //		await generateExecuteNativeTransferXcm(SEND_AMOUNT, decodeAddress(BOB)),
        //		"Native Transfer Test"
        //	);

        //await executeXcmWithBalanceCheck(
        //		await generateExecuteAsset1984TransferXcm('1000000', decodeAddress(BOB)),
        //		"Asset 1984 Transfer Test"
        //	);

        //	await executeXcmWithBalanceCheck(
        //	await generateWorkingRelaychainTransferXcm('1200000000', decodeAddress(BOB)),
        //		"Relay Chain Transfer Test"
        //	);
        const nonce = await client.getTransactionCount(account)
        console.log('nonce: ',nonce)
        const hash = await client.deployContract({
            abi: ABI,
            account,
            bytecode: BYTECODE as `0x${string}`,
        })
        console.log("address: ", await client.waitForTransactionReceipt(hash as `0x${string}`))
    } catch (error) {
        console.error('Error executing scenarios:', error);
    }

    console.log('\nTests completed');
}

runScenarios()