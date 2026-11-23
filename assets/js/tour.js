/**
 * KTour — panduan interaktif (product tour / coach marks / spotlight) tanpa pustaka luar.
 * Dipakai oleh Sistem KKS (kks.html) & halaman inventaris (index.html).
 *
 *  KTour.setStore({ load: async () => seenObj, save: async (seenObj) => {} })
 *  KTour.run(key, steps, { force })     → tampilkan sekali per key (kecuali force)
 *  KTour.feature(f)                    → sorot fitur baru (titik berdenyut + tooltip "Mengerti")
 *  step = { sel | el() , title, text, place: 'auto'|'top'|'bottom'|'left'|'right', mobileSel, before(), pad }
 */
window.KTour = (() => {
  let store = {
    load: async () => { try { return JSON.parse(localStorage.getItem('ktour_seen') || '{}'); } catch { return {}; } },
    save: async (s) => localStorage.setItem('ktour_seen', JSON.stringify(s))
  };
  let seen = null;
  let active = null;
  const isMobile = () => window.matchMedia('(max-width: 700px)').matches;

  // ---------- gaya (disuntik sekali) ----------
  const css = `
  .kt-shade{position:fixed;inset:0;z-index:9990;pointer-events:auto}
  .kt-spot{position:fixed;z-index:9991;border-radius:10px;box-shadow:0 0 0 9999px rgba(15,23,42,.62),0 0 0 3px #f59e0b inset;transition:all .25s ease;pointer-events:none}
  .kt-spot.none{width:0!important;height:0!important;left:50%!important;top:50%!important}
  .kt-tip{position:fixed;z-index:9992;width:min(340px,calc(100vw - 24px));background:#fff;color:#1e293b;border-radius:12px;box-shadow:0 18px 40px rgba(0,0,0,.35);
    font:14px/1.5 'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;padding:14px 16px 12px;transition:top .25s,left .25s}
  .kt-tip h4{margin:0 0 6px;font-size:15.5px;color:#0a3d62;display:flex;gap:8px;align-items:center}
  .kt-tip h4 .kt-badge{background:#f59e0b;color:#fff;border-radius:99px;font-size:11px;padding:1px 8px}
  .kt-tip p{margin:0 0 10px}
  .kt-tip .kt-foot{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
  .kt-tip .kt-count{font-size:12px;color:#64748b;margin-right:auto}
  .kt-tip button{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:6px 12px;font:inherit;font-weight:600;cursor:pointer;color:#1e293b}
  .kt-tip button.kt-next{background:#0a3d62;border-color:#0a3d62;color:#fff}
  .kt-tip button.kt-skip{border:0;color:#64748b;padding:6px 4px;text-decoration:underline;font-weight:500}
  .kt-tip .kt-off{display:block;margin-top:8px;font-size:12px;color:#64748b}
  .kt-tip .kt-off input{vertical-align:middle;margin-right:4px}
  .kt-tip::before{content:'';position:absolute;width:14px;height:14px;background:#fff;transform:rotate(45deg)}
  .kt-tip.p-bottom::before{top:-7px;left:var(--ax,30px)} .kt-tip.p-top::before{bottom:-7px;left:var(--ax,30px)}
  .kt-tip.p-right::before{left:-7px;top:var(--ay,20px)} .kt-tip.p-left::before{right:-7px;top:var(--ay,20px)} .kt-tip.p-center::before{display:none}
  .kt-dots{display:flex;gap:4px;margin:0 0 10px}.kt-dots i{width:7px;height:7px;border-radius:50%;background:#cbd5e1}.kt-dots i.on{background:#f59e0b;width:18px;border-radius:4px}
  .kt-pulse{position:absolute;z-index:9980;width:14px;height:14px;border-radius:50%;background:#f59e0b;box-shadow:0 0 0 0 rgba(245,158,11,.7);animation:ktp 1.6s infinite;cursor:pointer;pointer-events:auto}
  @keyframes ktp{0%{box-shadow:0 0 0 0 rgba(245,158,11,.7)}70%{box-shadow:0 0 0 14px rgba(245,158,11,0)}100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}}
  @media print{.kt-shade,.kt-spot,.kt-tip,.kt-pulse{display:none!important}}`;
  function injectCss() { if (document.getElementById('kt-css')) return; const s = document.createElement('style'); s.id = 'kt-css'; s.textContent = css; document.head.append(s); }

  const esc = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function visible(el) { if (!el) return false; const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; }
  function resolve(step) {
    const pick = (s) => typeof s === 'function' ? s() : (s ? document.querySelector(s) : null);
    let el = isMobile() && step.mobileSel ? pick(step.mobileSel) : null;
    if (!visible(el)) el = step.el ? step.el() : pick(step.sel);
    if (!visible(el) && step.mobileSel) el = pick(step.mobileSel);
    return visible(el) ? el : null;
  }

  async function ensureSeen() { if (!seen) { try { seen = (await store.load()) || {}; } catch { seen = {}; } } return seen; }
  async function mark(key, val = true) { await ensureSeen(); seen[key] = val; try { await store.save(seen); } catch { /* abaikan */ } }

  function close() {
    if (!active) return;
    active.nodes.forEach(n => n.remove());
    window.removeEventListener('resize', active.reflow); window.removeEventListener('scroll', active.reflow, true);
    document.removeEventListener('keydown', active.onKey);
    active = null;
  }

  /** Jalankan tour. Mengembalikan Promise<'done'|'skip'|'off'|'seen'>. */
  async function run(key, steps, opts = {}) {
    await ensureSeen();
    if (!opts.force && (seen[key] || seen.__off)) return 'seen';
    if (active) close();
    injectCss();
    const list = steps.filter(Boolean);
    if (!list.length) return 'done';
    return new Promise((resolveP) => {
      const shade = document.createElement('div'); shade.className = 'kt-shade';
      const spot = document.createElement('div'); spot.className = 'kt-spot';
      const tip = document.createElement('div'); tip.className = 'kt-tip'; tip.setAttribute('role', 'dialog');
      document.body.append(shade, spot, tip);
      let i = 0, el = null;
      const finish = async (how) => { close(); if (how === 'off') await mark('__off'); await mark(key); if (opts.onEnd) opts.onEnd(how); resolveP(how); };
      function place() {
        const s = list[i]; const pad = s.pad ?? 6;
        if (el) {
          const r = el.getBoundingClientRect();
          Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
          spot.classList.remove('none');
          const tw = tip.offsetWidth, th = tip.offsetHeight, vw = innerWidth, vh = innerHeight, m = 12;
          let p = s.place && s.place !== 'auto' ? s.place : (r.bottom + th + m < vh ? 'bottom' : r.top - th - m > 0 ? 'top' : r.right + tw + m < vw ? 'right' : r.left - tw - m > 0 ? 'left' : 'bottom');
          if (isMobile() && (p === 'left' || p === 'right')) p = r.bottom + th + m < vh ? 'bottom' : 'top';
          let x, y;
          if (p === 'bottom') { y = r.bottom + pad + m; x = r.left + r.width / 2 - tw / 2; }
          if (p === 'top') { y = r.top - pad - m - th; x = r.left + r.width / 2 - tw / 2; }
          if (p === 'right') { x = r.right + pad + m; y = r.top + r.height / 2 - th / 2; }
          if (p === 'left') { x = r.left - pad - m - tw; y = r.top + r.height / 2 - th / 2; }
          x = Math.max(8, Math.min(x, vw - tw - 8)); y = Math.max(8, Math.min(y, vh - th - 8));
          tip.className = 'kt-tip p-' + p;
          tip.style.left = x + 'px'; tip.style.top = y + 'px';
          tip.style.setProperty('--ax', Math.max(14, Math.min(tw - 28, r.left + r.width / 2 - x - 7)) + 'px');
          tip.style.setProperty('--ay', Math.max(14, Math.min(th - 28, r.top + r.height / 2 - y - 7)) + 'px');
        } else {
          spot.classList.add('none');
          tip.className = 'kt-tip p-center';
          tip.style.left = Math.max(8, (innerWidth - tip.offsetWidth) / 2) + 'px'; tip.style.top = Math.max(8, (innerHeight - tip.offsetHeight) / 2) + 'px';
        }
      }
      async function show(n, dir = 1) {
        i = n; const s = list[i];
        if (s.before) { try { await s.before(); } catch { /* abaikan */ } await new Promise(r => setTimeout(r, 250)); }
        el = resolve(s);
        // Langkah opsional (mis. baris tabel) dilewati bila elemennya belum ada (tabel kosong)
        if (!el && s.optional && (s.sel || s.el)) {
          const nx = i + dir;
          if (nx >= 0 && nx < list.length) return show(nx, dir);
        }
        if (el) { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); }
        const last = i === list.length - 1;
        tip.innerHTML = `${list.length > 1 ? `<div class="kt-dots">${list.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>` : ''}
          <h4>${s.badge ? `<span class="kt-badge">${esc(s.badge)}</span>` : ''}${esc(s.title)}</h4><p>${s.html || esc(s.text)}</p>
          <div class="kt-foot"><span class="kt-count">${list.length > 1 ? `${i + 1} / ${list.length}` : ''}</span>
          ${last ? '' : '<button type="button" class="kt-skip">Lewati</button>'}
          ${i > 0 ? '<button type="button" class="kt-prev">Kembali</button>' : ''}
          <button type="button" class="kt-next">${last ? (opts.doneLabel || 'Selesai') : 'Lanjut'}</button></div>
          ${i === 0 && opts.allowOff !== false ? '<label class="kt-off"><input type="checkbox" class="kt-offcb"> Jangan tampilkan panduan otomatis lagi</label>' : ''}`;
        const off = () => tip.querySelector('.kt-offcb') && tip.querySelector('.kt-offcb').checked;
        tip.querySelector('.kt-next').onclick = () => last ? finish(off() ? 'off' : 'done') : show(i + 1);
        const sk = tip.querySelector('.kt-skip'); if (sk) sk.onclick = () => finish(off() ? 'off' : 'skip');
        const pv = tip.querySelector('.kt-prev'); if (pv) pv.onclick = () => show(i - 1, -1);
        requestAnimationFrame(place);
        setTimeout(() => tip.querySelector('.kt-next').focus({ preventScroll: true }), 50);
      }
      const reflow = () => { if (active) { el = resolve(list[i]); place(); } };
      const onKey = (e) => { if (e.key === 'Escape') finish('skip'); else if (e.key === 'ArrowRight') tip.querySelector('.kt-next').click(); else if (e.key === 'ArrowLeft' && i > 0) show(i - 1); };
      shade.addEventListener('click', (e) => e.stopPropagation());
      active = { nodes: [shade, spot, tip], reflow, onKey };
      window.addEventListener('resize', reflow); window.addEventListener('scroll', reflow, true); document.addEventListener('keydown', onKey);
      show(0);
    });
  }

  /**
   * Sorotan fitur baru: f = { id, sel, title, text, page? }.
   * Tampil sekali per pengguna; hanya untuk pengguna lama (pengguna baru otomatis menandai semua fitur saat tour pertama).
   */
  async function feature(f) {
    await ensureSeen();
    if (seen['feat:' + f.id] || seen.__off || active) return false;
    const el = resolve(f);
    if (!el) return false;
    await run('feat:' + f.id, [{ ...f, badge: 'Baru' }], { allowOff: false, doneLabel: 'Mengerti' });
    return true;
  }

  async function reset() { seen = {}; try { await store.save(seen); } catch { /* abaikan */ } }

  return {
    setStore(s) { store = s; seen = null; }, run, feature, mark, reset, close, isMobile,
    async isSeen(k) { await ensureSeen(); return !!seen[k]; }, get active() { return !!active; }
  };
})();
