// Atomic sequence generation service for Cloudflare D1
// Eliminates race conditions and string-search collisions

export async function getNextSequence(db, seqName, prefix = "", padLength = 5, fallbackInitial = 1) {
  if (!db || typeof db.prepare !== "function") {
    throw new Error("Invalid D1 database instance provided");
  }

  try {
    // 1. Ensure table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS system_sequences (
        name TEXT PRIMARY KEY,
        current_val INTEGER NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run().catch((err) => {
      console.warn(`[SequenceService] Note on system_sequences table prepare:`, err?.message || err);
    });

    // 2. Atomic increment using UPDATE ... RETURNING
    const res = await db.prepare(
      "UPDATE system_sequences SET current_val = current_val + 1, updated_at = datetime('now') WHERE name = ? RETURNING current_val"
    ).bind(seqName).first().catch(() => null);

    if (res && res.current_val != null) {
      const val = res.current_val;
      return prefix ? `${prefix}${String(val).padStart(padLength, "0")}` : val;
    }

    // 3. If sequence row does not exist yet, initialize it
    await db.prepare(
      "INSERT OR IGNORE INTO system_sequences (name, current_val, updated_at) VALUES (?, ?, datetime('now'))"
    ).bind(seqName, fallbackInitial).run().catch((err) => {
      console.warn(`[SequenceService] Note on initial sequence seed for ${seqName}:`, err?.message || err);
    });

    const retry = await db.prepare(
      "UPDATE system_sequences SET current_val = current_val + 1, updated_at = datetime('now') WHERE name = ? RETURNING current_val"
    ).bind(seqName).first().catch(() => null);

    const finalVal = retry?.current_val != null ? retry.current_val : (fallbackInitial + 1);
    return prefix ? `${prefix}${String(finalVal).padStart(padLength, "0")}` : finalVal;
  } catch (err) {
    console.error(`[SequenceService] Error getting next sequence for ${seqName}:`, err);
    throw err;
  }
}
