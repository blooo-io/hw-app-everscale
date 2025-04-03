import {
  openTransportReplayer,
  RecordStore,
} from "@ledgerhq/hw-transport-mocker";
import Everscale from "../src/Everscale";
import { WalletType } from "../src/type";
import { listen } from "@ledgerhq/logs";
listen((log) => console.log(log));

// // Address used for testing (default speculos address, pub & priv key)
// const test_sender_address = "0x6E93a3ACfbaDF457F29fb0E57FA42274004c32EA";
// const test_sender_publicKey =
//   "0x31553d8c312ef1668adcf75f179a59accb85ffad9ea2a8ecf91049d9cdafc4706f3eb10091a459826803d353b3e3a98af0e999cd44353879930d8baf0779fde7";
// const test_sender_privateKey =
//   "0xba988b41f30ab65c5b8df817aa27468292d089db601892b01bccf0028d0d95bb";
// const test_receiver_address = "0x0EE56B604c869E3792c99E35C1C424f88F87dC8a";

test("getAppConfiguration", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
            => e001000000
            <= 0101009000
        `)
  );
  const everscale = new Everscale(transport);
  const result = await everscale.getAppConfiguration();
  expect(result).toEqual("1.1.0");
});

test("getAddress", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
            => e0040000050000000000
            <= 207571b498e3fed7a0fffbe21377e50548c92da4a04842e1b163547d3e8980cf649000
        `)
  );
  const everscale = new Everscale(transport);
  const result = await everscale.getAddress(0, WalletType.WALLET_V3);
  expect(result).toEqual(
    "0x7571b498e3fed7a0fffbe21377e50548c92da4a04842e1b163547d3e8980cf64"
  );
});

test("getPublicKey", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
            => e00200000400000000
            <= 203099f14eccaa0542d2d60e92eb66495f6ecf01a114e12f9db8d9cb827a87bf849000
        `)
  );
  const everscale = new Everscale(transport);
  const result = await everscale.getPublicKey(0);
  expect(result).toEqual(
    "0x3099f14eccaa0542d2d60e92eb66495f6ecf01a114e12f9db8d9cb827a87bf84"
  );
});

// TODO: implement this
test("signMessage", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
            => e00200000400000000
            <= 203099f14eccaa0542d2d60e92eb66495f6ecf01a114e12f9db8d9cb827a87bf849000
            => e003010024000000001111111111111111111111111111111111111111111111111111111111111111
            <= 40d4883fb9095f3610dfc0888917c8b5548c7074f0f010966c94a5c405ccabe8d320c90334786dbf2b34f10e75c5370ae151b0b11cb190a16d7509983964d6dd009000
        `)
  );
  const everscale = new Everscale(transport);
  const result = await everscale.signMessage(
    0,
    "1111111111111111111111111111111111111111111111111111111111111111"
  );
  expect(result).toEqual(
    "0x40d4883fb9095f3610dfc0888917c8b5548c7074f0f010966c94a5c405ccabe8d320c90334786dbf2b34f10e75c5370ae151b0b11cb190a16d7509983964d6dd0"
  );
});

// // TODO: implement this
// test("signTransaction", async () => {
//   const transport = await openTransportReplayer(
//     RecordStore.fromString(`
//             => e00501007f00000000010904455645520001010301006c000161b3badb535d1b88d0e4d60d316567b1448568efafdf21846ecd0ba02e3adabf97000000ca7cfb9642b3d6449ea677323640010165801be2256b3d704f24c46aea3298c1a5ea8f8d1aa86ccc89474bc0570265e7898ac0000000000000000036d36956f8b969d038020000
//             <= 40a0396cd952160f068e0a7d6279ba2b61a2215a4dd997fcc1fe8905722341a20a86424dfdb2598b86855e73e47a1804023ff3f9afffd91825df0f58825dabd8089000
//         `)
//   );
//   const everscale = new Everscale(transport);
//   const txHex =
//     "00000000010904455645520001010301006c000161b3badb535d1b88d0e4d60d316567b1448568efafdf21846ecd0ba02e3adabf97000000ca7cfb9642b3d6449ea677323640010165801be2256b3d704f24c46aea3298c1a5ea8f8d1aa86ccc89474bc0570265e7898ac0000000000000000036d36956f8b969d038020000";
//   const result = await everscale.signTransaction(DERIVATION, txHex);
//   expect(result).toEqual(
//     "40a0396cd952160f068e0a7d6279ba2b61a2215a4dd997fcc1fe8905722341a20a86424dfdb2598b86855e73e47a1804023ff3f9afffd91825df0f58825dabd80"
//   );
// });
