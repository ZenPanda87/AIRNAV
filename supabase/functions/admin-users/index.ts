// Supabase Edge Function "admin-users" — kelola akun & peran (hanya Super Admin; Admin KKS boleh melihat daftar).
// Memakai service role di server; tidak pernah dikirim ke browser.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const ROLES = ["superadmin", "admin_kks", "petugas_k3", "avsec", "inspektur_kampen", "teknik", "operasi", "kepala_unit", "pimpinan"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const URL_ = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const { data: u } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u?.user) return json({ error: "Sesi login tidak valid." }, 401);
    const me = u.user.id;
    const { data: myRoles } = await admin.from("user_roles").select("role").eq("user_id", me);
    const isSuper = (myRoles ?? []).some((r) => r.role === "superadmin");
    const isAdmin = isSuper || (myRoles ?? []).some((r) => r.role === "admin_kks");
    const body = await req.json();

    if (body.action === "list") {
      if (!isAdmin) return json({ error: "Akses ditolak." }, 403);
      const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const [{ data: profs }, { data: roles }] = await Promise.all([
        admin.from("profiles").select("*"), admin.from("user_roles").select("user_id, role, unit_id"),
      ]);
      const users = list.users.map((x) => {
        const p = (profs ?? []).find((y) => y.user_id === x.id) ?? {};
        return { id: x.id, email: x.email, last_sign_in_at: x.last_sign_in_at, full_name: p.full_name, position_title: p.position_title,
          active: p.active !== false, roles: (roles ?? []).filter((r) => r.user_id === x.id).map((r) => ({ role: r.role, unit_id: r.unit_id })) };
      }).sort((a, b) => String(a.full_name ?? a.email).localeCompare(String(b.full_name ?? b.email)));
      return json({ users });
    }

    if (!isSuper) return json({ error: "Hanya Super Admin yang dapat mengubah akun." }, 403);
    if (body.action === "delete") {
      if (!body.user_id || body.user_id === me) return json({ error: "Tidak bisa menghapus akun sendiri." }, 400);
      const { error } = await admin.auth.admin.deleteUser(body.user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }
    const roles = (body.roles ?? []).filter((r: { role: string }) => ROLES.includes(r.role));
    if (!roles.length) return json({ error: "Minimal satu peran yang valid." }, 400);

    let userId = body.user_id as string;
    if (body.action === "create") {
      if (!body.email || !body.password || String(body.password).length < 8) return json({ error: "Email & password (min. 8 karakter) wajib." }, 400);
      const { data, error } = await admin.auth.admin.createUser({ email: body.email, password: body.password, email_confirm: true });
      if (error) return json({ error: /already/i.test(error.message) ? "Email sudah terdaftar." : error.message }, 400);
      userId = data.user.id;
    } else if (body.action === "update") {
      if (!userId) return json({ error: "user_id wajib" }, 400);
      if (userId === me && !roles.some((r: { role: string }) => r.role === "superadmin")) return json({ error: "Tidak bisa melepas peran Super Admin dari akun sendiri." }, 400);
      if (userId === me && body.active === false) return json({ error: "Tidak bisa menonaktifkan akun sendiri." }, 400);
      const patch: Record<string, unknown> = { ban_duration: body.active === false ? "876000h" : "none" };
      if (body.password) {
        if (String(body.password).length < 8) return json({ error: "Password min. 8 karakter." }, 400);
        patch.password = body.password;
      }
      const { error } = await admin.auth.admin.updateUserById(userId, patch);
      if (error) return json({ error: error.message }, 400);
    } else return json({ error: "Aksi tidak dikenal" }, 400);

    const { error: pe } = await admin.from("profiles").upsert({ user_id: userId, full_name: body.full_name || null, position_title: body.position_title || null, active: body.active !== false });
    if (pe) throw pe;
    await admin.from("user_roles").delete().eq("user_id", userId);
    const { error: re } = await admin.from("user_roles").insert(roles.map((r: { role: string; unit_id: string | null }) => ({ user_id: userId, role: r.role, unit_id: r.unit_id || null })));
    if (re) throw re;
    return json({ ok: true, user_id: userId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
