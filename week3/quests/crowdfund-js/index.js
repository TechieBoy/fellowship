const {
  Connection,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  PublicKey,
  SystemProgram,
  Keypair,
} = require('@solana/web3.js');
const fs   = require('mz/fs');

async function establishConnection() {
  const rpcUrl = 'http://127.0.0.1:8899';
  connection = new Connection(rpcUrl, 'confirmed');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', rpcUrl, version);
}

async function createKeypairFromFile() {
  const secretKeyString = await fs.readFile("/home/teknas/.config/solana/id.json", {encoding: 'utf8'});
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
}

async function createAccount() {
  const rpcUrl = 'http://127.0.0.1:8899';
  connection = new Connection(rpcUrl, 'confirmed');
  const signer = await createKeypairFromFile();
  const newAccountPubkey = await PublicKey.createWithSeed(
    signer.publicKey,
    "campaign1",
    new PublicKey("3VCfbNNFGFKaYKKehde2HrK2ihzY3CYiYf2X4WoZdxXU"),
  );
  const lamports = await connection.getMinimumBalanceForRentExemption(
    1024,
  );
  const instruction = SystemProgram.createAccountWithSeed({
    fromPubkey: signer.publicKey,
    basePubkey: signer.publicKey,
    seed: "campaign1",
    newAccountPubkey,
    lamports,
    space: 1024,
    programId : new PublicKey("3VCfbNNFGFKaYKKehde2HrK2ihzY3CYiYf2X4WoZdxXU"),
  });
  const transaction = new Transaction().add(
    instruction
  );

  console.log(`The address of campaign1 account is : ${newAccountPubkey.toBase58()}`);

  await sendAndConfirmTransaction(connection, transaction, [signer]);

}

establishConnection();
createAccount();
