import {
  passetHub,
  XcmV3MultiassetFungibility,
  XcmV5AssetFilter,
  XcmV5Instruction,
  XcmV5Junction,
  XcmV5Junctions,
  XcmV5WildAsset,
  XcmVersionedXcm,
} from "@polkadot-api/descriptors";
import { Binary, Enum, FixedSizeBinary, getTypedCodecs } from "polkadot-api";

export async function generateXcmMessage(
  address: string,
  paraId: number,
  amount: bigint,
): Promise<string> {
  const xcm = XcmVersionedXcm.V5([
    XcmV5Instruction.WithdrawAsset([
      {
        id: { parents: 1, interior: XcmV5Junctions.Here() },
        fun: XcmV3MultiassetFungibility.Fungible(amount),
      },
    ]),
    XcmV5Instruction.PayFees({
      asset: {
        id: { parents: 1, interior: XcmV5Junctions.Here() },
        fun: XcmV3MultiassetFungibility.Fungible(amount / 10n),
      },
    }),
    XcmV5Instruction.InitiateTransfer({
      destination: {
        parents: 1,
        interior: XcmV5Junctions.X1(XcmV5Junction.Parachain(paraId)),
      },
      remote_fees: Enum(
        "Teleport",
        XcmV5AssetFilter.Definite([
          {
            id: { parents: 1, interior: XcmV5Junctions.Here() },
            fun: XcmV3MultiassetFungibility.Fungible(amount / 10n),
          },
        ]),
      ),
      preserve_origin: false,
      remote_xcm: [
        XcmV5Instruction.DepositAsset({
          assets: XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1)),
          beneficiary: {
            parents: 0,
            interior: XcmV5Junctions.X1(
              XcmV5Junction.AccountId32({
                network: undefined,
                id: FixedSizeBinary.fromAccountId32(address),
              }),
            ),
          },
        }),
      ],
      assets: [
        Enum("Teleport", XcmV5AssetFilter.Wild(XcmV5WildAsset.AllCounted(1))),
      ],
    }),
  ]);

  const codecs = await getTypedCodecs(passetHub);
  const xcmEncoded = codecs.apis.XcmPaymentApi.query_xcm_weight.args.enc([xcm]);
  const xcmHex = Binary.fromBytes(xcmEncoded).asHex();
  return xcmHex;
}
