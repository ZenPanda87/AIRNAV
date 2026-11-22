/**
 * AIRNAV KKS — Google Apps Script Web App untuk menyimpan evidence ke Google Drive AKUN KANTOR.
 *
 * Dipanggil HANYA oleh Supabase Edge Function "evidence" (server), bukan oleh browser.
 * Keamanan: setiap permintaan wajib membawa TOKEN rahasia yang disimpan di Script Properties
 * (Project Settings → Script properties → TOKEN). Token yang sama disimpan sebagai secret
 * APPS_SCRIPT_TOKEN di Supabase. Jangan pernah menulis token di file ini / GitHub.
 *
 * Script properties:
 *   TOKEN           (wajib)  string acak panjang, mis. 40+ karakter
 *   ROOT_FOLDER_ID  (opsional) ID folder induk (boleh folder di Shared Drive unit). Bila kosong,
 *                   dibuat folder "AIRNAV-KKS-Evidence" di My Drive akun ini.
 *
 * Deploy: Deploy → New deployment → Web app → Execute as: Me (akun kantor) → Who has access: Anyone.
 */
const ROOT_NAME = 'AIRNAV-KKS-Evidence';
const TRASH_NAME = '_Arsip_Dihapus';
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_BYTES = 11 * 1024 * 1024;

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty('TOKEN');
    if (!token || req.token !== token) return out_({ ok: false, error: 'unauthorized' });

    switch (req.action) {
      case 'ping':
        return out_({ ok: true, root: root_().getName(), user: Session.getEffectiveUser().getEmail() });

      case 'upload': {
        if (ALLOWED.indexOf(req.mime) < 0) return out_({ ok: false, error: 'mime tidak diizinkan' });
        const bytes = Utilities.base64Decode(req.data);
        if (bytes.length > MAX_BYTES) return out_({ ok: false, error: 'file terlalu besar' });
        const folder = path_(String(req.path || '').replace(/^AIRNAV-KKS-Evidence\/?/, ''));
        const file = folder.createFile(Utilities.newBlob(bytes, req.mime, sanitize_(req.name)));
        if (req.description) file.setDescription(String(req.description).slice(0, 500));
        let share = 'restricted';
        if (req.share === 'domain_link') {
          try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); share = 'domain_link'; }
          catch (err) { share = 'restricted'; } // akun non-Workspace / kebijakan domain melarang → tetap privat
        }
        return out_({ ok: true, id: file.getId(), folderId: folder.getId(), url: file.getUrl(), share: share });
      }

      case 'get': {
        const f = DriveApp.getFileById(req.id);
        if (!isInsideRoot_(f)) return out_({ ok: false, error: 'file di luar folder evidence' });
        const blob = f.getBlob();
        return out_({ ok: true, mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()), name: f.getName() });
      }

      case 'move': {
        const f = DriveApp.getFileById(req.id);
        if (!isInsideRoot_(f)) return out_({ ok: false, error: 'file di luar folder evidence' });
        const trash = child_(root_(), TRASH_NAME);
        f.moveTo(trash);
        try { f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (err) { /* abaikan */ }
        return out_({ ok: true });
      }

      default:
        return out_({ ok: false, error: 'aksi tidak dikenal' });
    }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  return out_({ ok: true, service: 'AIRNAV KKS evidence', note: 'gunakan POST dengan token' });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function root_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  const it = DriveApp.getRootFolder().getFoldersByName(ROOT_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(ROOT_NAME);
  props.setProperty('ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function child_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function path_(p) {
  let f = root_();
  String(p).split('/').map(sanitize_).filter(String).forEach(function (part) { f = child_(f, part); });
  return f;
}

function sanitize_(s) {
  return String(s || '').replace(/[\\/:*?"<>|#%]+/g, '-').slice(0, 120);
}

/** Pastikan file berada di bawah folder evidence (mencegah akses file lain di Drive akun kantor). */
function isInsideRoot_(file) {
  const rootId = root_().getId();
  const seen = {};
  let queue = [];
  const parents = file.getParents();
  while (parents.hasNext()) queue.push(parents.next());
  for (let depth = 0; depth < 10 && queue.length; depth++) {
    const next = [];
    for (let i = 0; i < queue.length; i++) {
      const f = queue[i];
      if (f.getId() === rootId) return true;
      if (seen[f.getId()]) continue;
      seen[f.getId()] = true;
      const pp = f.getParents();
      while (pp.hasNext()) next.push(pp.next());
    }
    queue = next;
  }
  return false;
}

/** Jalankan sekali dari editor (Run → setup) untuk memberi izin Drive & membuat folder induk. */
function setup() {
  const folder = root_();
  child_(folder, TRASH_NAME);
  Logger.log('Folder evidence: ' + folder.getUrl());
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TOKEN')) {
    // Token dibuat otomatis (48 karakter acak) bila belum diisi manual.
    const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 48);
    props.setProperty('TOKEN', token);
  }
  Logger.log('TOKEN (salin ke secret Supabase APPS_SCRIPT_TOKEN): ' + props.getProperty('TOKEN'));
}
