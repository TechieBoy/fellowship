use anchor_lang::prelude::*;

declare_id!("DZFPFVWnWQNJQisPem4ittbMerKwoW1zMitWP5NQZWHA");

#[program]
pub mod voting {

    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        ctx.accounts.admin_account.admin_key = *ctx.accounts.admin.key;
        Ok(())
    }

    pub fn add_new_voter(ctx: Context<NewVoter>, stake_weight: u64) -> ProgramResult {
        let va = &mut ctx.accounts.voter_account;
        va.voter_key = *ctx.accounts.voter.key;
        va.proposal_key = ctx.accounts.proposal.key();
        va.stake_weight = stake_weight;
        va.voted = false;
        Ok(())
    }

    pub fn add_new_proposal(ctx: Context<NewProposal>, name:String, propbump: u8) -> ProgramResult {
        let pa = &mut ctx.accounts.proposal_account;
        pa.name = name;
        pa.votes = 0;
        // Set all proposal account owners to a single pda, for easy iteration.
        pa.to_account_info().owner = ctx.accounts.proposal_pda.key;
        Ok(())
        
    }

    pub fn delegate(ctx: Context<DelegateVotes>) -> ProgramResult {
        ctx.accounts.delegate_account.stake_weight += ctx.accounts.vote_account.stake_weight;
        ctx.accounts.vote_account.voted = true;
        Ok(())
    }

    pub fn vote(ctx: Context<GiveVote>) -> ProgramResult {
        ctx.accounts.proposal_account.votes += ctx.accounts.vote_account.stake_weight;
        ctx.accounts.vote_account.voted = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    pub admin: Signer<'info>,
    #[account(init, payer=admin)]
    pub admin_account: Account<'info, AdminAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NewVoter<'info> {
    pub admin_key: Signer<'info>,
    pub voter: AccountInfo<'info>,
    pub proposal: Account<'info, ProposalAccount>,
    #[account(has_one = admin_key)]
    pub admin_account: Account<'info, AdminAccount>,
    #[account(
        init,
        payer = admin_key)]
    pub voter_account: Account<'info, VoterAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name:String, propbump:u8)]
pub struct NewProposal<'info> {
    pub admin_key: Signer<'info>,

    #[account(seeds=[b"proposal"], bump = propbump)]
    pub proposal_pda: AccountInfo<'info>,

    #[account(has_one = admin_key)]
    pub admin_account: Account<'info, AdminAccount>,

    #[account(
        init,
        payer = admin_key)]
    // TODO: Why does owner constraint not work?
    pub proposal_account: Account<'info, ProposalAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DelegateVotes<'info> {
    pub voter_key: Signer<'info>,
    #[account(mut, has_one = voter_key, constraint = !vote_account.voted)]
    pub vote_account: Account<'info, VoterAccount>,
    // Cannot delegate to already voted account
    #[account(mut, constraint = !delegate_account.voted)]
    pub delegate_account: Account<'info, VoterAccount>,
}

#[derive(Accounts)]
pub struct GiveVote<'info> {
    pub voter_key: Signer<'info>,
    #[account(mut, has_one = voter_key, constraint = !vote_account.voted)]
    pub vote_account: Account<'info, VoterAccount>,
    pub proposal_account: Account<'info, ProposalAccount>,
}

#[account]
#[derive(Default)]
// Only admin can add voters and proposals
pub struct AdminAccount {
    pub admin_key: Pubkey,
}

#[account]
#[derive(Default)]
pub struct VoterAccount {
    pub voter_key: Pubkey,
    pub proposal_key: Pubkey,
    pub stake_weight: u64,
    pub voted: bool,
}

#[account]
#[derive(Default)]
pub struct ProposalAccount {
    pub name: String,
    pub votes: u64,
}
