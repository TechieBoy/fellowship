use anchor_lang::prelude::*;
use anchor_lang::solana_program as sp;

declare_id!("AmMaTKT4BYZaxJWiFfy2LtDg39osqUGPjadz5CSiYD7z");

#[program]
pub mod paymentchannel {

    use super::*;
    pub fn initialize(ctx: Context<Initialize>, alice_amount: u64, bob_amount: u64) -> Result<()> {
        ctx.accounts.state.alice = *ctx.accounts.alice.key;
        ctx.accounts.state.bob = *ctx.accounts.bob.key;
        ctx.accounts.state.alice_balance = alice_amount;
        ctx.accounts.state.bob_balance = bob_amount;
        // Both have signed
        transfer(ctx.accounts.alice.to_account_info(), ctx.accounts.state.to_account_info(), alice_amount)?;
        transfer(ctx.accounts.bob.to_account_info(), ctx.accounts.state.to_account_info(), bob_amount)?;
        Ok(())
    }
    
    pub fn update(ctx: Context<Update>, alice_amount: u64, bob_amount: u64) -> Result<()> {
        let state_account = &mut ctx.accounts.state;
        if state_account.alice_balance + state_account.bob_balance < alice_amount + bob_amount {
            return err!(ChannelError::InvalidBalances);
        }
        state_account.alice_balance = alice_amount;
        state_account.bob_balance = bob_amount;
        Ok(())
    }
}

fn transfer<'a>(from: AccountInfo<'a>, to: AccountInfo<'a>, amount: u64) -> Result<()> {
    let ix = sp::system_instruction::transfer(
        &from.key(),
        &to.key(),
        amount,
    );
    sp::program::invoke(
        &ix,
        &[
            from,
            to,
        ],
    )?;
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub alice: Signer<'info>,
    #[account(mut)]
    pub bob: Signer<'info>,
    #[account(init, payer=alice, seeds=[b"state"], bump)]
    pub state: Account<'info, ChannelState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub alice: Signer<'info>,
    #[account(mut)]
    pub bob: Signer<'info>,
    #[account(mut, seeds=[b"state"], bump,
        constraint = state.alice == *alice.key,
        constraint = state.bob == *bob.key,
        constraint = state.to_account_info().lamports() >= state.alice_balance + state.bob_balance)]
    pub state: Account<'info, ChannelState>,
}

#[account]
#[derive(Default)]
pub struct ChannelState {
    pub alice: Pubkey,
    pub bob: Pubkey,
    // in lamports
    pub alice_balance: u64,
    // in lamports
    pub bob_balance: u64,
}

#[error_code]
pub enum ChannelError {
    #[msg("Invalid balances in state struct")]
    InvalidBalances,
}