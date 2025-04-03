import Transport from "@ledgerhq/hw-transport";
import { StatusCodes } from "@ledgerhq/errors";
const LEDGER_CLA = 0xe0;

const DERIVATION_PREFIX = "44'/396'/";
const DERIVATION_SUFIX = "'/0'/0'";

const CHUNK_SIZE = 255;

const P_NONE = 0x00;

const P1_CONFIRM = 0x01;
const P1_NON_CONFIRM = 0x00;

const P2_SINGLE_CHUNK = 0x00;
const P2_LAST_CHUNK = 0x01;
const P2_FIRST_CHUNK = 0x02;
const P2_INTERMEDIATE_CHUNK = 0x03;

const INS = {
  GET_CONFIGURATION: 0x01,
  GET_PUBLIC_KEY: 0x02,
  SIGN_MESSAGE: 0x03,
  GET_ADDRESS: 0x04,
  SIGN_TRANSACTION: 0x05,
};

enum WalletType {
  WALLET_V3 = 0,
  EVER_WALLET = 1,
  SAFE_MULTISIG_WALLET = 2,
  SAFE_MULTISIG_WALLET_24H = 3,
  SETCODE_MULTISIG_WALLET = 4,
  BRIDGE_MULTISIG_WALLET = 5,
  SURF_WALLET = 6,
  MULTISIG_2 = 7,
  MULTISIG_2_1 = 8,
}

/**
 * Everscale API
 *
 * @param transport a transport for sending commands to a device
 * @param scrambleKey a scramble key
 *
 * @example
 * import Everscale from "@blooo/hw-app-everscale";
 * const Everscale = new Everscale(transport);
 */
export default class Everscale {
  private transport: Transport;

  constructor(
    transport: Transport,
    scrambleKey = "everscale_default_scramble_key"
  ) {
    this.transport = transport;
    this.transport.decorateAppAPIMethods(
      this,
      ["getAddress", "getPublicKey", "signMessage", "signTransaction"],
      scrambleKey
    );
  }

  /**
   * Get the application configuration from the device.
   *
   * @returns A promise that resolves to the application version as a string in the format "major.minor.patch".
   *
   * @example
   * const version = await everscale.getAppConfiguration();
   * console.log(version); // "1.1.0"
   */
  async getAppConfiguration(): Promise<string> {
    const reply = await this.sendToDevice(
      INS.GET_CONFIGURATION,
      P_NONE,
      P_NONE,
      Buffer.alloc(0)
    );
    console.log(
      "km-logs --- [Everscale.ts] -- getAppConfiguration -- reply:\n",
      reply.toString("hex")
    );
    let version = "";
    version += reply[0] + "." + reply[1] + "." + reply[2];
    return version;
  }

  /**
   * Get the Everscale address for a given account number and wallet type.
   *
   * @param accountNumber - The account number to derive the address from.
   * @param walletType - The type of wallet to use (e.g., WALLET_V3).
   * @param display - Whether to display the address on the device for confirmation (default: true).
   * @returns A promise that resolves to the Everscale address as a hexadecimal string prefixed with "0x".
   *
   * @example
   * const address = await everscale.getAddress(0, WalletType.WALLET_V3, true);
   * console.log(address); // "0x7571b498e3fed7a0fffbe21377e50548c92da4a04842e1b163547d3e8980cf64"
   */
  async getAddress(
    accountNumber: number,
    walletType: WalletType,
    display: boolean = true
  ): Promise<string> {
    const accountNumberHex = accountNumber.toString(16).padStart(8, "0");
    const walletTypeHex = walletType.toString(16).padStart(2, "0");
    const data = Buffer.from(accountNumberHex + walletTypeHex, "hex");

    console.log(" km-logs --- [Everscale.ts] -- getAddress -- data:\n", data);
    const reply = await this.sendToDevice(
      INS.GET_ADDRESS,
      display ? P1_CONFIRM : P1_NON_CONFIRM,
      P_NONE,
      data
    );
    console.log(
      "km-logs --- [Everscale.ts] -- getAddress -- reply:\n",
      reply.toString("hex")
    );
    const address = "0x" + reply.subarray(1).toString("hex");
    return address;
  }

  /**
   * Get the public key for a given account number.
   *
   * @param accountNumber - The account number to derive the public key from.
   * @param display - Whether to display the public key on the device for confirmation (default: true).
   * @returns A promise that resolves to the public key as a hexadecimal string prefixed with "0x".
   *
   * @example
   * const publicKey = await everscale.getPublicKey(0, false);
   * console.log(publicKey); // "0x3099f14eccaa0542d2d60e92eb66495f6ecf01a114e12f9db8d9cb827a87bf84"
   */
  async getPublicKey(
    accountNumber: number,
    display: boolean = true
  ): Promise<string> {
    const accountNumberHex = accountNumber.toString(16).padStart(8, "0");
    const data = Buffer.from(accountNumberHex, "hex");
    const reply = await this.sendToDevice(
      INS.GET_PUBLIC_KEY,
      display ? P1_CONFIRM : P1_NON_CONFIRM,
      P_NONE,
      data
    );
    console.log(
      "km-logs --- [Everscale.ts] -- getPublicKey -- reply:\n",
      reply.toString("hex")
    );
    const publicKey = "0x" + reply.subarray(1).toString("hex");
    return publicKey;
  }

  /**
   * Sign a message with the private key derived from the given account number.
   *
   * @param accountNumber - The account number to derive the signing key from.
   * @param messageHash - The hash of the message to sign, as a hexadecimal string with or without "0x" prefix.
   * @returns A promise that resolves to the signature as a hexadecimal string prefixed with "0x".
   *
   * @example
   * const signature = await everscale.signMessage(0, "1111111111111111111111111111111111111111111111111111111111111111");
   * console.log(signature); // "0x40d4883fb9095f3610dfc0888917c8b5548c7074f0f010966c94a5c405ccabe8d320c90334786dbf2b34f10e75c5370ae151b0b11cb190a16d7509983964d6dd00"
   */
  async signMessage(
    accountNumber: number,
    messageHash: string
  ): Promise<string> {
    const accountNumberHexBuffer = Buffer.from(
      accountNumber.toString(16).padStart(8, "0"),
      "hex"
    );
    const messageHashBuffer = messageHash.startsWith("0x")
      ? Buffer.from(messageHash.slice(2), "hex")
      : Buffer.from(messageHash, "hex");
    const data = Buffer.concat([accountNumberHexBuffer, messageHashBuffer]);
    // send the message hash to the device
    const reply = await this.sendToDevice(
      INS.SIGN_MESSAGE,
      P1_CONFIRM,
      P_NONE,
      data
    );

    return "0x" + reply.toString("hex");
  }

  /**
   * Sign a transaction with the device.
   *
   * @param inputData - The transaction data to sign, as a hexadecimal string with or without "0x" prefix.
   *                    The data is composed of:
   *                    - Account number (4 bytes): The account number to retrieve
   *                    - Wallet Type (1 byte): To derive address
   *                    - Decimals (1 byte): Token decimals
   *                    - Ticker length (1 byte): Length of the ticker string
   *                    - Ticker (variable): Token ticker
   *                    - Metadata (1 byte): Flags for optional fields
   *                    - Current wallet number (1 byte, optional): To parse transaction ABI (if metadata & 0x01)
   *                    - Workchain ID (1 byte, optional): Network workchain (if metadata & 0x02)
   *                    - Deploy contract address (32 bytes, optional): Contract address (if metadata & 0x04)
   *                    - Chain ID (4 bytes, optional): Network chain ID (if metadata & 0x08)
   *                    - Serialized transaction (variable): The transaction data
   * @returns A promise that resolves to the signature as a hexadecimal string prefixed with "0x".
   *
   * @example
   * const inputData = "0000000001090455534454000101040100C9002161B3BADB535D1B88D0E4D60D316567B1448568EFAFDF21846ECD0BA02E3ADABF97000000CA7E2C951FB3D692B2A677323640012165801BE2256B3D704F24C46AEA3298C1A5EA8F8D1AA86CCC89474BC0570265E7898AC0000000000000000036D36956F8B969D03802216B562548AD00000000000000000000000049504F808015E4256B3D704F24C46AEA3298C1A5EA8F8D1AA86CCC89474BC0570265E7898AD00328480101C03BF4894E22CDD500E450CBE5838B9938FDA1E4D3727FE3B5385C5114B0293F0001";
   * const signature = await everscale.signTransaction(inputData);
   * console.log(signature); // "0xa8b3ee327f6a64945e875d59ec49b12bea553b30170be65c541176f052156035428f8a0180e9f8802622b4f3339f2161076790b822e55c0d46f01b919f6de005"
   */
  async signTransaction(inputData: string): Promise<string> {
    const inputDataBuffer = inputData.startsWith("0x")
      ? Buffer.from(inputData.slice(2), "hex")
      : Buffer.from(inputData, "hex");

    let chunks: Buffer[] = [];
    for (let i = 0; i < inputDataBuffer.length; i += CHUNK_SIZE) {
      chunks.push(inputDataBuffer.subarray(i, i + CHUNK_SIZE));
    }

    console.log(
      "km-logs --- [Everscale.ts] -- signTransaction -- chunks:\n",
      chunks
    );

    let reply;
    if (chunks.length === 1) {
      reply = await this.sendToDevice(
        INS.SIGN_TRANSACTION,
        P1_CONFIRM,
        P2_SINGLE_CHUNK,
        chunks[0]
      );
    } else {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        let p2 = P2_INTERMEDIATE_CHUNK;
        if (i === chunks.length - 1) {
          p2 = P2_LAST_CHUNK;
        } else if (i === 0) {
          p2 = P2_FIRST_CHUNK;
        }
        reply = await this.sendToDevice(
          INS.SIGN_TRANSACTION,
          P1_CONFIRM,
          p2,
          chunk
        );
      }
    }
    reply = reply.subarray(1);
    return "0x" + reply.toString("hex");
  }

  /**
   * Sends a command to the device.
   *
   * @param instruction - The instruction code.
   * @param p1 - The first parameter.
   * @param p2 - The second parameter.
   * @param payload - The payload to send.
   * @returns A promise that resolves to the device's response.
   */
  private async sendToDevice(
    instruction: number,
    p1: number,
    p2: number = 0x00,
    payload: Buffer
  ) {
    const acceptStatusList = [StatusCodes.OK];
    const reply = await this.transport.send(
      LEDGER_CLA,
      instruction,
      p1,
      p2,
      payload,
      acceptStatusList
    );

    this.throwOnFailure(reply);

    return reply.subarray(0, reply.length - 2);
  }

  /**
   * Throws an error if the device response indicates a failure.
   *
   * @param reply - The device's response.
   */
  private throwOnFailure(reply: Buffer) {
    // transport makes sure reply has a valid length
    const status = reply.readUInt16BE(reply.length - 2);

    switch (status) {
      default:
        return;
    }
  }
}

// /**
//  * Get Everscale address (public key) for a BIP32 path.
//  *
//  * @param path - A BIP32 path.
//  * @param display - Flag to show display.
//  * @param signedKey - Flag to sign key.
//  * @returns A promise that resolves to an object with the public key and optionally the signed public key.
//  *
//  * @example
//  * everscale.getPublicKey("1105'/0'/0'/0/0/0/0/", true, false)
//  */
// async getPublicKey(
//   accountNumber: number,
//   display?: boolean,
// ): Promise<{ publicKey: string;}> {
//   const pathBuffer = pathToBuffer(path);

//   const publicKeyBuffer = await this.sendToDevice(
//     INS.GET_PUBLIC_KEY,
//     display ? P1_NON_CONFIRM : P1_CONFIRM,
//     signedKey ? P2_SIGNED_KEY : NONE,
//     pathBuffer
//   );

//   const publicKeyLength: number = publicKeyBuffer[0];

//   if (signedKey) {
//     return {
//       publicKey: publicKeyBuffer
//         .subarray(1, 1 + publicKeyLength)
//         .toString("hex"),
//       signedPublicKey: publicKeyBuffer
//         .subarray(1 + publicKeyLength)
//         .toString("hex"),
//     };
//   }

//   return {
//     publicKey: publicKeyBuffer
//       .subarray(1, 1 + publicKeyLength)
//       .toString("hex"),
//   };
// }

// /**
//  * Export a private key.
//  *
//  * @param data - The data required for exporting the private key.
//  * @param exportType - The type of export, either PRF_KEY_SEED or PRF_KEY.
//  * @param mode - The mode, either DISPLAY, NO_DISPLAY, or EXPORT_CRED_ID.
//  * @param isLegacy - Flag to indicate if the legacy mode is used.
//  * @returns A promise that resolves to an object with the private key and optionally the credential ID.
//  */
// async exportPrivateKey(
//   data: IExportPrivateKeyData,
//   exportType: ExportType,
//   mode: Mode,
//   isLegacy: boolean
// ): Promise<{ privateKey: string; credentialId?: string }> {
//   let payload = Buffer.alloc(0);
//   const isLegacyEncoded = isLegacy ? encodeInt8(0) : encodeInt8(1);
//   const identityEncoded = encodeInt32(data.identity);
//   payload = Buffer.concat([payload, isLegacyEncoded, identityEncoded]);

//   if (!isLegacy) {
//     const identityProviderEncoded = encodeInt32(data.identityProvider);
//     payload = Buffer.concat([payload, identityProviderEncoded]);
//   }

//   const exportedPrivateKey = await this.sendToDevice(
//     INS.EXPORT_PRIVATE_KEY,
//     mode,
//     exportType,
//     payload
//   );

//   if (mode === Mode.EXPORT_CRED_ID) {
//     return {
//       privateKey: exportedPrivateKey
//         .subarray(0, PRIVATE_KEY_LENGTH)
//         .toString("hex"),
//       credentialId: exportedPrivateKey
//         .subarray(PRIVATE_KEY_LENGTH)
//         .toString("hex"),
//     };
//   }

//   return {
//     privateKey: exportedPrivateKey.toString("hex"),
//   };
// }

// /**
//  * Signs a Concordium transaction using the specified account index.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  * @throws Error if the user declines the transaction.
//  *
//  * @example
//  * concordium.signTransfer(txn).then(r => r.signature)
//  */
// async signTransfer(
//   txn: ISimpleTransferTransaction,
//   path: string
// ): Promise<{ signature: string }> {
//   const { payloads } = serializeSimpleTransfer(txn, path);

//   let response;

//   for (let i = 0; i < payloads.length; i++) {
//     const lastChunk = i === payloads.length - 1;
//     response = await this.sendToDevice(
//       INS.SIGN_TRANSFER,
//       P1_FIRST_CHUNK + i,
//       lastChunk ? P2_LAST : P2_MORE,
//       payloads[i]
//     );
//   }

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs a simple transfer with a memo.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signTransferWithMemo(
//   txn: ISimpleTransferWithMemoTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const { payloadHeaderAddressMemoLength, payloadsMemo, payloadsAmount } =
//     serializeSimpleTransferWithMemo(txn, path);

//   let response;
//   await this.sendToDevice(
//     INS.SIGN_TRANSFER_MEMO,
//     P1_INITIAL_WITH_MEMO,
//     NONE,
//     payloadHeaderAddressMemoLength[0]
//   );
//   await this.sendToDevice(
//     INS.SIGN_TRANSFER_MEMO,
//     P1_MEMO,
//     NONE,
//     payloadsMemo[0]
//   );
//   response = await this.sendToDevice(
//     INS.SIGN_TRANSFER_MEMO,
//     P1_AMOUNT,
//     NONE,
//     payloadsAmount[0]
//   );

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs a transfer with a schedule.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signTransferWithSchedule(
//   txn: ISimpleTransferWithScheduleTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const { payloadHeaderAddressScheduleLength, payloadsSchedule } =
//     serializeTransferWithSchedule(txn, path);

//   let response;

//   await this.sendToDevice(
//     INS.SIGN_TRANSFER_SCHEDULE,
//     P1_INITIAL_PACKET,
//     NONE,
//     payloadHeaderAddressScheduleLength[0]
//   );

//   for (const schedule of payloadsSchedule) {
//     response = await this.sendToDevice(
//       INS.SIGN_TRANSFER_SCHEDULE,
//       P1_SCHEDULED_TRANSFER_PAIRS,
//       NONE,
//       schedule
//     );
//   }

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs a transfer with a schedule and a memo.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signTransferWithScheduleAndMemo(
//   txn: ISimpleTransferWithScheduleAndMemoTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const {
//     payloadHeaderAddressScheduleLengthAndMemoLength,
//     payloadMemo,
//     payloadsSchedule,
//   } = serializeTransferWithScheduleAndMemo(txn, path);

//   let response;
//   await this.sendToDevice(
//     INS.SIGN_TRANSFER_SCHEDULE_AND_MEMO,
//     P1_INITIAL_WITH_MEMO_SCHEDULE,
//     NONE,
//     payloadHeaderAddressScheduleLengthAndMemoLength[0]
//   );
//   await this.sendToDevice(
//     INS.SIGN_TRANSFER_SCHEDULE_AND_MEMO,
//     P1_MEMO_SCHEDULE,
//     NONE,
//     payloadMemo[0]
//   );

//   for (const schedule of payloadsSchedule) {
//     response = await this.sendToDevice(
//       INS.SIGN_TRANSFER_SCHEDULE_AND_MEMO,
//       P1_SCHEDULED_TRANSFER_PAIRS,
//       NONE,
//       schedule
//     );
//   }

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs a configure delegation transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signConfigureDelegation(
//   txn: IConfigureDelegationTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const { payloads } = serializeConfigureDelegation(txn, path);

//   let response;

//   for (let i = 0; i < payloads.length; i++) {
//     const lastChunk = i === payloads.length - 1;
//     response = await this.sendToDevice(
//       INS.SIGN_CONFIGURE_DELEGATION,
//       P1_FIRST_CHUNK + i,
//       lastChunk ? P2_LAST : P2_MORE,
//       payloads[i]
//     );
//   }

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs a configure baker transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signConfigureBaker(
//   txn: IConfigureBakerTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const {
//     payloadHeaderKindAndBitmap,
//     payloadFirstBatch,
//     payloadAggregationKeys,
//     payloadUrlLength,
//     payloadURL,
//     payloadCommissionFee,
//     payloadSuspended,
//   } = serializeConfigureBaker(txn, path);

//   let response;

//   await this.sendToDevice(
//     INS.SIGN_CONFIGURE_BAKER,
//     P1_INITIAL_PACKET,
//     NONE,
//     payloadHeaderKindAndBitmap
//   );
//   await this.sendToDevice(
//     INS.SIGN_CONFIGURE_BAKER,
//     P1_FIRST_BATCH,
//     NONE,
//     payloadFirstBatch
//   );
//   await this.sendToDevice(
//     INS.SIGN_CONFIGURE_BAKER,
//     P1_AGGREGATION_KEY,
//     NONE,
//     payloadAggregationKeys
//   );
//   await this.sendToDevice(
//     INS.SIGN_CONFIGURE_BAKER,
//     P1_URL_LENGTH,
//     NONE,
//     payloadUrlLength
//   );
//   await this.sendToDevice(INS.SIGN_CONFIGURE_BAKER, P1_URL, NONE, payloadURL);
//   await this.sendToDevice(
//     INS.SIGN_CONFIGURE_BAKER,
//     P1_COMMISSION_FEE,
//     NONE,
//     payloadCommissionFee
//   );
//   response = await this.sendToDevice(
//     INS.SIGN_CONFIGURE_BAKER,
//     P1_SUSPENDED,
//     NONE,
//     payloadSuspended
//   );

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs a register data transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signRegisterData(
//   txn: IRegisterDataTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const { payloadHeader, payloadsData } = serializeRegisterData(txn, path);

//   let response;
//   await this.sendToDevice(
//     INS.SIGN_REGISTER_DATA,
//     P1_INITIAL_PACKET,
//     NONE,
//     payloadHeader[0]
//   );

//   for (const data of payloadsData) {
//     response = await this.sendToDevice(
//       INS.SIGN_REGISTER_DATA,
//       P1_DATA,
//       NONE,
//       data
//     );
//   }

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs a transfer to public transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signTransferToPublic(
//   txn: ITransferToPublicTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const { payloadHeader, payloadsAmountAndProofsLength, payloadsProofs } =
//     serializeTransferToPublic(txn, path);

//   let response;

//   await this.sendToDevice(
//     INS.SIGN_TRANSFER_TO_PUBLIC,
//     P1_INITIAL_PACKET,
//     NONE,
//     payloadHeader[0]
//   );

//   await this.sendToDevice(
//     INS.SIGN_TRANSFER_TO_PUBLIC,
//     P1_REMAINING_AMOUNT,
//     NONE,
//     payloadsAmountAndProofsLength[0]
//   );

//   for (const proof of payloadsProofs) {
//     response = await this.sendToDevice(
//       INS.SIGN_TRANSFER_TO_PUBLIC,
//       P1_PROOF,
//       NONE,
//       proof
//     );
//   }

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs a deploy module transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signDeployModule(
//   txn: IDeployModuleTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const { payloadsHeaderAndVersion, payloadSource } = serializeDeployModule(
//     txn,
//     path
//   );

//   let response;
//   await this.sendToDevice(
//     INS.SIGN_DEPLOY_MODULE,
//     P1_INITIAL_PACKET,
//     P2_LAST,
//     payloadsHeaderAndVersion[0]
//   );

//   response = await this.sendToDevice(
//     INS.SIGN_DEPLOY_MODULE,
//     P1_SOURCE,
//     P2_LAST,
//     payloadSource
//   );

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs an init contract transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signInitContract(
//   txn: IInitContractTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const { payloadsHeaderAndData, payloadsName, payloadsParam } =
//     serializeInitContract(txn, path);

//   let response;
//   await this.sendToDevice(
//     INS.SIGN_INIT_CONTRACT,
//     P1_INITIAL_PACKET,
//     NONE,
//     payloadsHeaderAndData[0]
//   );

//   for (const nameChunk of payloadsName) {
//     await this.sendToDevice(INS.SIGN_INIT_CONTRACT, P1_NAME, NONE, nameChunk);
//   }

//   for (const paramChunk of payloadsParam) {
//     response = await this.sendToDevice(
//       INS.SIGN_INIT_CONTRACT,
//       P1_PARAM,
//       NONE,
//       paramChunk
//     );
//   }

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs an update contract transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signUpdateContract(
//   txn: IUpdateContractTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const { payloadsHeaderAndData, payloadsName, payloadsParam } =
//     serializeUpdateContract(txn, path);

//   let response;
//   await this.sendToDevice(
//     INS.SIGN_UPDATE_CONTRACT,
//     P1_INITIAL_PACKET,
//     NONE,
//     payloadsHeaderAndData[0]
//   );

//   for (const nameChunk of payloadsName) {
//     await this.sendToDevice(
//       INS.SIGN_UPDATE_CONTRACT,
//       P1_NAME,
//       NONE,
//       nameChunk
//     );
//   }

//   for (const paramChunk of payloadsParam) {
//     response = await this.sendToDevice(
//       INS.SIGN_UPDATE_CONTRACT,
//       P1_PARAM,
//       NONE,
//       paramChunk
//     );
//   }

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs public info for IP transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signPublicInfoForIp(
//   txn: IPublicInfoForIpTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const {
//     payloadIdCredPubAndRegIdAndKeysLenght,
//     payloadKeys,
//     payloadThreshold,
//   } = serializePublicInfoForIp(txn, path);

//   let response;

//   await this.sendToDevice(
//     INS.SIGN_PUBLIC_INFO_FOR_IP,
//     P1_INITIAL_PACKET,
//     NONE,
//     payloadIdCredPubAndRegIdAndKeysLenght
//   );

//   for (const key of payloadKeys) {
//     await this.sendToDevice(
//       INS.SIGN_PUBLIC_INFO_FOR_IP,
//       P1_VERIFICATION_KEY,
//       NONE,
//       key
//     );
//   }

//   response = await this.sendToDevice(
//     INS.SIGN_PUBLIC_INFO_FOR_IP,
//     P1_SIGNATURE_THRESHOLD,
//     NONE,
//     payloadThreshold
//   );

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs a credential deployment transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param isNew - Flag indicating if it's a new credential.
//  * @param addressOrExpiry - The address or expiry date.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signCredentialDeployment(
//   txn: ICredentialDeploymentTransaction,
//   isNew: boolean,
//   addressOrExpiry: string | BigInt,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const {
//     payloadDerivationPath,
//     numberOfVerificationKeys,
//     keyIndexAndSchemeAndVerificationKey,
//     thresholdAndRegIdAndIPIdentity,
//     encIdCredPubShareAndKey,
//     validToAndCreatedAtAndAttributesLength,
//     tag,
//     valueLength,
//     value,
//     proofLength,
//     proofs,
//   } = serializeCredentialDeployment(txn, path);

//   let response;
//   await this.sendToDevice(
//     INS.SIGN_CREDENTIAL_DEPLOYMENT,
//     P1_INITIAL_PACKET,
//     NONE,
//     payloadDerivationPath
//   );

//   await this.sendToDevice(
//     INS.SIGN_CREDENTIAL_DEPLOYMENT,
//     P1_VERIFICATION_KEY_LENGTH,
//     NONE,
//     numberOfVerificationKeys
//   );
//   await this.sendToDevice(
//     INS.SIGN_CREDENTIAL_DEPLOYMENT,
//     P1_VERIFICATION_KEY,
//     NONE,
//     keyIndexAndSchemeAndVerificationKey
//   );
//   await this.sendToDevice(
//     INS.SIGN_CREDENTIAL_DEPLOYMENT,
//     P1_SIGNATURE_THRESHOLD,
//     NONE,
//     thresholdAndRegIdAndIPIdentity
//   );
//   await this.sendToDevice(
//     INS.SIGN_CREDENTIAL_DEPLOYMENT,
//     P1_AR_IDENTITY,
//     NONE,
//     encIdCredPubShareAndKey
//   );
//   await this.sendToDevice(
//     INS.SIGN_CREDENTIAL_DEPLOYMENT,
//     P1_CREDENTIAL_DATES,
//     NONE,
//     validToAndCreatedAtAndAttributesLength
//   );
//   for (
//     let i = 0;
//     i < Object.keys(txn.policy.revealedAttributes).length;
//     i++
//   ) {
//     const tagAndValueLength = Buffer.concat([tag[i], valueLength[i]]);
//     await this.sendToDevice(
//       INS.SIGN_CREDENTIAL_DEPLOYMENT,
//       P1_ATTRIBUTE_TAG,
//       NONE,
//       tagAndValueLength
//     );
//     await this.sendToDevice(
//       INS.SIGN_CREDENTIAL_DEPLOYMENT,
//       P1_ATTRIBUTE_VALUE,
//       NONE,
//       value[i]
//     );
//   }
//   await this.sendToDevice(
//     INS.SIGN_CREDENTIAL_DEPLOYMENT,
//     P1_LENGTH_OF_PROOFS,
//     NONE,
//     proofLength
//   );

//   const proofPayload = serializeTransactionPayloads(proofs);
//   for (const proof of proofPayload) {
//     await this.sendToDevice(
//       INS.SIGN_CREDENTIAL_DEPLOYMENT,
//       P1_PROOFS,
//       NONE,
//       proof
//     );
//   }

//   if (isNew) {
//     const isNew = encodeInt8(0);
//     const serializeExpiry = encodeWord64(addressOrExpiry as BigInt);
//     const expiry = Buffer.concat([isNew, serializeExpiry]);
//     response = await this.sendToDevice(
//       INS.SIGN_CREDENTIAL_DEPLOYMENT,
//       P1_NEW_OR_EXISTING,
//       NONE,
//       expiry
//     );
//   } else {
//     const isNew = encodeInt8(1);
//     const address = Buffer.concat([
//       isNew,
//       Buffer.from(addressOrExpiry as string, "hex"),
//     ]);
//     response = await this.sendToDevice(
//       INS.SIGN_CREDENTIAL_DEPLOYMENT,
//       P1_NEW_OR_EXISTING,
//       NONE,
//       address
//     );
//   }

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }

// /**
//  * Signs an update credentials transaction.
//  *
//  * @param txn - The transaction to sign.
//  * @param path - The derivation path to use for signing.
//  * @returns A promise that resolves to an object containing the signature.
//  */
// async signUpdateCredentials(
//   txn: IUpdateCredentialsTransaction,
//   path: string
// ): Promise<{ signature: string[] }> {
//   const {
//     payloadHeaderKindAndIndexLength,
//     credentialIndex,
//     numberOfVerificationKeys,
//     keyIndexAndSchemeAndVerificationKey,
//     thresholdAndRegIdAndIPIdentity,
//     encIdCredPubShareAndKey,
//     validToAndCreatedAtAndAttributesLength,
//     tag,
//     valueLength,
//     value,
//     proofLength,
//     proofs,
//     credentialIdCount,
//     credentialIds,
//     threshold,
//   } = serializeUpdateCredentials(txn, path);

//   let response;
//   await this.sendToDevice(
//     INS.SIGN_UPDATE_CREDENTIALS,
//     NONE,
//     P2_CREDENTIAL_INITIAL,
//     payloadHeaderKindAndIndexLength[0]
//   );

//   for (let i = 0; i < txn.payload.newCredentials.length; i++) {
//     await this.sendToDevice(
//       INS.SIGN_UPDATE_CREDENTIALS,
//       NONE,
//       P2_CREDENTIAL_CREDENTIAL_INDEX,
//       credentialIndex[i]
//     );
//     await this.sendToDevice(
//       INS.SIGN_UPDATE_CREDENTIALS,
//       P1_VERIFICATION_KEY_LENGTH,
//       P2_CREDENTIAL_CREDENTIAL,
//       numberOfVerificationKeys[i]
//     );
//     await this.sendToDevice(
//       INS.SIGN_UPDATE_CREDENTIALS,
//       P1_VERIFICATION_KEY,
//       P2_CREDENTIAL_CREDENTIAL,
//       keyIndexAndSchemeAndVerificationKey[i]
//     );
//     await this.sendToDevice(
//       INS.SIGN_UPDATE_CREDENTIALS,
//       P1_SIGNATURE_THRESHOLD,
//       P2_CREDENTIAL_CREDENTIAL,
//       thresholdAndRegIdAndIPIdentity[i]
//     );
//     await this.sendToDevice(
//       INS.SIGN_UPDATE_CREDENTIALS,
//       P1_AR_IDENTITY,
//       P2_CREDENTIAL_CREDENTIAL,
//       encIdCredPubShareAndKey[i]
//     );
//     await this.sendToDevice(
//       INS.SIGN_UPDATE_CREDENTIALS,
//       P1_CREDENTIAL_DATES,
//       P2_CREDENTIAL_CREDENTIAL,
//       validToAndCreatedAtAndAttributesLength[i]
//     );
//     for (
//       let j = 0;
//       j <
//       Object.keys(txn.payload.newCredentials[i].cdi.policy.revealedAttributes)
//         .length;
//       j++
//     ) {
//       const tagAndValueLength = Buffer.concat([tag[i][j], valueLength[i][j]]);
//       await this.sendToDevice(
//         INS.SIGN_UPDATE_CREDENTIALS,
//         P1_ATTRIBUTE_TAG,
//         P2_CREDENTIAL_CREDENTIAL,
//         tagAndValueLength
//       );
//       await this.sendToDevice(
//         INS.SIGN_UPDATE_CREDENTIALS,
//         P1_ATTRIBUTE_VALUE,
//         P2_CREDENTIAL_CREDENTIAL,
//         value[i][j]
//       );
//     }
//     await this.sendToDevice(
//       INS.SIGN_UPDATE_CREDENTIALS,
//       P1_LENGTH_OF_PROOFS,
//       P2_CREDENTIAL_CREDENTIAL,
//       proofLength[i]
//     );

//     const proofPayload = serializeTransactionPayloads(proofs[i]);
//     for (const proof of proofPayload) {
//       await this.sendToDevice(
//         INS.SIGN_UPDATE_CREDENTIALS,
//         P1_PROOFS,
//         P2_CREDENTIAL_CREDENTIAL,
//         proof
//       );
//     }
//   }

//   await this.sendToDevice(
//     INS.SIGN_UPDATE_CREDENTIALS,
//     NONE,
//     P2_CREDENTIAL_ID_COUNT,
//     credentialIdCount
//   );
//   for (let i = 0; i < txn.payload.removeCredentialIds.length; i++) {
//     await this.sendToDevice(
//       INS.SIGN_UPDATE_CREDENTIALS,
//       NONE,
//       P2_CREDENTIAL_ID,
//       credentialIds[i]
//     );
//   }
//   response = await this.sendToDevice(
//     INS.SIGN_UPDATE_CREDENTIALS,
//     NONE,
//     P2_THRESHOLD,
//     threshold
//   );

//   if (response.length === 1) throw new Error("User has declined.");

//   return {
//     signature: response.toString("hex"),
//   };
// }
