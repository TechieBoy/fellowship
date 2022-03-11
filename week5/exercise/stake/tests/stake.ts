import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Stake } from "../target/types/stake";
import { createMint, mintTo, getOrCreateAssociatedTokenAccount, setAuthority, AuthorityType, TOKEN_PROGRAM_ID } from '@solana/spl-token';


describe("stake", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  const connection = provider.connection;
  const web3 = anchor.web3;

  anchor.setProvider(provider);

  const creator = web3.Keypair.generate();
  const dude = web3.Keypair.generate();
  const program = anchor.workspace.Stake as Program<Stake>;
  let dude_ass_acc = null;
  let program_token = null;
  let mint = null;
  let state_pda = null;
  let stake_pda = null;

  before(async function () {
    await connection.confirmTransaction(
      await connection.requestAirdrop(creator.publicKey, 2 * web3.LAMPORTS_PER_SOL));
    await connection.confirmTransaction(
      await connection.requestAirdrop(dude.publicKey, 2 * web3.LAMPORTS_PER_SOL));
    mint = await createMint(connection, creator, creator.publicKey, creator.publicKey, 0);
    console.log('Mint public address: ' + mint.toBase58());

    dude_ass_acc = await getOrCreateAssociatedTokenAccount(connection, creator, mint, dude.publicKey, false);
    console.log('Token public address: ' + dude_ass_acc.address);

    await connection.confirmTransaction(
      await mintTo(connection, creator, mint, dude_ass_acc.address, creator, 100));

    let _bump = null;

    [state_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("state"))],
      program.programId
    );

    [stake_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("stake"))],
      program.programId
    );

    program_token = await getOrCreateAssociatedTokenAccount(connection, creator, mint, stake_pda, true);
    console.log('Program Token public address: ' + program_token.address);

    await connection.confirmTransaction(
      await setAuthority(connection, creator, mint, creator, AuthorityType.MintTokens, stake_pda));
  });


  it("Is initialized!", async () => {
    const tx = await program.rpc.initialize({
      accounts: {
        signer: dude.publicKey,
        state: state_pda,
        mint: mint,
        stakePda: stake_pda,
        associatedAcc: program_token.address,
        systemProgram: web3.SystemProgram.programId 
      },
      signers: [dude]
    });
    console.log("Initialized with tx signature", tx);
  });

  it("Stake!", async () => {
    let [stake_info, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [dude.publicKey.toBuffer()],
      program.programId
    );
    console.log(dude.publicKey.toBase58());
    console.log(dude_ass_acc.owner.toBase58());
    console.log(program_token.owner.toBase58());

    const tx = await program.rpc.stake(new anchor.BN(10),{
      accounts: {
        owner: dude.publicKey,
        state: state_pda,
        stakeInfo: stake_info,
        stakePda: stake_pda,
        userAssociatedAcc: dude_ass_acc.address,
        programAssociatedAcc: program_token.address,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      },
      signers: [dude]
    });
    console.log("Stake with tx signature", tx);
  });

  it("Unstake!", async () => {
    let [stake_info, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [dude.publicKey.toBuffer()],
      program.programId
    );
    console.log("Stake pda ", stake_pda.toBase58());

    const tx = await program.rpc.unstake({
      accounts: {
        owner: dude.publicKey,
        mint: mint,
        state: state_pda,
        stakeInfo: stake_info,
        stakePda: stake_pda,
        userAssociatedAcc: dude_ass_acc.address,
        programAssociatedAcc: program_token.address,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      },
      signers: [dude]
    });
    console.log("UnStake with tx signature", tx);
  });
});
