import credits.aleo;
import token_registry.aleo;

// BlockSeer Prediction Market v6
// - Stablecoin support via token_registry.aleo (USDCx, USAD)
// - 2% protocol fee on winnings
// - Dispute mechanism with 24h window
// - User self-claim via program public balance
// - Refunds for cancelled pools
program manifoldpredictionv6.aleo {

    // Pool structure — prediction market instance
    struct Pool {
        id: field,
        title: field,
        description: field,
        options: [field; 2],
        deadline: u64,
        status: u8, // 0=open, 1=locked, 2=resolved, 3=disputed, 4=cancelled
        winning_option: u64,
        total_staked: u64,
        option_a_stakes: u64,
        option_b_stakes: u64,
        total_no_of_stakes: u64,
        total_no_of_stakes_option_a: u64,
        total_no_of_stakes_option_b: u64,
        token_id: field, // 0field = native ALEO credits, else ARC-21 token_id
        resolved_at: u64, // block height when resolved (for dispute window)
    }

    struct Default {
        id: u32
    }

    // Prediction record — private to the user
    record Prediction {
        id: field,
        owner: address,
        pool_id: field,
        option: u64,
        amount: u64,
        claimed: bool,
        token_id: field,
    }

    // Save pool in public storage
    mapping pools: field => Pool;
    storage pools_id: [field];

    // Track total predictions per pool
    mapping total_predictions: field => u64;

    // Track user predictions
    storage user_predictions: [field];

    // Prevent double-betting with the same prediction ID
    mapping commitments: field => field;

    // Prevent double-claiming
    mapping claims: field => bool;

    // Track disputes per pool
    mapping dispute_count: field => u64;

    // Track pool balance for accounting
    mapping pool_balance: field => u64;

    // Protocol fee constants
    const PROTOCOL_FEE_BPS: u64 = 200u64;       // 2%
    const BPS_DENOMINATOR: u64 = 10000u64;
    const DISPUTE_WINDOW_BLOCKS: u64 = 2880u64;  // ~24h at 30s/block

    const ADMIN: address = aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd;

    // ─── Constructor (required for deployment) ──────────────────────────────
    @noupgrade
    async constructor() {}

    // ─── 1. create_pool ─────────────────────────────────────────────────────
    async transition create_pool(
        public pool_id: field,
        public title: field,
        public description: field,
        public options: [field; 2],
        public deadline: u64,
        public token_id: field
    ) -> (Pool, Future) {
        assert_eq(self.caller, ADMIN);

        let pool = Pool {
            id: pool_id,
            title: title,
            description: description,
            options: options,
            deadline: deadline,
            status: 0u8,
            winning_option: 0u64,
            total_staked: 0u64,
            option_a_stakes: 0u64,
            option_b_stakes: 0u64,
            total_no_of_stakes: 0u64,
            total_no_of_stakes_option_a: 0u64,
            total_no_of_stakes_option_b: 0u64,
            token_id: token_id,
            resolved_at: 0u64,
        };

        return (pool, finalize_create_pool(pool_id, pool));
    }

    async function finalize_create_pool(public id: field, public pool: Pool) {
        Mapping::set(total_predictions, id, 0u64);
        Mapping::set(pools, id, pool);
        Mapping::set(pool_balance, id, 0u64);
        Mapping::set(dispute_count, id, 0u64);
        pools_id.push(id);
    }

    // ─── 2. lock_pool ───────────────────────────────────────────────────────
    async transition lock_pool(public id: field) -> Future {
        assert_eq(self.caller, ADMIN);
        return finalize_lock_pool(id);
    }

    async function finalize_lock_pool(public id: field) {
        let pool = Mapping::get(pools, id);
        pool.status = 1u8;
        Mapping::set(pools, id, pool);
    }

    // ─── 3. resolve_pool ────────────────────────────────────────────────────
    async transition resolve_pool(public id: field, public winning_option: u64) -> Future {
        assert_eq(self.caller, ADMIN);
        return finalize_resolve_pool(id, winning_option);
    }

    async function finalize_resolve_pool(public id: field, public winning_option: u64) {
        let pool = Mapping::get(pools, id);
        pool.winning_option = winning_option;
        pool.status = 2u8;
        pool.resolved_at = block.height as u64;
        Mapping::set(pools, id, pool);
    }

    // ─── 4. cancel_pool ─────────────────────────────────────────────────────
    async transition cancel_pool(public id: field) -> Future {
        assert_eq(self.caller, ADMIN);
        return finalize_cancel_pool(id);
    }

    async function finalize_cancel_pool(public id: field) {
        let pool = Mapping::get(pools, id);
        assert(pool.status == 3u8); // must be disputed
        pool.status = 4u8;
        Mapping::set(pools, id, pool);
    }

    // ─── 5. predict (native ALEO credits) ───────────────────────────────────
    // Uses transfer_private_to_public — funds go to program's public balance
    async transition predict(
        pool_id: field,
        option: u64,
        amount: u64,
        random_number: u64,
        user_credit: credits.aleo/credits
    ) -> (Prediction, credits.aleo/credits, Future) {
        assert(option == 1u64 || option == 2u64);
        assert_neq(amount, 0u64);

        let prediction_id: field = BHP256::hash_to_field(random_number);

        let prediction: Prediction = Prediction {
            id: prediction_id,
            owner: self.caller,
            pool_id: pool_id,
            option: option,
            amount: amount,
            claimed: false,
            token_id: 0field,
        };

        // Transfer credits from user to program's public balance
        let (remaining, transfer_fut): (credits.aleo/credits, Future) =
            credits.aleo/transfer_private_to_public(user_credit, self.address, amount);

        return (prediction, remaining, finalize_predict(transfer_fut, pool_id, prediction_id, amount));
    }

    async function finalize_predict(
        transfer_fut: Future,
        pool_id: field, prediction_id: field, amount: u64
    ) {
        transfer_fut.await();

        let pool_created: bool = Mapping::contains(pools, pool_id);
        assert(pool_created);

        let pool: Pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 0u8);
        assert_eq(pool.token_id, 0field); // must be native ALEO pool
        assert(pool.deadline > block.timestamp as u64);

        let already_committed: bool = Mapping::contains(commitments, prediction_id);
        assert(!already_committed);
        Mapping::set(commitments, prediction_id, pool_id);

        let current_total: u64 = Mapping::get(total_predictions, pool_id);
        Mapping::set(total_predictions, pool_id, current_total + 1u64);

        // Track pool balance
        let current_balance: u64 = Mapping::get(pool_balance, pool_id);
        Mapping::set(pool_balance, pool_id, current_balance + amount);
    }

    // ─── 6. predict_with_token (ARC-21 tokens: USDCx, USAD) ────────────────
    async transition predict_with_token(
        pool_id: field,
        option: u64,
        amount: u64,
        random_number: u64,
        token: token_registry.aleo/Token
    ) -> (Prediction, token_registry.aleo/Token, token_registry.aleo/Token, Future) {
        assert(option == 1u64 || option == 2u64);
        assert_neq(amount, 0u64);

        let prediction_id: field = BHP256::hash_to_field(random_number);

        let prediction: Prediction = Prediction {
            id: prediction_id,
            owner: self.caller,
            pool_id: pool_id,
            option: option,
            amount: amount,
            claimed: false,
            token_id: token.token_id,
        };

        // token_registry transfer_private(recipient, amount_u128, token_record)
        let amount_u128: u128 = amount as u128;
        let (sender_remaining, recipient_token, transfer_fut):
            (token_registry.aleo/Token, token_registry.aleo/Token, Future) =
            token_registry.aleo/transfer_private(ADMIN, amount_u128, token);

        return (prediction, sender_remaining, recipient_token,
            finalize_predict_token(transfer_fut, pool_id, prediction_id, amount, token.token_id));
    }

    async function finalize_predict_token(
        transfer_fut: Future,
        pool_id: field, prediction_id: field, amount: u64, token_id: field
    ) {
        transfer_fut.await();

        let pool_created: bool = Mapping::contains(pools, pool_id);
        assert(pool_created);

        let pool: Pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 0u8);
        assert_eq(pool.token_id, token_id); // must match pool's token
        assert(pool.deadline > block.timestamp as u64);

        let already_committed: bool = Mapping::contains(commitments, prediction_id);
        assert(!already_committed);
        Mapping::set(commitments, prediction_id, pool_id);

        let current_total: u64 = Mapping::get(total_predictions, pool_id);
        Mapping::set(total_predictions, pool_id, current_total + 1u64);

        let current_balance: u64 = Mapping::get(pool_balance, pool_id);
        Mapping::set(pool_balance, pool_id, current_balance + amount);
    }

    // ─── 7. reveal_prediction ───────────────────────────────────────────────
    async transition reveal_prediction(
        prediction: Prediction
    ) -> (Prediction, Future) {
        let revealed: Prediction = Prediction {
            id: prediction.id,
            owner: prediction.owner,
            pool_id: prediction.pool_id,
            option: prediction.option,
            amount: prediction.amount,
            claimed: prediction.claimed,
            token_id: prediction.token_id,
        };
        return (revealed, finalize_reveal_prediction(
            prediction.pool_id, prediction.id, prediction.option, prediction.amount
        ));
    }

    async function finalize_reveal_prediction(
        pool_id: field, prediction_id: field, option: u64, amount: u64
    ) {
        let committed_pool: field = Mapping::get(commitments, prediction_id);
        assert_eq(committed_pool, pool_id);
        assert_neq(committed_pool, 0field);

        let pool: Pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 1u8);

        assert(option == 1u64 || option == 2u64);

        let new_option_a: u64 = option == 1u64 ? pool.option_a_stakes + amount : pool.option_a_stakes;
        let new_option_b: u64 = option == 2u64 ? pool.option_b_stakes + amount : pool.option_b_stakes;

        let updated_pool: Pool = Pool {
            id: pool.id,
            title: pool.title,
            description: pool.description,
            options: pool.options,
            deadline: pool.deadline,
            status: pool.status,
            winning_option: pool.winning_option,
            total_staked: pool.total_staked + amount,
            option_a_stakes: new_option_a,
            option_b_stakes: new_option_b,
            total_no_of_stakes: pool.total_no_of_stakes,
            total_no_of_stakes_option_a: pool.total_no_of_stakes_option_a,
            total_no_of_stakes_option_b: pool.total_no_of_stakes_option_b,
            token_id: pool.token_id,
            resolved_at: pool.resolved_at,
        };
        Mapping::set(pools, pool_id, updated_pool);
        Mapping::set(commitments, prediction_id, 0field);
    }

    // ─── 8. collect_winnings (native ALEO — user self-claim) ────────────────
    async transition collect_winnings(
        winning_option: u64,
        total_staked: u64,
        option_a_stakes: u64,
        option_b_stakes: u64,
        prediction: Prediction
    ) -> (Prediction, credits.aleo/credits, Future) {
        assert_eq(winning_option, prediction.option);
        assert_eq(prediction.claimed, false);
        assert_eq(prediction.token_id, 0field);

        let winnings_amount: u64 = 0u64;
        if winning_option == 1u64 {
            assert(option_a_stakes > 0u64);
            winnings_amount = calculate_winnings(prediction.amount, total_staked, option_a_stakes);
        } else if winning_option == 2u64 {
            assert(option_b_stakes > 0u64);
            winnings_amount = calculate_winnings(prediction.amount, total_staked, option_b_stakes);
        }

        // Deduct 2% protocol fee
        let fee: u64 = (winnings_amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        let payout: u64 = winnings_amount - fee;

        let updated_prediction: Prediction = Prediction {
            id: prediction.id,
            owner: prediction.owner,
            pool_id: prediction.pool_id,
            option: prediction.option,
            amount: payout,
            claimed: true,
            token_id: prediction.token_id,
        };

        // Transfer from program's public balance to user
        let (user_winnings, transfer_fut): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(prediction.owner, payout);

        return (updated_prediction, user_winnings, finalize_collect_winnings(
            transfer_fut, prediction.pool_id, prediction.id,
            winning_option, total_staked, option_a_stakes, option_b_stakes
        ));
    }

    async function finalize_collect_winnings(
        transfer_fut: Future,
        pool_id: field, prediction_id: field,
        winning_option: u64, total_staked: u64,
        option_a_stakes: u64, option_b_stakes: u64
    ) {
        transfer_fut.await();

        let pool: Pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 2u8);
        assert_eq(pool.winning_option, winning_option);
        assert_eq(pool.total_staked, total_staked);
        assert_eq(pool.option_a_stakes, option_a_stakes);
        assert_eq(pool.option_b_stakes, option_b_stakes);

        // Verify dispute window has passed
        assert(block.height as u64 >= pool.resolved_at + DISPUTE_WINDOW_BLOCKS);

        // Must have revealed
        let commitment_val: field = Mapping::get(commitments, prediction_id);
        assert_eq(commitment_val, 0field);

        // Prevent double-claim
        let already_claimed: bool = Mapping::contains(claims, prediction_id);
        assert(!already_claimed);
        Mapping::set(claims, prediction_id, true);
    }

    // ─── 9. collect_winnings_token (ARC-21 — admin relay) ───────────────────
    async transition collect_winnings_token(
        winning_option: u64,
        total_staked: u64,
        option_a_stakes: u64,
        option_b_stakes: u64,
        admin_token: token_registry.aleo/Token,
        prediction: Prediction
    ) -> (Prediction, token_registry.aleo/Token, token_registry.aleo/Token, Future) {
        assert_eq(self.caller, ADMIN);
        assert_eq(winning_option, prediction.option);
        assert_eq(prediction.claimed, false);
        assert_neq(prediction.token_id, 0field);

        let winnings_amount: u64 = 0u64;
        if winning_option == 1u64 {
            assert(option_a_stakes > 0u64);
            winnings_amount = calculate_winnings(prediction.amount, total_staked, option_a_stakes);
        } else if winning_option == 2u64 {
            assert(option_b_stakes > 0u64);
            winnings_amount = calculate_winnings(prediction.amount, total_staked, option_b_stakes);
        }

        let fee: u64 = (winnings_amount * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
        let payout: u64 = winnings_amount - fee;

        let updated_prediction: Prediction = Prediction {
            id: prediction.id,
            owner: prediction.owner,
            pool_id: prediction.pool_id,
            option: prediction.option,
            amount: payout,
            claimed: true,
            token_id: prediction.token_id,
        };

        let payout_u128: u128 = payout as u128;
        let (remaining_admin, user_tokens, transfer_fut):
            (token_registry.aleo/Token, token_registry.aleo/Token, Future) =
            token_registry.aleo/transfer_private(prediction.owner, payout_u128, admin_token);

        return (updated_prediction, remaining_admin, user_tokens,
            finalize_collect_win_token(
                transfer_fut, prediction.pool_id, prediction.id,
                winning_option, total_staked, option_a_stakes, option_b_stakes
            ));
    }

    async function finalize_collect_win_token(
        transfer_fut: Future,
        pool_id: field, prediction_id: field,
        winning_option: u64, total_staked: u64,
        option_a_stakes: u64, option_b_stakes: u64
    ) {
        transfer_fut.await();

        let pool: Pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 2u8);
        assert_eq(pool.winning_option, winning_option);
        assert_eq(pool.total_staked, total_staked);
        assert_eq(pool.option_a_stakes, option_a_stakes);
        assert_eq(pool.option_b_stakes, option_b_stakes);

        assert(block.height as u64 >= pool.resolved_at + DISPUTE_WINDOW_BLOCKS);

        let commitment_val: field = Mapping::get(commitments, prediction_id);
        assert_eq(commitment_val, 0field);

        let already_claimed: bool = Mapping::contains(claims, prediction_id);
        assert(!already_claimed);
        Mapping::set(claims, prediction_id, true);
    }

    // ─── 10. dispute_pool ───────────────────────────────────────────────────
    async transition dispute_pool(public pool_id: field) -> Future {
        return finalize_dispute_pool(pool_id);
    }

    async function finalize_dispute_pool(public pool_id: field) {
        let pool: Pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 2u8);

        // Must be within dispute window
        assert(block.height as u64 < pool.resolved_at + DISPUTE_WINDOW_BLOCKS);

        pool.status = 3u8;

        let current_disputes: u64 = Mapping::get(dispute_count, pool_id);
        Mapping::set(dispute_count, pool_id, current_disputes + 1u64);
        Mapping::set(pools, pool_id, pool);
    }

    // ─── 11. refund_prediction (native ALEO — user self-refund) ─────────────
    async transition refund_prediction(
        prediction: Prediction
    ) -> (Prediction, credits.aleo/credits, Future) {
        assert_eq(prediction.claimed, false);
        assert_eq(prediction.token_id, 0field);

        let refunded: Prediction = Prediction {
            id: prediction.id,
            owner: prediction.owner,
            pool_id: prediction.pool_id,
            option: prediction.option,
            amount: prediction.amount,
            claimed: true,
            token_id: prediction.token_id,
        };

        let (refund_credits, transfer_fut): (credits.aleo/credits, Future) =
            credits.aleo/transfer_public_to_private(prediction.owner, prediction.amount);

        return (refunded, refund_credits, finalize_refund_prediction(
            transfer_fut, prediction.pool_id, prediction.id
        ));
    }

    async function finalize_refund_prediction(
        transfer_fut: Future, pool_id: field, prediction_id: field
    ) {
        transfer_fut.await();

        let pool: Pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 4u8);

        let already_claimed: bool = Mapping::contains(claims, prediction_id);
        assert(!already_claimed);
        Mapping::set(claims, prediction_id, true);
    }

    // ─── 12. refund_prediction_token (ARC-21 — admin relay) ─────────────────
    async transition refund_pred_token(
        admin_token: token_registry.aleo/Token,
        prediction: Prediction
    ) -> (Prediction, token_registry.aleo/Token, token_registry.aleo/Token, Future) {
        assert_eq(self.caller, ADMIN);
        assert_eq(prediction.claimed, false);
        assert_neq(prediction.token_id, 0field);

        let refunded: Prediction = Prediction {
            id: prediction.id,
            owner: prediction.owner,
            pool_id: prediction.pool_id,
            option: prediction.option,
            amount: prediction.amount,
            claimed: true,
            token_id: prediction.token_id,
        };

        let amount_u128: u128 = prediction.amount as u128;
        let (remaining_admin, user_tokens, transfer_fut):
            (token_registry.aleo/Token, token_registry.aleo/Token, Future) =
            token_registry.aleo/transfer_private(prediction.owner, amount_u128, admin_token);

        return (refunded, remaining_admin, user_tokens,
            finalize_refund_pred_token(transfer_fut, prediction.pool_id, prediction.id));
    }

    async function finalize_refund_pred_token(
        transfer_fut: Future, pool_id: field, prediction_id: field
    ) {
        transfer_fut.await();

        let pool: Pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 4u8);

        let already_claimed: bool = Mapping::contains(claims, prediction_id);
        assert(!already_claimed);
        Mapping::set(claims, prediction_id, true);
    }

    // ─── Helper ─────────────────────────────────────────────────────────────
    function calculate_winnings(amount_staked: u64, total_staked: u64, total_winning_stakes: u64) -> u64 {
        if total_winning_stakes == 0u64 {
            return 0u64;
        }
        return (amount_staked * total_staked) / total_winning_stakes;
    }
}
