import { supabase } from "../supabaseClient";

export async function ensurePlayerSession() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session?.user) {
    return sessionData.session.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("[shellAuthService] signInAnonymously error:", error);
    return null;
  }
  return data?.user ?? null;
}

export async function fetchMyShells(initialShells = 0) {
  const user = await ensurePlayerSession();
  if (!user) return { user: null, shells: 0, lastDailyClaimDay: null };

  const { data, error } = await supabase.rpc("init_my_shells", {
    p_initial_shells: initialShells,
  });

  if (error) {
    console.error("[shellAuthService] init_my_shells error:", error);
    return { user, shells: 0, lastDailyClaimDay: null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    user,
    shells: row?.shells ?? 0,
    lastDailyClaimDay: row?.last_daily_claim_day ?? null,
  };
}

export async function claimDailyShells(dayKey, reward = 5) {
  await ensurePlayerSession();
  const { data, error } = await supabase.rpc("adjust_my_shells", {
    p_delta: reward,
    p_day_key: dayKey,
    p_max_step: 50,
  });

  if (error) {
    console.error("[shellAuthService] claimDailyShells error:", error);
    return null;
  }
  return data;
}

export async function changeShells(delta, maxStep = 100) {
  await ensurePlayerSession();
  const { data, error } = await supabase.rpc("adjust_my_shells", {
    p_delta: delta,
    p_day_key: null,
    p_max_step: maxStep,
  });

  if (error) {
    console.error("[shellAuthService] changeShells error:", error);
    return null;
  }
  return data;
}

export async function linkEmailAccount(email, password) {
  const currentUser = await ensurePlayerSession();
  if (!currentUser) return { error: new Error("Không khởi tạo được phiên chơi") };

  const { data, error } = await supabase.auth.updateUser({
    email: email.trim(),
    password,
  });

  return { data, error };
}

export async function loginWithEmail(email, password) {
  const { data: beforeSession } = await supabase.auth.getSession();
  const tempAnonId = beforeSession?.session?.user?.is_anonymous
    ? beforeSession.session.user.id
    : null;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) return { data: null, error };

  if (tempAnonId && data?.user?.id && tempAnonId !== data.user.id) {
    await supabase.rpc("merge_shells_from_user", {
      p_source_user_id: tempAnonId,
    });
  }

  const refreshed = await fetchMyShells(0);
  return { data: refreshed, error: null };
}