import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Voting } from '../target/types/voting';
import { assert } from 'chai';

describe('voting', () => {

  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Voting as Program<Voting>;
  const admin = anchor.web3.Keypair.generate();
  const adminAccount = anchor.web3.Keypair.generate();

  const voter1 = anchor.web3.Keypair.generate();
  const voter1account = anchor.web3.Keypair.generate();

  const voter2 = anchor.web3.Keypair.generate();
  const voter2account = anchor.web3.Keypair.generate();

  const proposal = anchor.web3.Keypair.generate();
  const proposal2 = anchor.web3.Keypair.generate();

  it('Initialize contract!', async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(admin.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL), "confirmed");
    const tx = await program.rpc.initialize(
      {
        accounts: {
          admin: admin.publicKey,
          adminAccount: adminAccount.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        },
        signers: [admin, adminAccount]
      },
    );
    let deployedAdminAccount = await program.account.adminAccount.fetch(adminAccount.publicKey);
    assert.ok(deployedAdminAccount.adminKey.equals(admin.publicKey));
    console.log("Init transaction signature", tx);
  });

  it('Create 2 proposals!', async () => {
    const [proposal_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("proposal"))],
      program.programId
    );
    const tx = await program.rpc.addNewProposal(
      1,
      {
        accounts: {
          adminKey: admin.publicKey,
          proposalPda: proposal_pda,
          adminAccount: adminAccount.publicKey,
          proposalAccount: proposal.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [admin, proposal]
      },
    );

    const tx2 = await program.rpc.addNewProposal(
      2,
      {
        accounts: {
          adminKey: admin.publicKey,
          proposalPda: proposal_pda,
          adminAccount: adminAccount.publicKey,
          proposalAccount: proposal2.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [admin, proposal2]
      },
    );

  });

  it('Create 2 voters!', async () => {
    const tx = await program.rpc.addNewVoter(
      new anchor.BN(10),
      {
        accounts: {
          adminKey: admin.publicKey,
          voter: voter1.publicKey,
          adminAccount: adminAccount.publicKey,
          voterAccount: voter1account.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [admin, voter1account]
      },
    );
    const tx2 = await program.rpc.addNewVoter(
      new anchor.BN(20),
      {
        accounts: {
          adminKey: admin.publicKey,
          voter: voter2.publicKey,
          adminAccount: adminAccount.publicKey,
          voterAccount: voter2account.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [admin, voter2account]
      },
    );
  });
  it('Delegate 2nd voters votes to first !', async () => {
    const tx = await program.rpc.delegate(
      {
        accounts: {
          voterKey: voter2.publicKey,
          voteAccount: voter2account.publicKey,
          delegateAccount: voter1account.publicKey,
        },
        signers: [voter2]
      }
    );
    const voter1onchain = await program.account.voterAccount.fetch(voter1account.publicKey);
    const voter2onchain = await program.account.voterAccount.fetch(voter2account.publicKey);
    assert.ok(voter1onchain.stakeWeight.toNumber() === 30);
    assert.ok(voter2onchain.voted === true);
    assert.ok(voter1onchain.voted === false);


   });

  it('Vote with first voter to proposal 2!', async () => {
    const tx = await program.rpc.vote(
      {
        accounts: {
          voterKey: voter1.publicKey,
          voteAccount: voter1account.publicKey,
          proposalAccount: proposal2.publicKey,
        },
        signers: [voter1]
      }
    );
    const voter1onchain = await program.account.voterAccount.fetch(voter1account.publicKey);
    const proposalOnchain = await program.account.proposalAccount.fetch(proposal2.publicKey);
    assert.ok(voter1onchain.voted === true);
    assert.ok(proposalOnchain.votes.toNumber() === 30);
   });

  it('Find the winning proposal!', async () => {
    let proposals = [proposal.publicKey, proposal2.publicKey];
    const [proposal_pda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("proposal"))],
      program.programId
    );
    let max_votes = -1;
    let winner = null;
    for (let p of proposals) {
      const info = await provider.connection.getAccountInfo(p);
      // Assert proper owner
      assert.ok(info.owner.equals(program.programId));
      let paccount =  await program.account.proposalAccount.fetch(p);
      if (paccount.votes.toNumber() > max_votes) {
        max_votes = paccount.votes.toNumber();
        winner = paccount.id;
      }
    }
    console.log("Winner is proposal #", winner);
   });
});
