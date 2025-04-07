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

export enum WalletType {
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
