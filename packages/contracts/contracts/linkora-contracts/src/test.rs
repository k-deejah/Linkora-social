#![cfg(test)]

use super::*;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String,
};

fn setup_token(env: &Env, admin: &Address) -> Address {
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    StellarAssetClient::new(env, &token_id.address()).mint(admin, &10_000);
    token_id.address()
}

#[test]
fn test_profile() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(LinkoraContract, ());
    let client = LinkoraContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    client.set_profile(
        &user,
        &String::from_str(&env, "alice"),
        &user.clone(),
    );
    let profile = client.get_profile(&user).unwrap();
    assert_eq!(profile.username, String::from_str(&env, "alice"));
}

#[test]
fn test_follow() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(LinkoraContract, ());
    let client = LinkoraContractClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.follow(&alice, &bob);
    let following = client.get_following(&alice);
    assert_eq!(following.len(), 1);
    assert_eq!(following.get(0).unwrap(), bob);
}

#[test]
fn test_post_and_tip() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);

    let contract_id = env.register(LinkoraContract, ());
    let client = LinkoraContractClient::new(&env, &contract_id);

    let author = Address::generate(&env);
    let tipper = Address::generate(&env);
    let token = setup_token(&env, &tipper);

    let post_id = client.create_post(&author, &String::from_str(&env, "Hello Linkora!"));
    assert_eq!(post_id, 1);

    client.tip(&tipper, &post_id, &token, &500);

    let post = client.get_post(&post_id).unwrap();
    assert_eq!(post.tip_total, 500);
    assert_eq!(TokenClient::new(&env, &token).balance(&author), 500);
}

#[test]
fn test_pool_deposit_withdraw() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(LinkoraContract, ());
    let client = LinkoraContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let token = setup_token(&env, &user);
    let pool_id = symbol_short!("community");

    client.pool_deposit(&user, &pool_id, &token, &1_000);
    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.balance, 1_000);

    client.pool_withdraw(&user, &pool_id, &200);
    let pool = client.get_pool(&pool_id).unwrap();
    assert_eq!(pool.balance, 800);
    assert_eq!(TokenClient::new(&env, &token).balance(&user), 9_200);
}

#[test]
fn test_block_event() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(LinkoraContract, ());
    let client = LinkoraContractClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.block_user(&alice, &bob);

    // Verify bob is in alice's block list
    let blocked = client.get_blocked(&alice);
    assert_eq!(blocked.len(), 1);
    assert_eq!(blocked.get(0).unwrap(), bob);

    // Verify BlockEvent was emitted
    let events = env.events().all();
    assert_eq!(events.len(), 1);
    let (_, topics, data): (Address, soroban_sdk::Vec<soroban_sdk::Val>, BlockEvent) =
        soroban_sdk::testutils::Events::get(&env.events(), 0);
    assert_eq!(topics.get(0).unwrap(), soroban_sdk::Val::from(symbol_short!("block")));
    assert_eq!(data.blocker, alice);
    assert_eq!(data.blocked, bob);
}

#[test]
fn test_unblock_event() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(LinkoraContract, ());
    let client = LinkoraContractClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Block first, then unblock
    client.block_user(&alice, &bob);
    client.unblock_user(&alice, &bob);

    // Verify bob is removed from alice's block list
    let blocked = client.get_blocked(&alice);
    assert_eq!(blocked.len(), 0);

    // Verify UnblockEvent was emitted (second event after BlockEvent)
    let events = env.events().all();
    assert_eq!(events.len(), 2);
    let (_, topics, data): (Address, soroban_sdk::Vec<soroban_sdk::Val>, UnblockEvent) =
        soroban_sdk::testutils::Events::get(&env.events(), 1);
    assert_eq!(topics.get(0).unwrap(), soroban_sdk::Val::from(symbol_short!("unblock")));
    assert_eq!(data.blocker, alice);
    assert_eq!(data.blocked, bob);
}
