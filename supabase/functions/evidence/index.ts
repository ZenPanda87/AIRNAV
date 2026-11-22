// Supabase Edge Function "evidence" — perantara unggah/lihat/hapus evidence ke Google Drive akun kantor.
// Alur: browser (JWT pengguna) → fungsi ini (cek login, hak modul & lokasi via RLS) → Google Apps Script (token rahasia) → Drive.
// Secret yang dibutuhkan (Supabase Dashboard → Edge Functions → Secrets): APPS_SCRIPT_URL, APPS_SCRIPT_TOKEN.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_B64 = 14 * 1024 * 1024; // ±10 MB file
const ENTITIES = new Set([
  "apar", "apar_inspections", "apar_services", "p3k_checks", "patrol_results", "work_permits", "env_measurements", "hiradc",
  "smk3_evaluations", "activities", "rab", "oversight_events", "findings", "finding_updates", "occurrences", "hazards",
  "sag_meetings", "safety_recommendations", "sec_activities", "sec_logbook", "sec_facilities", "sec_incidents",
  "sec_risk_assessments", "certificates", "items",
]);
const DOMAINS = new Set(["K3", "KESELAMATAN", "KEAMANAN", "PENGAWASAN", "LAPORAN", "UMUM"]);
const safe = (s: string) => String(s ?? "").replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/-+/g, "-").slice(0, 60);

async function callScript(payload: Record<string, unknown>) {
  const url = Deno.env.get("APPS_SCRIPT_URL")!;
  const token = Deno.env.get("APPS_SCRIPT_TOKEN")!;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, token }),
    redirect: "follow",
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error("Apps Script tidak merespons JSON (cek deployment Web App & akses 'Anyone'). HTTP " + res.status); }
  if (!data.ok) throw new Error("Google Drive: " + (data.error || "gagal"));
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metode tidak diizinkan" }, 405);
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const URL_ = Deno.env.get("SUPABASE_URL")!;
    const KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Klien dengan JWT pengguna → semua query tunduk pada RLS (hak peran & lokasi)
    const db = createClient(URL_, KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u?.user) return json({ error: "Sesi login tidak valid. Silakan login ulang." }, 401);

    const body = await req.json();
    const configured = Boolean(Deno.env.get("APPS_SCRIPT_URL") && Deno.env.get("APPS_SCRIPT_TOKEN"));
    if (body.action === "status") return json({ configured });
    if (!configured) return json({ error: "Penyimpanan Google Drive kantor belum dikonfigurasi (secret APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN)." }, 503);
    const can = async (m: string, a: string, unit: string) => {
      const { data } = await db.rpc("can", { p_module: m, p_action: a, p_unit: unit });
      return data === true;
    };

    if (body.action === "upload") {
      const { unit, domain, module, entity, entityId, period, caption, fileName, mime, sha256, dataBase64, takenAt } = body;
      if (!ENTITIES.has(entity)) return json({ error: "Jenis data tidak dikenal" }, 400);
      if (!DOMAINS.has(domain)) return json({ error: "Domain tidak dikenal" }, 400);
      if (!ALLOWED_MIME.includes(mime)) return json({ error: "Jenis file tidak diizinkan (hanya foto atau PDF)" }, 400);
      if (!dataBase64 || dataBase64.length > MAX_B64) return json({ error: "Ukuran file melebihi batas 10 MB" }, 400);
      if (!/^[a-f0-9]{64}$/.test(sha256 || "")) return json({ error: "Checksum tidak valid" }, 400);
      if (!(await can("EVIDENCE", "C", unit)) || !((await can(module, "C", unit)) || (await can(module, "U", unit)))) {
        return json({ error: "Akses ditolak: peran Anda tidak berhak menambah evidence untuk modul/lokasi ini." }, 403);
      }
      // Pastikan data induk ada, terbaca oleh pengguna (RLS) & lokasinya cocok
      const { data: parent } = await db.from(entity).select("id, unit_id").eq("id", entityId).maybeSingle();
      if (!parent || parent.unit_id !== unit) return json({ error: "Data induk tidak ditemukan atau lokasi tidak sesuai." }, 404);
      const { data: dup } = await db.from("files").select("id").eq("entity", entity).eq("entity_id", String(entityId)).eq("sha256", sha256).is("deleted_at", null).maybeSingle();
      if (dup) return json({ error: "File yang sama sudah ada (duplikat)." }, 409);

      const now = new Date();
      const p2 = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`;
      const { count } = await db.from("files").select("id", { count: "exact", head: true }).eq("entity", entity).eq("entity_id", String(entityId));
      const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const year = String(period || "").slice(0, 4).match(/^\d{4}$/) ? String(period).slice(0, 4) : String(now.getFullYear());
      const folderPath = ["AIRNAV-KKS-Evidence", year, safe(unit), safe(domain), safe(module), safe(period || stamp.slice(0, 6))].join("/");
      const name = `${safe(unit)}_${safe(module)}_${String(entityId).slice(0, 8)}_${stamp}_${(count ?? 0) + 1}.${ext}`;
      const share = domain === "KEAMANAN" ? "restricted" : "domain_link";

      const r = await callScript({ action: "upload", path: folderPath, name, mime, data: dataBase64, share, description: `${entity}:${entityId} ${caption || ""} (asli: ${fileName || "-"})` });
      const row = {
        provider: "gdrive", drive_file_id: r.id, drive_folder_id: r.folderId, folder_path: folderPath, file_name: name, mime,
        size_bytes: Math.round(dataBase64.length * 0.75), sha256, web_view_url: r.share === "domain_link" ? r.url : null,
        share_scope: r.share === "domain_link" ? "domain_link" : "restricted", unit_id: unit, domain, module, entity,
        entity_id: String(entityId), period: period || null, caption: caption || null, taken_at: takenAt || null,
      };
      const { data: saved, error } = await db.from("files").insert(row).select().single();
      if (error) {
        await callScript({ action: "move", id: r.id }).catch(() => {});
        return json({ error: "Gagal menyimpan metadata: " + error.message }, 400);
      }
      return json(saved);
    }

    if (body.action === "get") {
      const { data: f } = await db.from("files").select("*").eq("id", body.id).is("deleted_at", null).maybeSingle();
      if (!f) return json({ error: "File tidak ditemukan atau Anda tidak berhak melihatnya." }, 404);
      const r = await callScript({ action: "get", id: f.drive_file_id });
      return json({ mime: r.mime, dataBase64: r.data, fileName: f.file_name });
    }

    if (body.action === "delete") {
      const { data: f } = await db.from("files").select("*").eq("id", body.id).is("deleted_at", null).maybeSingle();
      if (!f) return json({ error: "File tidak ditemukan." }, 404);
      const { data: upd } = await db.from("files").update({ deleted_at: new Date().toISOString(), deleted_by: u.user.id }).eq("id", f.id).select("id");
      if (!upd || !upd.length) return json({ error: "Tidak berhak menghapus (hanya pengunggah ≤ 24 jam atau Admin KKS; data terkunci tidak bisa dihapus)." }, 403);
      await callScript({ action: "move", id: f.drive_file_id });
      return json({ ok: true });
    }

    return json({ error: "Aksi tidak dikenal" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
