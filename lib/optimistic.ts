// Shared shape for the "update an existing row" optimistic mutations: apply the
// optimistic row, run the DB write, and roll back (guarded) if it fails or RLS
// silently denies it (0 rows, no error). The dispatch sequence is identical to
// the hand-rolled version each mutation used before, so behavior is unchanged.

import type { Action, RowOf, TableKey } from "./store";

// Supabase `.update(...).select("id")` resolves to rows + error. We only care
// whether at least one row came back (a denied update "succeeds" with 0 rows).
type WriteResult = { data: unknown[] | null; error: unknown };

export async function optimisticUpdate<K extends TableKey>(params: {
  table: K;
  id: string;
  optimistic: RowOf[K];
  original: RowOf[K];
  dispatch: (action: Action) => void;
  run: () => PromiseLike<WriteResult>;
  onError: () => void;
}): Promise<boolean> {
  const { table, id, optimistic, original, dispatch, run, onError } = params;
  dispatch({ type: "upsert", table, row: optimistic });
  const { data, error } = await run();
  if (error || !data?.length) {
    dispatch({ type: "rollback", table, id, ifCurrentIs: optimistic, row: original });
    onError();
    return false;
  }
  return true;
}
