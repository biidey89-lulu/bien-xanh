import { supabase } from "../supabaseClient";

export const MAX_SEA_BOTTLES = 5;

export async function pruneOldBottles(maxBottles = MAX_SEA_BOTTLES) {
  const safeMax = Math.max(1, Number(maxBottles) || MAX_SEA_BOTTLES);

  const { count, error: countError } = await supabase
    .from("bottles")
    .select("id", { count: "exact", head: true });

  if (countError || typeof count !== "number") {
    return 0;
  }

  const overflowCount = count - safeMax;
  if (overflowCount <= 0) {
    return 0;
  }

  const { data: oldestRows, error: selectError } = await supabase
    .from("bottles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(overflowCount);

  if (selectError || !oldestRows || oldestRows.length === 0) {
    return 0;
  }

  const idsToDelete = oldestRows.map((row) => row.id).filter(Boolean);
  if (idsToDelete.length === 0) {
    return 0;
  }

  const { error: deleteError } = await supabase
    .from("bottles")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    return 0;
  }

  return idsToDelete.length;
}