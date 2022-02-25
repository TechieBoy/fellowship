import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Paymentchannel } from "../target/types/paymentchannel";

describe("paymentchannel", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);
  let alice = anchor.web3.Keypair.generate();
  let bob = anchor.web3.Keypair.generate();

  const program = anchor.workspace.Paymentchannel as Program<Paymentchannel>;

  it("Is initialized!", async () => {
    // Add your test here.
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(alice.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL), "confirmed");
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(bob.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL), "confirmed");
    console.log(await provider.connection.getBalance(alice.publicKey, "processed") / anchor.web3.LAMPORTS_PER_SOL);
    const [state_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("state"))],
      program.programId
    );

    console.log("Alice creates transaction");
    const alicetx = program.transaction.initialize(
      new anchor.BN(anchor.web3.LAMPORTS_PER_SOL), new anchor.BN(anchor.web3.LAMPORTS_PER_SOL), {
      accounts: {
        alice: alice.publicKey,
        bob: bob.publicKey,
        state: state_pda,
        systemProgram: anchor.web3.SystemProgram.programId
      },
    });
    // Set feepayer and blockhash and sign
    alicetx.feePayer = alice.publicKey;
    alicetx.recentBlockhash = (await provider.connection.getLatestBlockhash("processed")).blockhash;
    alicetx.partialSign(alice);
    let send_by_json = alicetx.serialize({ requireAllSignatures:false, verifySignatures:false}).toJSON();
    
    // Send this to bob
    // Bob takes serialized tx and deserializes, signs and sends to network.
    let bobtx = anchor.web3.Transaction.from(Buffer.from(send_by_json.data));
    bobtx.partialSign(bob);

    let final_tx = bobtx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    await provider.connection.confirmTransaction(await provider.connection.sendRawTransaction(final_tx));
    console.log(await provider.connection.getBalance(alice.publicKey, "processed")/ anchor.web3.LAMPORTS_PER_SOL);
    console.log(await provider.connection.getBalance(state_pda, "processed")/ anchor.web3.LAMPORTS_PER_SOL);
    let curr_state = await program.account.channelState.fetch(state_pda, 'processed');
    console.log(curr_state.aliceBalance.toNumber());
    console.log(curr_state.bobBalance.toNumber());
    console.log(curr_state.initTime.toNumber());
  });

  it("Update balances!", async () => {
    const [state_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("state"))],
      program.programId
    );
    const tx = await program.rpc.update(
      new anchor.BN(1.5 * anchor.web3.LAMPORTS_PER_SOL), new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL), {
        accounts: {
          alice: alice.publicKey,
          bob: bob.publicKey,
          state: state_pda,
        },
        signers: [alice, bob]
      });
    console.log(await provider.connection.getBalance(state_pda, "processed")/ anchor.web3.LAMPORTS_PER_SOL);
    let curr_state = await program.account.channelState.fetch(state_pda, 'processed');
    console.log(curr_state.aliceBalance.toNumber());
    console.log(curr_state.bobBalance.toNumber());
    console.log("Your transaction signature", tx);
  });
  
  it("Liquidate and end!", async () => {
    const [state_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("state"))],
      program.programId
    );
    const tx = await program.rpc.liquidate({
      accounts: {
          signer: alice.publicKey,
          other: bob.publicKey,
          state: state_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [alice]
    });
  });
  
});
