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

  it('Is initialized!', async () => {
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

  it('Create proposal!', async () => {
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
  it('Vote with first voter!', async () => {
    const proposalOnchaino = await program.account.voterAccount.fetch(proposal.publicKey);
    console.log(proposalOnchaino);
    const tx = await program.rpc.vote(
      {
        accounts: {
          voterKey: voter1.publicKey,
          voteAccount: voter1account.publicKey,
          proposalAccount: proposal.publicKey,
        },
        signers: [voter1]
      }
    );
    const voter1onchain = await program.account.voterAccount.fetch(voter1account.publicKey);
    const proposalOnchain = await program.account.voterAccount.fetch(proposal.publicKey);
    assert.ok(voter1onchain.voted === true);
    assert.ok(proposalOnchain.votes.toNumber() === 30);


   });
});
