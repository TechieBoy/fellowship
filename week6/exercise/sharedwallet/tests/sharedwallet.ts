import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Sharedwallet } from "../target/types/sharedwallet";

describe("sharedwallet", () => {
  const provider = anchor.Provider.env()
  const connection = provider.connection;
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.Sharedwallet as Program<Sharedwallet>;
  let payer = new anchor.web3.Keypair();
  let state = null;
  let spend = null;
  let _bump = null;
  let merchant = anchor.web3.Keypair.generate();
  
  let friends = [];
  friends.push(payer.publicKey);
  for (let i = 0; i < 4; ++i) {
    friends.push(anchor.web3.Keypair.generate().publicKey);
  }
  
  before(async function () {
    [state, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("state"))],
      program.programId
    );
    [spend, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("spend"))],
      program.programId
    );
    await connection.confirmTransaction(
      await connection.requestAirdrop(payer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );
    
  });

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.rpc.initialize(friends, {
      accounts: {
        signer: payer.publicKey,
        stateAccount: state,
        spendAccount: spend,
        systemProgram: anchor.web3.SystemProgram.programId

      },
      signers: [payer]
    });
    console.log("Your transaction signature", tx);
  });

  it("pay to someone", async () => {
    await connection.confirmTransaction(
      await connection.requestAirdrop(spend, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );
    // Add your test here.
    const balance = await connection.getBalance(merchant.publicKey);
    console.log(balance);
    const tx = await program.rpc.pay(new anchor.BN(3*anchor.web3.LAMPORTS_PER_SOL), {
      accounts: {
        payer: payer.publicKey,
        stateAccount: state,
        spendAccount: spend,
        payee: merchant.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId

      },
      signers: [payer]
    });
    const balance_after = await connection.getBalance(merchant.publicKey);
    console.log(balance_after);
    console.log("Your transaction signature", tx);
  });
});
