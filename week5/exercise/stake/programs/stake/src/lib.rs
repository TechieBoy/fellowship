use std::thread::AccessError;

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

declare_id!("57yy1CoavqHM5Jq7wUKMXkNDgtPq5n8DZRVeLdtc6AwH");

#[program]
pub mod stake {
    use anchor_spl::{associated_token::get_associated_token_address, token::Transfer};

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        if ctx.accounts.mint.mint_authority.unwrap() != *ctx.program_id {
            return Err(ProgramError::IllegalOwner.into());
        }
        let ass_key = get_associated_token_address(ctx.program_id, &ctx.accounts.mint.key());
        if ctx.accounts.associated_acc.key() != ass_key {
            return Err(ProgramError::IllegalOwner.into());
        }
        ctx.accounts.state.mint = ctx.accounts.mint.mint_authority.unwrap();
        ctx.accounts.state.associated_account = ctx.accounts.associated_acc.key();
        Ok(())
        
    }
    pub fn stake(ctx: Context<Stake>, token_amount: u64) -> Result<()> {
        ctx.accounts.stake_info.owner = ctx.accounts.owner.key();
        ctx.accounts.stake_info.token_amount = token_amount;
        // let t = Transfer(
        //     ctx.accounts.owner.to_account_info(),
        //     ctx.accounts.token_associated_acc.to_account_info(),
        // )
        Ok(())
    }
}

#[account]
#[derive(Default)]
pub struct State {
    mint: Pubkey,
    // Convert to PDA associated
    associated_account: Pubkey,
}

#[account]
#[derive(Default)]
pub struct StakeInfo {
    owner: Pubkey,
    token_amount: u64,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    signer: Signer<'info>,

    #[account(init, payer = signer, seeds=[b"state"], bump)]
    state: Account<'info, State>,

    mint: Account<'info, Mint>,
    
    associated_acc: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    owner: Signer<'info>,

    #[account(seeds=[b"state"], bump)]
    state: Account<'info, State>,
   
    #[account(init, payer = owner, seeds=[owner.key().as_ref()], bump)]
    stake_info: Account<'info, StakeInfo>,

    user_associated_acc: Account<'info, TokenAccount>,
    
    token_associated_acc: Account<'info, TokenAccount>,

    system_program: Program<'info, System>,
}
