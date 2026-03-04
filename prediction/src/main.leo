import credits.aleo;

// The 'prediction' program.
program manifoldpredictionv4.aleo {
    // A simple token structure to represent prediction pools
    struct Pool {
     id: field,
     title: field,
     description: field,
     options: [field; 2], // e.g., ["Yes", "No"]
     deadline: u64, // Unix timestamp when predictions close
     status: u8, // status of the pool 0 - open 1 closed 2 resolved
     winning_option: u64, // Index of winning option (0 - unresolved, 1 - option 1 wins, 2 - option 2 wins)
     total_staked: u64, // Total amount staked across all options
     option_a_stakes: u64, // Total stakes for option A
     option_b_stakes: u64, // Total stakes for option B
     total_no_of_stakes: u64, // Total number of stakes placed
     total_no_of_stakes_option_a: u64, // Total number of stakes for option A
     total_no_of_stakes_option_b: u64, // Total number of stakes for option
    }

    struct Default {
        id: u32
    }

    // A structure to represent user predictions
    record Prediction {
        id: field,
        owner: address,
        pool_id: field,
        option: u64,
        amount: u64,
        claimed: bool,
    }

    record Winnings {
        prediction_id: field,
        owner: address,
        amount_won: u64,
    }

    // Save pool in public storage.
    mapping pools: field => Pool; // pool id => Pool details
    storage pools_id: [field]; // list of pool ids

    // Track total predictions per pool
    mapping total_predictions: field => u64; // pool id => total predictions count

    // Track user predictions
    storage user_predictions: [field]; // user address => prediction ids

    // Prevent double-betting with the same prediction ID
    mapping commitments: field => field; // prediction_id => pool_id

    const ADMIN: address = aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd;

    @admin(address="aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd")
    async constructor() {}

    async transition initialize() -> Future {
        return finalize_initialize(self.caller);
    }

    async function finalize_initialize(owner: address) {
        let def: Default = Default {
            id: 1
        };
    }

    transition main() {}

    async transition create_pool(public title: field, public description: field, public options: [field; 2], public deadline: u64) -> (Pool, Future) {
      // generate new pool id
        let id: field = BHP256::hash_to_field(title);

        // Ensure the caller for pool creation is the admin.
        assert_eq(self.caller, ADMIN);
        // Return a new 'Pool' record for the auction bidder.
        let pool = Pool {
            id: id,
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
        };

        return (pool, finalize_create_pool(id, pool));
    }

    async function finalize_create_pool(
        public id: field, public pool: Pool
    ) {
        Mapping::set(total_predictions, id, 0u64);
        Mapping::set(pools, id, pool);
        pools_id.push(id);
    }

    // Transition to lock a prediction pool (prevent further predictions).
    async transition lock_pool (public id: field) -> Future {
        // Ensure the caller for pool creation is the admin.
        assert_eq(self.caller, ADMIN);

        return finalize_lock_pool(id);
    }

    async function finalize_lock_pool(
        public id: field
    ) {
        let pool = Mapping::get(pools, id);
        pool.status = 1u8;
        Mapping::set(pools, id, pool);
    }

    // Transition to resolve a prediction pool (set the winning option).
    async transition resolve_pool(public id: field, public winning_option: u64) -> Future {
        // Ensure the caller for pool resolution is the admin.
        assert_eq(self.caller, ADMIN);

        return finalize_resolve_pool(id, winning_option);
    }

    async function finalize_resolve_pool(
        public id: field,
        public winning_option: u64
    ) {
        let pool = Mapping::get(pools, id);
        pool.winning_option = winning_option; // Set the winning option
        pool.status = 2u8; // Mark as resolved
        Mapping::set(pools, id, pool);
    }

    // User makes a prediction by staking tokens via credits.aleo/transfer_private
    // Privacy: amount, option, and per-option stakes are NOT published on-chain.
    // The Oracle tracks predictions off-chain and reveals aggregates after deadline.
    async transition predict(
        pool_id: field,
        option: u64,
        amount: u64,
        random_number: u64,
        user_credit: credits.aleo/credits
    ) -> (Prediction, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(option == 1u64 || option == 2u64); // 1 - option 1, 2 - option 2
        assert_neq(amount, 0u64); // amount should be greater than 0

        let prediction_id = BHP256::hash_to_field(random_number); // generate prediction id

        let prediction = Prediction {
            id: prediction_id,
            owner: self.caller,
            pool_id: pool_id,
            option: option,
            amount: amount,
            claimed: false,
        };

        // Transfer credits from user to admin via credits.aleo
        let (remaining, admin_credits): (credits.aleo/credits, credits.aleo/credits) = credits.aleo/transfer_private(user_credit, ADMIN, amount);

        return (prediction, remaining, admin_credits, finalize_predict(pool_id, prediction_id));
    }

    async function finalize_predict(
        pool_id: field, prediction_id: field
    ) {
        let pool_created = Mapping::contains(pools, pool_id);
        assert(pool_created); // ensure pool exists

        let pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 0u8);  // ensure pool is open
        assert(pool.deadline > block.timestamp as u64); // ensure deadline not passed

        // Ensure prediction ID is unique (prevent double-betting)
        let already_committed = Mapping::contains(commitments, prediction_id);
        assert(!already_committed);
        Mapping::set(commitments, prediction_id, pool_id);

        // Increment prediction counter only — no stakes touch public state
        let current_total = Mapping::get(total_predictions, pool_id);
        Mapping::set(total_predictions, pool_id, current_total + 1u64);
    }

    // User-driven reveal: each user reveals their own prediction after pool locks.
    // No admin involvement — only the Prediction record holder can call this.
    // The record is cryptographically owned, so it can't be forged or revealed by others.
    async transition reveal_prediction(
        prediction: Prediction
    ) -> (Prediction, Future) {
        let revealed = Prediction {
            id: prediction.id,
            owner: prediction.owner,
            pool_id: prediction.pool_id,
            option: prediction.option,
            amount: prediction.amount,
            claimed: prediction.claimed,
        };
        return (revealed, finalize_reveal_prediction(
            prediction.pool_id, prediction.id, prediction.option, prediction.amount
        ));
    }

    async function finalize_reveal_prediction(
        pool_id: field, prediction_id: field, option: u64, amount: u64
    ) {
        let committed_pool = Mapping::get(commitments, prediction_id);
        assert_eq(committed_pool, pool_id); // commitment must match this pool
        assert_neq(committed_pool, 0field); // not already revealed (0field = sentinel for revealed)

        let pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 1u8); // pool must be locked

        assert(option == 1u64 || option == 2u64);

        // Accumulate stakes on-chain — trustlessly, from each user's own record
        // Leo requires ternary instead of if/else for reassignment in async functions
        let new_option_a: u64 = option == 1u64 ? pool.option_a_stakes + amount : pool.option_a_stakes;
        let new_option_b: u64 = option == 2u64 ? pool.option_b_stakes + amount : pool.option_b_stakes;

        let updated_pool = Pool {
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
        };
        Mapping::set(pools, pool_id, updated_pool);
        Mapping::set(commitments, prediction_id, 0field); // sentinel = revealed
    }

    // User checks if their prediction was correct
    async transition check_prediction (prediction: Prediction) -> (Future) {
        return finalize_check_prediction(prediction.pool_id, prediction.option);
    }

    async function finalize_check_prediction (
        pool_id: field, user_option: u64
    )  {
        let pool_created = Mapping::contains(pools, pool_id);
        assert(pool_created); // ensure pool exists

        let pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 2u8);  // ensure pool is resolved

        assert_eq(pool.winning_option, user_option); // check if user's option matches winning option
    }

    // Winner collects winnings via credits.aleo/transfer_private
    async transition collect_winnings (
        winning_option: u64,
        total_staked: u64,
        option_a_stakes: u64,
        option_b_stakes: u64,
        admin_credit: credits.aleo/credits,
        prediction: Prediction
    ) -> (Prediction, credits.aleo/credits, credits.aleo/credits, Future) {
        // Check if user won
        assert_eq(winning_option, prediction.option);
        // Check if already claimed
        assert_eq(prediction.claimed, false);
        let winnings_amount: u64 = 0u64;
        if winning_option == 1u64 {
            assert(option_a_stakes > 0u64);
            winnings_amount = calculate_winnings(prediction.amount, total_staked, option_a_stakes);
        } else if winning_option == 2u64 {
            assert(option_b_stakes > 0u64);
            winnings_amount = calculate_winnings(prediction.amount, total_staked, option_b_stakes);
        }

        let updated_prediction = Prediction {
            id: prediction.id,
            owner: prediction.owner,
            pool_id: prediction.pool_id,
            option: prediction.option,
            amount: winnings_amount,
            claimed: true,
        };

        // Transfer winnings from admin to user via credits.aleo
        let (updated_admin, user_winnings): (credits.aleo/credits, credits.aleo/credits) = credits.aleo/transfer_private(admin_credit, prediction.owner, winnings_amount);

        return (updated_prediction, updated_admin, user_winnings, finalize_collect_winnings(prediction.pool_id, prediction.id, prediction.amount, winning_option, total_staked, option_a_stakes, option_b_stakes));
    }

    async function finalize_collect_winnings (pool_id: field, prediction_id: field, amount: u64, winning_option: u64, total_staked: u64,
        option_a_stakes: u64,
        option_b_stakes: u64)  {
        let pool_created = Mapping::contains(pools, pool_id);
        assert(pool_created); // ensure pool exists

        let pool = Mapping::get(pools, pool_id);
        assert_eq(pool.status, 2u8);  // ensure pool is resolved
        assert_eq(pool.winning_option, winning_option); // ensure the winning option matches
        assert_eq(pool.total_staked, total_staked); // ensure total staked matches
        assert_eq(pool.option_a_stakes, option_a_stakes); // ensure option a stakes matches
        assert_eq(pool.option_b_stakes, option_b_stakes); // ensure option b

        // Require that the prediction was revealed (commitment == 0field sentinel)
        let commitment_val = Mapping::get(commitments, prediction_id);
        assert_eq(commitment_val, 0field); // must have revealed before claiming
    }

    // helper function to calculate winnings
    function calculate_winnings(amount_staked: u64, total_staked: u64, total_winning_stakes: u64) -> u64  {
        if total_winning_stakes == 0u64 {
            return 0u64;
        }
        return (amount_staked * total_staked) / total_winning_stakes;
    }

}
