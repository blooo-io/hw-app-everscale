import Transport from "@ledgerhq/hw-transport";
import { StatusCodes } from "@ledgerhq/errors";

const LEDGER_CLA = 0xe0;

const INS = {
  GET_CONFIGURATION: 0x01,
  GET_PUBLIC_KEY: 0x02,
  SIGN_MESSAGE: 0x03,
  GET_ADDRESS: 0x04,
  SIGN_TRANSACTION: 0x05,
};

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
  // TODO: implement this
  getAddress() {}
  // TODO: implement this
  getPublicKey() {}
  // TODO: implement this
  signMessage() {}
  // TODO: implement this
  signTransaction() {}

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
