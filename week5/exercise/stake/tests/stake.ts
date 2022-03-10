import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Stake } from "../target/types/stake";
import { createMint, mintTo, getOrCreateAssociatedTokenAccount, setAuthority, AuthorityType } from '@solana/spl-token';


describe("stake", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  const connection = provider.connection;
  const web3 = anchor.web3;

  anchor.setProvider(provider);

  const creator = web3.Keypair.generate();
  const dude = web3.Keypair.generate();
  const program = anchor.workspace.Stake as Program<Stake>;
  let token = null;
  let program_token = null;
  let mint = null;
  let state_pda = null;
  before(async function () {
    await connection.confirmTransaction(
      await connection.requestAirdrop(creator.publicKey, 2 * web3.LAMPORTS_PER_SOL));
    await connection.confirmTransaction(
      await connection.requestAirdrop(dude.publicKey, 2 * web3.LAMPORTS_PER_SOL));
    mint = await createMint(connection, creator, creator.publicKey, creator.publicKey, 0);
    console.log('Mint public address: ' + mint.toBase58());

    token = await getOrCreateAssociatedTokenAccount(connection, creator, mint, dude.publicKey, false);
    console.log('Token public address: ' + token.address);

    program_token = await getOrCreateAssociatedTokenAccount(connection, creator, mint, program.programId, false);
    console.log('Program Token public address: ' + program_token.address);

    await connection.confirmTransaction(
      await mintTo(connection, creator, mint, token.address, creator, 100));
    console.log('done');
    let _bump = null;
    [state_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("state"))],
      program.programId
    );

  });


  it("Is initialized!", async () => {
    // Add your test here.
    await connection.confirmTransaction(
      await setAuthority(connection, creator, mint, creator, AuthorityType.MintTokens, program.programId));
    const tx = await program.rpc.initialize({
      accounts: {
        signer: dude.publicKey,
        state: state_pda,
        mint: mint,
        associatedAcc: program_token.address,
        systemProgram: web3.SystemProgram.programId 
      },
      signers: [dude]
    });
    console.log("Your transaction signature", tx);
  });
});
