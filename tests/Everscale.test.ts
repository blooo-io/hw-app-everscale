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
  const result = await everscale.getAddress(0, WalletType.WALLET_V3, false);
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
  const result = await everscale.getPublicKey(0, false);
  expect(result).toEqual(
    "0x3099f14eccaa0542d2d60e92eb66495f6ecf01a114e12f9db8d9cb827a87bf84"
  );
});

test("signMessage", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
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
    "0x40d4883fb9095f3610dfc0888917c8b5548c7074f0f010966c94a5c405ccabe8d320c90334786dbf2b34f10e75c5370ae151b0b11cb190a16d7509983964d6dd00"
  );
});

test("signTransaction", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
            => e0050100dc0000000001090455534454000101040100c9002161b3badb535d1b88d0e4d60d316567b1448568efafdf21846ecd0ba02e3adabf97000000ca7e2c951fb3d692b2a677323640012165801be2256b3d704f24c46aea3298c1a5ea8f8d1aa86ccc89474bc0570265e7898ac0000000000000000036d36956f8b969d03802216b562548ad00000000000000000000000049504f808015e4256b3d704f24c46aea3298c1a5ea8f8d1aa86ccc89474bc0570265e7898ad00328480101c03bf4894e22cdd500e450cbe5838b9938fda1e4d3727fe3b5385c5114b0293f0001
            <= 40a8b3ee327f6a64945e875d59ec49b12bea553b30170be65c541176f052156035428f8a0180e9f8802622b4f3339f2161076790b822e55c0d46f01b919f6de0059000
        `)
  );
  const everscale = new Everscale(transport);
  const inputData =
    "0000000001090455534454000101040100C9002161B3BADB535D1B88D0E4D60D316567B1448568EFAFDF21846ECD0BA02E3ADABF97000000CA7E2C951FB3D692B2A677323640012165801BE2256B3D704F24C46AEA3298C1A5EA8F8D1AA86CCC89474BC0570265E7898AC0000000000000000036D36956F8B969D03802216B562548AD00000000000000000000000049504F808015E4256B3D704F24C46AEA3298C1A5EA8F8D1AA86CCC89474BC0570265E7898AD00328480101C03BF4894E22CDD500E450CBE5838B9938FDA1E4D3727FE3B5385C5114B0293F0001";
  const result = await everscale.signTransaction(inputData);
  expect(result).toEqual(
    "0xa8b3ee327f6a64945e875d59ec49b12bea553b30170be65c541176f052156035428f8a0180e9f8802622b4f3339f2161076790b822e55c0d46f01b919f6de005"
  );
});
