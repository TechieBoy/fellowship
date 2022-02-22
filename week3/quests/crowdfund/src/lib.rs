use borsh::BorshDeserialize;
use borsh::BorshSerialize;
use solana_program::account_info::next_account_info;
use solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg, pubkey::Pubkey,
};

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct CampaignAccount {
    pub owner: Pubkey,
    pub amount: u64,
    pub description: String,
    pub fulfilled: u64,
}

entrypoint!(process_instruction);
fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let campaign_account = next_account_info(accounts_iter)?;
    let campaign_owner_account = next_account_info(accounts_iter)?;
    let (instruction_byte, all_other_bytes) = instruction_data.split_first().unwrap();

    match *instruction_byte {
        0 => {
            // create campaign
            let amount = all_other_bytes
                .get(..8)
                .and_then(|slice| slice.try_into().ok())
                .map(u64::from_le_bytes)
                .unwrap();
            let description = String::from_utf8(all_other_bytes[9..].to_vec()).unwrap();
            let mut campaign_account_data =
                CampaignAccount::try_from_slice(&campaign_account.data.borrow())?;
            campaign_account_data.owner = *campaign_owner_account.owner;
            campaign_account_data.amount = amount;
            campaign_account_data.description = description;
            campaign_account_data.fulfilled = 0;
            campaign_account_data.serialize(&mut &mut campaign_account.data.borrow_mut()[..])?;
        }
        1 => {
            // fund campaign
        }
        2 => {
            // get how much funds are left to reach the requested amount
            let campaign_account_data =
                CampaignAccount::try_from_slice(&campaign_account.data.borrow())?;
            msg!(
                "{}",
                campaign_account_data.amount - campaign_account_data.fulfilled
            );
        }
        3 => {
            // withdraw all collected funds and close campaign
        }
        _ => {
            msg!(
                "Invalid instruction for program {}, {} accounts passed, with data: {:?}",
                program_id,
                accounts.len(),
                instruction_data
            )
        }
    }
    Ok(())
}

#[cfg(test)]
mod test {
    use {
        super::*,
        assert_matches::*,
        solana_program::instruction::{AccountMeta, Instruction},
        solana_program_test::*,
        solana_sdk::{signature::Signer, transaction::Transaction},
    };

    #[tokio::test]
    async fn test_transaction() {
        let program_id = Pubkey::new_unique();

        let (mut banks_client, payer, recent_blockhash) = ProgramTest::new(
            "bpf_program_template",
            program_id,
            processor!(process_instruction),
        )
        .start()
        .await;

        let mut transaction = Transaction::new_with_payer(
            &[Instruction {
                program_id,
                accounts: vec![AccountMeta::new(payer.pubkey(), false)],
                data: vec![1, 2, 3],
            }],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer], recent_blockhash);

        assert_matches!(banks_client.process_transaction(transaction).await, Ok(()));
    }
}
