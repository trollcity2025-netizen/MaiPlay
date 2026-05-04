-- Daily Login Reward Function
-- This migration adds the RPC function for claiming daily MAI login rewards

-- RPC function for claiming daily MAI login reward
create or replace function claim_mai_daily_login_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_reward_date date;
  v_wallet_id uuid;
  v_current_balance integer;
  v_claimed boolean := false;
  v_coins_awarded integer := 10;
begin
  -- Get current user ID
  v_user_id := current_user_profile_id();
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Determine reward date (UTC date)
  v_reward_date := current_date;

  -- Check if already claimed today
  if exists (
    select 1
    from mai_daily_login_rewards
    where user_id = v_user_id
      and reward_date = v_reward_date
  ) then
    -- Already claimed, get current balance
    select mai_coins into v_current_balance
    from mai_wallets
    where user_id = v_user_id;
    if v_current_balance is null then
      v_current_balance := 0;
    end if;
    return jsonb_build_object(
      'claimed', false,
      'message', 'Already claimed today',
      'balance', v_current_balance,
      'next_claim_date', v_reward_date + interval '1 day'
    );
  end if;

  -- Claim the reward
  begin
    -- Insert reward record (will fail if already exists due to unique constraint)
    insert into mai_daily_login_rewards (user_id, reward_date, coins_awarded)
    values (v_user_id, v_reward_date, v_coins_awarded);

    -- Upsert wallet and add coins
    insert into mai_wallets (user_id, mai_coins, lifetime_earned)
    values (v_user_id, v_coins_awarded, v_coins_awarded)
    on conflict (user_id) do update set
      mai_coins = mai_wallets.mai_coins + v_coins_awarded,
      lifetime_earned = mai_wallets.lifetime_earned + v_coins_awarded,
      updated_at = now()
    returning id, mai_coins into v_wallet_id, v_current_balance;

    -- Insert transaction record
    insert into mai_coin_transactions (user_id, amount, transaction_type, source, metadata)
    values (v_user_id, v_coins_awarded, 'daily_login_reward', 'daily_login', jsonb_build_object('reward_date', v_reward_date));

    v_claimed := true;
  exception
    when unique_violation then
      -- Race condition: someone else claimed it first
      select mai_coins into v_current_balance
      from mai_wallets
      where user_id = v_user_id;
      if v_current_balance is null then
        v_current_balance := 0;
      end if;
      return jsonb_build_object(
        'claimed', false,
        'message', 'Already claimed today',
        'balance', v_current_balance,
        'next_claim_date', v_reward_date + interval '1 day'
      );
  end;

  return jsonb_build_object(
    'claimed', true,
    'balance', v_current_balance,
    'coins_awarded', v_coins_awarded,
    'next_claim_date', v_reward_date + interval '1 day'
  );
end;
$$;
