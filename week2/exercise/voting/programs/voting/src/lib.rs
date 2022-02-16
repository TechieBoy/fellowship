use anchor_lang::prelude::*;
declare_id!("32xysbG8hJdyHRXkF8JWSN5K9yHdqZsFEgXNcNAo2Khg");

#[program]
pub mod voting {

    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        let admin_account = &mut ctx.accounts.admin_account;
        admin_account.admin_key = *ctx.accounts.admin.key;
        Ok(())
    }

    pub fn add_new_voter(ctx: Context<NewVoter>, stake_weight: u64) -> ProgramResult {
        let va = &mut ctx.accounts.voter_account;
        va.voter_key = *ctx.accounts.voter.key;
        va.stake_weight = stake_weight;
        va.voted = false;
        Ok(())
    }

    pub fn add_new_proposal(ctx: Context<NewProposal>, id:u8) -> ProgramResult {
        let pa = &mut ctx.accounts.proposal_account;
        pa.id = id;
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
    #[account(init, payer=admin)]
    pub admin_account: Account<'info, AdminAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NewVoter<'info> {
    #[account(mut)]
    pub admin_key: Signer<'info>,
    pub voter: AccountInfo<'info>,
    #[account(has_one = admin_key)]
    pub admin_account: Account<'info, AdminAccount>,
    #[account(
        init,
        payer = admin_key)]
    pub voter_account: Account<'info, VoterAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NewProposal<'info> {
    #[account(mut)]
    pub admin_key: Signer<'info>,

    #[account(seeds=[b"proposal"], bump)]
    pub proposal_pda: AccountInfo<'info>,

    #[account(has_one = admin_key)]
    pub admin_account: Account<'info, AdminAccount>,

    #[account(
        init,
        payer = admin_key)]
    pub proposal_account: Account<'info, ProposalAccount>,
    pub system_program: Program<'info, System>,

}

#[derive(Accounts)]
pub struct DelegateVotes<'info> {
    #[account(mut)]
    pub voter_key: Signer<'info>,
    #[account(mut, has_one = voter_key, constraint = !vote_account.voted)]
    pub vote_account: Account<'info, VoterAccount>,
    // Cannot delegate to already voted account
    #[account(mut, constraint = !delegate_account.voted)]
    pub delegate_account: Account<'info, VoterAccount>,
}

#[derive(Accounts)]
pub struct GiveVote<'info> {
    #[account(mut)]
    pub voter_key: Signer<'info>,
    #[account(mut, has_one = voter_key, constraint = !vote_account.voted)]
    pub vote_account: Account<'info, VoterAccount>,
    #[account(mut)]
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
    pub stake_weight: u64,
    pub voted: bool,
}

#[account]
#[derive(Default)]
pub struct ProposalAccount {
    pub id: u8,
    pub votes: u64,
}
