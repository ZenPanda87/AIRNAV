/**
 * Evidence foto/PDF → Google Drive akun kantor (lewat Supabase Edge Function "evidence" → Google Apps Script).
 * Browser: kompres foto (±1600 px, JPEG 0,7), hitung SHA-256, antrean ulang (IndexedDB) bila koneksi gagal.
 */
(() => {
  const { h, sb, check, toast, confirmBox, can, state, fmtDate } = KKS;
  const MAX_PDF = 10 * 1024 * 1024;
  const ACCEPT = 'image/*,application/pdf';

  // ---------- IndexedDB antrean ----------
  const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open('kks_evidence', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('queue', { keyPath: 'key' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  async function qOp(mode, fn) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('queue', mode); const st = tx.objectStore('queue'); const out = fn(st); tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out); tx.onerror = () => rej(tx.error); }); }
  const qAdd = (item) => qOp('readwrite', st => st.put(item));
  const qDel = (key) => qOp('readwrite', st => st.delete(key));
  const qAll = () => qOp('readonly', st => st.getAll());

  // ---------- Pemrosesan file ----------
  const toB64 = (buf) => { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  async function sha256(buf) { const d = await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join(''); }
  async function compress(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const max = 1600; const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.7));
      return blob;
    } finally { URL.revokeObjectURL(url); }
  }
  async function prepare(file) {
    let blob = file, mime = file.type, name = file.name;
    if (mime.startsWith('image/')) { blob = await compress(file); mime = 'image/jpeg'; name = name.replace(/\.[^.]+$/, '') + '.jpg'; }
    else if (mime !== 'application/pdf') throw new Error('Jenis file tidak diizinkan (hanya foto atau PDF).');
    if (blob.size > MAX_PDF) throw new Error('Ukuran file melebihi 10 MB.');
    const buf = await blob.arrayBuffer();
    return { mime, fileName: name, size: blob.size, sha256: await sha256(buf), dataBase64: toB64(buf), takenAt: file.lastModified ? new Date(file.lastModified).toISOString() : null };
  }

  async function call(body) {
    const { data, error } = await sb.functions.invoke('evidence', { body });
    if (error) {
      let msg = error.message;
      try { const j = await error.context.json(); msg = j.error || msg; } catch { /* abaikan */ }
      throw new Error(msg);
    }
    if (data && data.error) throw new Error(data.error);
    return data;
  }

  let statusCache = null;
  async function status() {
    if (statusCache) return statusCache;
    try { statusCache = await call({ action: 'status' }); } catch (e) { statusCache = { configured: false, error: e.message }; }
    return statusCache;
  }

  async function upload(ctx, file, caption) {
    const p = await prepare(file);
    const payload = { action: 'upload', unit: ctx.unit, domain: ctx.domain, module: ctx.module, entity: ctx.entity, entityId: ctx.entityId, period: ctx.period, caption, ...p };
    try { return await call(payload); }
    catch (e) {
      if (/terhubung|fetch|network|timeout|502|503|504/i.test(e.message)) {
        await qAdd({ key: `${ctx.entity}:${ctx.entityId}:${p.sha256}`, payload, at: Date.now() });
        toast('Koneksi bermasalah — file disimpan di antrean dan akan dicoba ulang otomatis.', 'warning');
        return null;
      }
      throw e;
    }
  }
  async function flushQueue() {
    let items = []; try { items = await qAll(); } catch { return; }
    for (const it of items) {
      try { await call(it.payload); await qDel(it.key); toast('Evidence dari antrean berhasil diunggah.', 'success'); }
      catch (e) { if (/duplikat|sudah ada/i.test(e.message)) await qDel(it.key); }
    }
  }
  window.addEventListener('online', flushQueue);
  setTimeout(flushQueue, 4000);

  async function openFile(f) {
    if (f.web_view_url && f.share_scope === 'domain_link') { window.open(f.web_view_url, '_blank', 'noopener'); return; }
    try {
      toast('Membuka file…');
      const r = await call({ action: 'get', id: f.id });
      const bin = atob(r.dataBase64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      window.open(URL.createObjectURL(new Blob([arr], { type: r.mime })), '_blank');
    } catch (e) { toast(e.message, 'error'); }
  }

  /** Daftar evidence untuk satu data (dipakai juga oleh laporan). */
  async function list(entity, entityId) {
    return check(await sb.from('files').select('*').eq('entity', entity).eq('entity_id', String(entityId)).is('deleted_at', null).order('uploaded_at'));
  }

  /** Komponen evidence: daftar + tombol unggah. ctx: {unit, domain, module, entity, entityId, period} */
  async function widget(box, ctx) {
    box.innerHTML = '';
    const listBox = h('div', { class: 'k-ev-list' }, 'Memuat…');
    const st = await status();
    const canUp = can('EVIDENCE', 'C', ctx.unit) && (can(ctx.module, 'C', ctx.unit) || can(ctx.module, 'U', ctx.unit));
    const fileInp = h('input', { type: 'file', accept: ACCEPT, multiple: true, hidden: true });
    const camInp = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
    const caption = h('input', { class: 'k-input', placeholder: 'Keterangan foto (opsional)' });
    const bar = h('div', { class: 'k-ev-bar' });
    if (!st.configured) bar.append(h('div', { class: 'k-alert k-alert-warning' }, 'Penyimpanan evidence Google Drive kantor belum dikonfigurasi. ',
      KKS.isSuper() ? 'Lihat PANDUAN_EVIDENCE_GOOGLE_DRIVE.md untuk menyambungkan Apps Script.' : 'Hubungi Super Admin.'));
    else if (canUp) bar.append(caption, h('button', { type: 'button', class: 'k-btn k-btn-sm', onclick: () => camInp.click() }, '📷 Kamera'),
      h('button', { type: 'button', class: 'k-btn k-btn-sm', onclick: () => fileInp.click() }, '📎 Pilih foto/PDF'), fileInp, camInp);
    box.append(bar, listBox);
    const onFiles = async (files) => {
      for (const f of files) {
        const tag = h('div', { class: 'k-ev-item uploading' }, `Mengunggah ${f.name}…`); listBox.prepend(tag);
        try { await upload(ctx, f, caption.value.trim() || null); } catch (e) { toast(`${f.name}: ${e.message}`, 'error'); }
        tag.remove();
      }
      caption.value = ''; refresh();
    };
    fileInp.onchange = () => { onFiles(Array.from(fileInp.files)); fileInp.value = ''; };
    camInp.onchange = () => { onFiles(Array.from(camInp.files)); camInp.value = ''; };
    async function refresh() {
      try {
        const files = await list(ctx.entity, ctx.entityId);
        listBox.innerHTML = '';
        if (!files.length) { listBox.append(h('div', { class: 'k-help' }, 'Belum ada evidence.')); return; }
        files.forEach(f => {
          const canDel = !f.locked && (can('EVIDENCE', 'D', f.unit_id) || (f.uploaded_by === state.user.id && Date.now() - new Date(f.uploaded_at) < 864e5));
          listBox.append(h('div', { class: 'k-ev-item' },
            h('span', { class: 'k-ev-ico' }, f.mime === 'application/pdf' ? '📄' : '🖼️'),
            h('a', { href: '#', onclick: (e) => { e.preventDefault(); openFile(f); } }, f.file_name),
            h('small', {}, ` ${f.caption ? '· ' + f.caption + ' ' : ''}· ${fmtDate(f.uploaded_at, true)}${f.share_scope === 'restricted' ? ' · 🔒 terbatas' : ''}`),
            f.web_view_url ? h('button', { type: 'button', class: 'k-btn k-btn-xs', title: 'Salin link Google Drive', onclick: () => { navigator.clipboard.writeText(f.web_view_url); toast('Link disalin.', 'success'); } }, 'Salin link') : null,
            canDel ? h('button', { type: 'button', class: 'k-btn k-btn-xs k-btn-danger-o', onclick: async () => {
              if (!await confirmBox('Hapus evidence ini? File dipindah ke folder _Arsip_Dihapus di Google Drive.', 'Ya, hapus')) return;
              try { await call({ action: 'delete', id: f.id }); toast('Evidence dipindah ke arsip.', 'success'); refresh(); } catch (e) { toast(e.message, 'error'); }
            } }, 'Hapus') : null));
        });
      } catch (e) { listBox.textContent = e.message; }
    }
    refresh();
  }

  /** Tombol kecil di baris tabel untuk membuka evidence. */
  function openDialog(ctx, title) {
    const box = h('div');
    KKS.modal({ title: 'Evidence — ' + (title || ''), body: box, wide: true });
    widget(box, ctx);
  }

  window.KEVID = { widget, openDialog, list, openFile, status, call };
})();
