import credits.aleo;
import token_registry.aleo;
program manifoldpredictionv5.aleo;

record Prediction:
    owner as address.private;
    id as field.private;
    pool_id as field.private;
    option as u64.private;
    amount as u64.private;
    claimed as boolean.private;
    token_id as field.private;

struct Pool:
    id as field;
    title as field;
    description as field;
    options as [field; 2u32];
    deadline as u64;
    status as u8;
    winning_option as u64;
    total_staked as u64;
    option_a_stakes as u64;
    option_b_stakes as u64;
    total_no_of_stakes as u64;
    total_no_of_stakes_option_a as u64;
    total_no_of_stakes_option_b as u64;
    token_id as field;
    resolved_at as u64;

struct TokenMetadata:
    token_id as field;
    name as u128;
    symbol as u128;
    decimals as u8;
    supply as u128;
    max_supply as u128;
    admin as address;
    external_authorization_required as boolean;
    external_authorization_party as address;

struct TokenOwner:
    account as address;
    token_id as field;

mapping pools:
    key as field.public;
    value as Pool.public;

mapping total_predictions:
    key as field.public;
    value as u64.public;

mapping commitments:
    key as field.public;
    value as field.public;

mapping claims:
    key as field.public;
    value as boolean.public;

mapping dispute_count:
    key as field.public;
    value as u64.public;

mapping pool_balance:
    key as field.public;
    value as u64.public;

mapping pools_id__:
    key as u32.public;
    value as field.public;

mapping pools_id__len__:
    key as boolean.public;
    value as u32.public;

mapping user_predictions__:
    key as u32.public;
    value as field.public;

mapping user_predictions__len__:
    key as boolean.public;
    value as u32.public;

function create_pool:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as [field; 2u32].public;
    input r3 as u64.public;
    input r4 as field.public;
    assert.eq self.caller aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd;
    hash.bhp256 r0 into r5 as field;
    cast r5 r0 r1 r2 r3 0u8 0u64 0u64 0u64 0u64 0u64 0u64 0u64 r4 0u64 into r6 as Pool;
    async create_pool r5 r6 into r7;
    output r6 as Pool.private;
    output r7 as manifoldpredictionv5.aleo/create_pool.future;

finalize create_pool:
    input r0 as field.public;
    input r1 as Pool.public;
    set 0u64 into total_predictions[r0];
    set r1 into pools[r0];
    set 0u64 into pool_balance[r0];
    set 0u64 into dispute_count[r0];
    get.or_use pools_id__len__[false] 0u32 into r2;
    add r2 1u32 into r3;
    set r3 into pools_id__len__[false];
    set r0 into pools_id__[r2];

function lock_pool:
    input r0 as field.public;
    assert.eq self.caller aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd;
    async lock_pool r0 into r1;
    output r1 as manifoldpredictionv5.aleo/lock_pool.future;

finalize lock_pool:
    input r0 as field.public;
    get pools[r0] into r1;
    cast r1.id r1.title r1.description r1.options r1.deadline 1u8 r1.winning_option r1.total_staked r1.option_a_stakes r1.option_b_stakes r1.total_no_of_stakes r1.total_no_of_stakes_option_a r1.total_no_of_stakes_option_b r1.token_id r1.resolved_at into r2 as Pool;
    set r2 into pools[r0];

function resolve_pool:
    input r0 as field.public;
    input r1 as u64.public;
    assert.eq self.caller aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd;
    async resolve_pool r0 r1 into r2;
    output r2 as manifoldpredictionv5.aleo/resolve_pool.future;

finalize resolve_pool:
    input r0 as field.public;
    input r1 as u64.public;
    get pools[r0] into r2;
    cast block.height into r3 as u64;
    cast r2.id r2.title r2.description r2.options r2.deadline 2u8 r1 r2.total_staked r2.option_a_stakes r2.option_b_stakes r2.total_no_of_stakes r2.total_no_of_stakes_option_a r2.total_no_of_stakes_option_b r2.token_id r3 into r4 as Pool;
    set r4 into pools[r0];

function cancel_pool:
    input r0 as field.public;
    assert.eq self.caller aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd;
    async cancel_pool r0 into r1;
    output r1 as manifoldpredictionv5.aleo/cancel_pool.future;

finalize cancel_pool:
    input r0 as field.public;
    get pools[r0] into r1;
    is.eq r1.status 3u8 into r2;
    assert.eq r2 true;
    cast r1.id r1.title r1.description r1.options r1.deadline 4u8 r1.winning_option r1.total_staked r1.option_a_stakes r1.option_b_stakes r1.total_no_of_stakes r1.total_no_of_stakes_option_a r1.total_no_of_stakes_option_b r1.token_id r1.resolved_at into r3 as Pool;
    set r3 into pools[r0];

function predict:
    input r0 as field.private;
    input r1 as u64.private;
    input r2 as u64.private;
    input r3 as u64.private;
    input r4 as credits.aleo/credits.record;
    is.eq r1 1u64 into r5;
    is.eq r1 2u64 into r6;
    or r5 r6 into r7;
    assert.eq r7 true;
    assert.neq r2 0u64;
    hash.bhp256 r3 into r8 as field;
    cast self.caller r8 r0 r1 r2 false 0field into r9 as Prediction.record;
    call credits.aleo/transfer_private_to_public r4 manifoldpredictionv5.aleo r2 into r10 r11;
    async predict r11 r0 r8 r2 into r12;
    output r9 as Prediction.record;
    output r10 as credits.aleo/credits.record;
    output r12 as manifoldpredictionv5.aleo/predict.future;

finalize predict:
    input r0 as credits.aleo/transfer_private_to_public.future;
    input r1 as field.public;
    input r2 as field.public;
    input r3 as u64.public;
    await r0;
    contains pools[r1] into r4;
    assert.eq r4 true;
    get pools[r1] into r5;
    assert.eq r5.status 0u8;
    assert.eq r5.token_id 0field;
    cast block.timestamp into r6 as u64;
    gt r5.deadline r6 into r7;
    assert.eq r7 true;
    contains commitments[r2] into r8;
    not r8 into r9;
    assert.eq r9 true;
    set r1 into commitments[r2];
    get total_predictions[r1] into r10;
    add r10 1u64 into r11;
    set r11 into total_predictions[r1];
    get pool_balance[r1] into r12;
    add r12 r3 into r13;
    set r13 into pool_balance[r1];

function predict_with_token:
    input r0 as field.private;
    input r1 as u64.private;
    input r2 as u64.private;
    input r3 as u64.private;
    input r4 as token_registry.aleo/Token.record;
    is.eq r1 1u64 into r5;
    is.eq r1 2u64 into r6;
    or r5 r6 into r7;
    assert.eq r7 true;
    assert.neq r2 0u64;
    hash.bhp256 r3 into r8 as field;
    cast self.caller r8 r0 r1 r2 false r4.token_id into r9 as Prediction.record;
    cast r2 into r10 as u128;
    call token_registry.aleo/transfer_private aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd r10 r4 into r11 r12 r13;
    async predict_with_token r13 r0 r8 r2 r4.token_id into r14;
    output r9 as Prediction.record;
    output r11 as token_registry.aleo/Token.record;
    output r12 as token_registry.aleo/Token.record;
    output r14 as manifoldpredictionv5.aleo/predict_with_token.future;

finalize predict_with_token:
    input r0 as token_registry.aleo/transfer_private.future;
    input r1 as field.public;
    input r2 as field.public;
    input r3 as u64.public;
    input r4 as field.public;
    await r0;
    contains pools[r1] into r5;
    assert.eq r5 true;
    get pools[r1] into r6;
    assert.eq r6.status 0u8;
    assert.eq r6.token_id r4;
    cast block.timestamp into r7 as u64;
    gt r6.deadline r7 into r8;
    assert.eq r8 true;
    contains commitments[r2] into r9;
    not r9 into r10;
    assert.eq r10 true;
    set r1 into commitments[r2];
    get total_predictions[r1] into r11;
    add r11 1u64 into r12;
    set r12 into total_predictions[r1];
    get pool_balance[r1] into r13;
    add r13 r3 into r14;
    set r14 into pool_balance[r1];

function reveal_prediction:
    input r0 as Prediction.record;
    cast r0.owner r0.id r0.pool_id r0.option r0.amount r0.claimed r0.token_id into r1 as Prediction.record;
    async reveal_prediction r0.pool_id r0.id r0.option r0.amount into r2;
    output r1 as Prediction.record;
    output r2 as manifoldpredictionv5.aleo/reveal_prediction.future;

finalize reveal_prediction:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as u64.public;
    get commitments[r1] into r4;
    assert.eq r4 r0;
    assert.neq r4 0field;
    get pools[r0] into r5;
    assert.eq r5.status 1u8;
    is.eq r2 1u64 into r6;
    is.eq r2 2u64 into r7;
    or r6 r7 into r8;
    assert.eq r8 true;
    add r5.option_a_stakes r3 into r9;
    ternary r6 r9 r5.option_a_stakes into r10;
    add r5.option_b_stakes r3 into r11;
    ternary r7 r11 r5.option_b_stakes into r12;
    add r5.total_staked r3 into r13;
    cast r5.id r5.title r5.description r5.options r5.deadline r5.status r5.winning_option r13 r10 r12 r5.total_no_of_stakes r5.total_no_of_stakes_option_a r5.total_no_of_stakes_option_b r5.token_id r5.resolved_at into r14 as Pool;
    set r14 into pools[r0];
    set 0field into commitments[r1];

closure calculate_winnings:
    input r0 as u64;
    input r1 as u64;
    input r2 as u64;
    is.eq r2 0u64 into r3;
    mul r0 r1 into r4;
    div r4 r2 into r5;
    ternary r3 0u64 r5 into r6;
    output r6 as u64;

function collect_winnings:
    input r0 as u64.private;
    input r1 as u64.private;
    input r2 as u64.private;
    input r3 as u64.private;
    input r4 as Prediction.record;
    assert.eq r0 r4.option;
    assert.eq r4.claimed false;
    assert.eq r4.token_id 0field;
    is.eq r0 1u64 into r5;
    gt r2 0u64 into r6;
    not r5 into r7;
    or r6 r7 into r8;
    assert.eq r8 true;
    call calculate_winnings r4.amount r1 r2 into r9;
    is.eq r0 2u64 into r10;
    gt r3 0u64 into r11;
    and r7 r10 into r12;
    not r12 into r13;
    or r11 r13 into r14;
    assert.eq r14 true;
    call calculate_winnings r4.amount r1 r3 into r15;
    ternary r10 r15 0u64 into r16;
    ternary r5 r9 r16 into r17;
    mul r17 200u64 into r18;
    div r18 10000u64 into r19;
    sub r17 r19 into r20;
    cast r4.owner r4.id r4.pool_id r4.option r20 true r4.token_id into r21 as Prediction.record;
    call credits.aleo/transfer_public_to_private r4.owner r20 into r22 r23;
    async collect_winnings r23 r4.pool_id r4.id r0 r1 r2 r3 into r24;
    output r21 as Prediction.record;
    output r22 as credits.aleo/credits.record;
    output r24 as manifoldpredictionv5.aleo/collect_winnings.future;

finalize collect_winnings:
    input r0 as credits.aleo/transfer_public_to_private.future;
    input r1 as field.public;
    input r2 as field.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as u64.public;
    input r6 as u64.public;
    await r0;
    get pools[r1] into r7;
    assert.eq r7.status 2u8;
    assert.eq r7.winning_option r3;
    assert.eq r7.total_staked r4;
    assert.eq r7.option_a_stakes r5;
    assert.eq r7.option_b_stakes r6;
    cast block.height into r8 as u64;
    add r7.resolved_at 2880u64 into r9;
    gte r8 r9 into r10;
    assert.eq r10 true;
    get commitments[r2] into r11;
    assert.eq r11 0field;
    contains claims[r2] into r12;
    not r12 into r13;
    assert.eq r13 true;
    set true into claims[r2];

function collect_winnings_token:
    input r0 as u64.private;
    input r1 as u64.private;
    input r2 as u64.private;
    input r3 as u64.private;
    input r4 as token_registry.aleo/Token.record;
    input r5 as Prediction.record;
    assert.eq self.caller aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd;
    assert.eq r0 r5.option;
    assert.eq r5.claimed false;
    assert.neq r5.token_id 0field;
    is.eq r0 1u64 into r6;
    gt r2 0u64 into r7;
    not r6 into r8;
    or r7 r8 into r9;
    assert.eq r9 true;
    call calculate_winnings r5.amount r1 r2 into r10;
    is.eq r0 2u64 into r11;
    gt r3 0u64 into r12;
    and r8 r11 into r13;
    not r13 into r14;
    or r12 r14 into r15;
    assert.eq r15 true;
    call calculate_winnings r5.amount r1 r3 into r16;
    ternary r11 r16 0u64 into r17;
    ternary r6 r10 r17 into r18;
    mul r18 200u64 into r19;
    div r19 10000u64 into r20;
    sub r18 r20 into r21;
    cast r5.owner r5.id r5.pool_id r5.option r21 true r5.token_id into r22 as Prediction.record;
    cast r21 into r23 as u128;
    call token_registry.aleo/transfer_private r5.owner r23 r4 into r24 r25 r26;
    async collect_winnings_token r26 r5.pool_id r5.id r0 r1 r2 r3 into r27;
    output r22 as Prediction.record;
    output r24 as token_registry.aleo/Token.record;
    output r25 as token_registry.aleo/Token.record;
    output r27 as manifoldpredictionv5.aleo/collect_winnings_token.future;

finalize collect_winnings_token:
    input r0 as token_registry.aleo/transfer_private.future;
    input r1 as field.public;
    input r2 as field.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as u64.public;
    input r6 as u64.public;
    await r0;
    get pools[r1] into r7;
    assert.eq r7.status 2u8;
    assert.eq r7.winning_option r3;
    assert.eq r7.total_staked r4;
    assert.eq r7.option_a_stakes r5;
    assert.eq r7.option_b_stakes r6;
    cast block.height into r8 as u64;
    add r7.resolved_at 2880u64 into r9;
    gte r8 r9 into r10;
    assert.eq r10 true;
    get commitments[r2] into r11;
    assert.eq r11 0field;
    contains claims[r2] into r12;
    not r12 into r13;
    assert.eq r13 true;
    set true into claims[r2];

function dispute_pool:
    input r0 as field.public;
    async dispute_pool r0 into r1;
    output r1 as manifoldpredictionv5.aleo/dispute_pool.future;

finalize dispute_pool:
    input r0 as field.public;
    get pools[r0] into r1;
    assert.eq r1.status 2u8;
    cast block.height into r2 as u64;
    add r1.resolved_at 2880u64 into r3;
    lt r2 r3 into r4;
    assert.eq r4 true;
    get dispute_count[r0] into r5;
    add r5 1u64 into r6;
    set r6 into dispute_count[r0];
    cast r1.id r1.title r1.description r1.options r1.deadline 3u8 r1.winning_option r1.total_staked r1.option_a_stakes r1.option_b_stakes r1.total_no_of_stakes r1.total_no_of_stakes_option_a r1.total_no_of_stakes_option_b r1.token_id r1.resolved_at into r7 as Pool;
    set r7 into pools[r0];

function refund_prediction:
    input r0 as Prediction.record;
    assert.eq r0.claimed false;
    assert.eq r0.token_id 0field;
    cast r0.owner r0.id r0.pool_id r0.option r0.amount true r0.token_id into r1 as Prediction.record;
    call credits.aleo/transfer_public_to_private r0.owner r0.amount into r2 r3;
    async refund_prediction r3 r0.pool_id r0.id into r4;
    output r1 as Prediction.record;
    output r2 as credits.aleo/credits.record;
    output r4 as manifoldpredictionv5.aleo/refund_prediction.future;

finalize refund_prediction:
    input r0 as credits.aleo/transfer_public_to_private.future;
    input r1 as field.public;
    input r2 as field.public;
    await r0;
    get pools[r1] into r3;
    assert.eq r3.status 4u8;
    contains claims[r2] into r4;
    not r4 into r5;
    assert.eq r5 true;
    set true into claims[r2];

function refund_pred_token:
    input r0 as token_registry.aleo/Token.record;
    input r1 as Prediction.record;
    assert.eq self.caller aleo12zz8gkxwgnqfhyaryyauvvsyvw0mnfzs2eu6scrt5jsv2f9klqxqcsa9sd;
    assert.eq r1.claimed false;
    assert.neq r1.token_id 0field;
    cast r1.owner r1.id r1.pool_id r1.option r1.amount true r1.token_id into r2 as Prediction.record;
    cast r1.amount into r3 as u128;
    call token_registry.aleo/transfer_private r1.owner r3 r0 into r4 r5 r6;
    async refund_pred_token r6 r1.pool_id r1.id into r7;
    output r2 as Prediction.record;
    output r4 as token_registry.aleo/Token.record;
    output r5 as token_registry.aleo/Token.record;
    output r7 as manifoldpredictionv5.aleo/refund_pred_token.future;

finalize refund_pred_token:
    input r0 as token_registry.aleo/transfer_private.future;
    input r1 as field.public;
    input r2 as field.public;
    await r0;
    get pools[r1] into r3;
    assert.eq r3.status 4u8;
    contains claims[r2] into r4;
    not r4 into r5;
    assert.eq r5 true;
    set true into claims[r2];

constructor:
    assert.eq edition 0u16;
