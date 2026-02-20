// Program ID - deployed version
const PROGRAM_ID = 'predictionprivacyhackviii.aleo';

// Network API - using testnet endpoint
const NETWORK_URL = 'https://api.explorer.provable.com/v1/testnet';

// Pool structure matching the Leo program
export interface AleoPool {
  id: string;
  title: string;
  description: string;
  options: [string, string];
  deadline: number;
  status: number; // 0 - open, 1 - closed, 2 - resolved
  winning_option: number;
  total_staked: number;
  option_a_stakes: number;
  option_b_stakes: number;
  total_no_of_stakes: number;
  total_no_of_stakes_option_a: number;
  total_no_of_stakes_option_b: number;
}

// Parse Aleo field value to string (removes 'field' suffix)
function parseField(value: string): string {
  if (!value) return '';
  return value.replace('field', '').replace('.public', '').replace('.private', '').trim();
}

// Parse Aleo u64 value to number
function parseU64(value: string): number {
  if (!value) return 0;
  return parseInt(value.replace('u64', '').replace('.public', '').replace('.private', '').trim(), 10) || 0;
}

// Parse Aleo u8 value to number
function parseU8(value: string): number {
  if (!value) return 0;
  return parseInt(value.replace('u8', '').replace('.public', '').replace('.private', '').trim(), 10) || 0;
}

// Parse pool struct from Aleo response
function parsePoolStruct(data: Record<string, any>): AleoPool | null {
  try {
    // Handle array options
    let options: [string, string] = ['', ''];
    if (data.options) {
      if (Array.isArray(data.options)) {
        options = [parseField(data.options[0]), parseField(data.options[1])];
      } else if (typeof data.options === 'string') {
        // Parse array string format: [123field, 456field]
        const match = data.options.match(/\[(.*?)\]/);
        if (match) {
          const parts = match[1].split(',').map((s: string) => s.trim());
          options = [parseField(parts[0]), parseField(parts[1])];
        }
      }
    }

    return {
      id: parseField(data.id),
      title: parseField(data.title),
      description: parseField(data.description),
      options,
      deadline: parseU64(data.deadline),
      status: parseU8(data.status),
      winning_option: parseU64(data.winning_option),
      total_staked: parseU64(data.total_staked),
      option_a_stakes: parseU64(data.option_a_stakes),
      option_b_stakes: parseU64(data.option_b_stakes),
      total_no_of_stakes: parseU64(data.total_no_of_stakes),
      total_no_of_stakes_option_a: parseU64(data.total_no_of_stakes_option_a),
      total_no_of_stakes_option_b: parseU64(data.total_no_of_stakes_option_b),
    };
  } catch (error) {
    console.error('Error parsing pool struct:', error);
    return null;
  }
}

// Parse pool string response to object
function parsePoolResponse(response: string): AleoPool | null {
  try {
    // The response is in Aleo struct format, we need to parse it
    // Example: { id: 123field, title: 456field, ... }
    const content = response.trim().slice(1, -1);

    // Parse key-value pairs (handling nested structures)
    const obj: Record<string, string> = {};
    let current = '';
    let key = '';
    let depth = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === '[') depth++;
      if (char === ']') depth--;

      if (char === ':' && depth === 0 && !key) {
        key = current.trim();
        current = '';
      } else if (char === ',' && depth === 0) {
        if (key) {
          obj[key] = current.trim();
          key = '';
        }
        current = '';
      } else {
        current += char;
      }
    }

    // Handle last pair
    if (key && current) {
      obj[key] = current.trim();
    }

    return parsePoolStruct(obj);
  } catch (error) {
    console.error('Error parsing pool response:', error);
    return null;
  }
}

// Fetch a mapping value via the Aleo REST API directly
async function getMappingValue(mappingName: string, key: string): Promise<string | null> {
  try {
    const url = `${NETWORK_URL}/program/${PROGRAM_ID}/mapping/${mappingName}/${key}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const text = await response.text();
    // The API returns JSON-encoded strings, strip surrounding quotes
    const value = text.replace(/^"|"$/g, '').trim();
    if (!value || value === 'null') return null;
    return value;
  } catch (error) {
    console.error(`Error fetching mapping value for ${mappingName}[${key}]:`, error);
    return null;
  }
}

// Get program mapping names using REST API
export async function getMappingNames(): Promise<string[]> {
  try {
    const url = `${NETWORK_URL}/program/${PROGRAM_ID}/mappings`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const names = await response.json();
    return names || [];
  } catch (error) {
    console.error('Error fetching mapping names:', error);
    return [];
  }
}

// Get all pool IDs from the pools_id storage
// Storage in Leo is compiled to mappings with u32 indices
export async function getAllPoolIds(): Promise<string[]> {
  const poolIds: string[] = [];

  try {
    // Storage arrays use indices like 0u32, 1u32, etc.
    // Try to fetch pool IDs starting from index 0
    let index = 0;
    const maxPools = 100; // Safety limit

    while (index < maxPools) {
      const key = `${index}u32`;
      const value = await getMappingValue('pools_id', key);

      if (!value || value === 'null') {
        // No more pools
        break;
      }

      // Parse the field value
      const poolId = parseField(value);
      if (poolId) {
        poolIds.push(poolId);
      }

      index++;
    }
  } catch (error) {
    console.error('Error fetching pool IDs:', error);
  }

  return poolIds;
}

// Get a single pool by ID
export async function getPool(poolId: string): Promise<AleoPool | null> {
  try {
    const formattedId = poolId.endsWith('field') ? poolId : `${poolId}field`;

    const result = await getMappingValue('pools', formattedId);

    if (!result || result === 'null') {
      return null;
    }

    return parsePoolResponse(result);
  } catch (error) {
    console.error('Error fetching pool:', error);
    return null;
  }
}

// Get multiple pools by IDs
export async function getPools(poolIds: string[]): Promise<AleoPool[]> {
  const pools: AleoPool[] = [];

  for (const id of poolIds) {
    const pool = await getPool(id);
    if (pool) {
      pools.push(pool);
    }
  }

  return pools;
}

// Get all pools from the program
export async function getAllPools(): Promise<AleoPool[]> {
  try {
    // First get all pool IDs from storage
    const poolIds = await getAllPoolIds();

    if (poolIds.length === 0) {
      console.log('No pool IDs found in storage');
      return [];
    }

    console.log(`Found ${poolIds.length} pool IDs:`, poolIds);

    // Then fetch each pool
    return await getPools(poolIds);
  } catch (error) {
    console.error('Error fetching all pools:', error);
    return [];
  }
}

// Check if a pool exists
export async function poolExists(poolId: string): Promise<boolean> {
  const pool = await getPool(poolId);
  return pool !== null;
}

// Get total predictions for a pool
export async function getTotalPredictions(poolId: string): Promise<number | null> {
  try {
    const formattedId = poolId.endsWith('field') ? poolId : `${poolId}field`;

    const result = await getMappingValue('total_predictions', formattedId);

    if (!result || result === 'null') {
      return null;
    }

    return parseU64(result);
  } catch (error) {
    console.error('Error fetching total predictions:', error);
    return null;
  }
}
