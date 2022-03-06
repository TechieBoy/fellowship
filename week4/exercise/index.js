import { Connection, programs } from '@metaplex/js';
import { scheduleJob, RecurrenceRule, gracefulShutdown } from 'node-schedule';
import { PublicKey, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';

const updateMetadata = async (newUri) => {
  let { metadata : {Metadata, UpdateMetadata, MetadataDataData, Creator} } = programs;
  
  let conn = new Connection('devnet');
  let signer = Keypair.fromSeed([
    146, 25, 34, 44, 6, 37, 129, 40, 178, 45, 41,
    202, 128, 32, 61, 100, 47, 93, 117, 251, 68, 137,
    126, 74, 244, 64, 247, 155, 46, 74, 199, 181, 110,
    143, 239, 164, 38, 221, 234, 124, 242, 67, 73, 190,
    100, 217, 42, 162, 32, 216, 100, 50, 78, 11, 166,
    159, 99, 149, 135, 134, 62, 121, 159, 37
  ]);
  let nftMintAccount = new PublicKey("AJhsHRDLkQdAmChZuqyckzZxDUvpL71HsZLabAhQKzqS");
  
  let metadataAccount = await Metadata.getPDA(nftMintAccount);
  const curr_metadata = await Metadata.load(conn, metadataAccount);
  if (curr_metadata.data.data.creators != null) {
    const creators = curr_metadata.data.data.creators.map(
      (el) =>
          new Creator({
              ...el,
          }),
    );
    let newMetadataData = new MetadataDataData({
      name: curr_metadata.data.data.name,
      symbol: curr_metadata.data.data.symbol,
      uri: newUri,
      creators: [...creators],
      sellerFeeBasisPoints: curr_metadata.data.data.sellerFeeBasisPoints,
    })
    const updateTx = new UpdateMetadata(
      { feePayer: signer.publicKey },
      {
        metadata: metadataAccount,
        updateAuthority: signer.publicKey,
        metadataData: newMetadataData,
        newUpdateAuthority: signer.publicKey,
        primarySaleHappened: curr_metadata.data.primarySaleHappened,
      },
    );
    let result = await sendAndConfirmTransaction(conn, updateTx, [signer]);
    console.log("result =", result);
  }
}
const k = new Keypair();
console.log(k.secretKey);
// Morning is 6 am IST
const morning = new RecurrenceRule();
morning.hour = 6;

// Evening is 6pm IST
const evening = new RecurrenceRule();
evening.hour = 18;

const _morningjob = scheduleJob(morning, async function () {
  console.log('It is 6 am! changing nft uri to morning image');
  await updateMetadata("https://www.arweave.net/hFhxste9aW_TFSs3-UjKBYBMDO75bulAkxS0TdEwNf4")
});

const _eveningjob = scheduleJob(evening, async function () {
  console.log('It is 6 pm! changing nft uri to evening image');
  await updateMetadata("https://www.arweave.net/CkRraogkAxP-5Pq4h0zAzdBKAWw1eWKdfaBmVHF81HU")
});

process.on('SIGINT', function () {
  gracefulShutdown()
    .then(() => process.exit(0))
});