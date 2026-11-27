/**
 * Modul Umum & Administrasi: Dashboard + pengingat jatuh tempo, Pengguna & peran, Lokasi & area,
 * Personel & sertifikat, Pengaturan (penandatangan, target KPI), Log aktivitas.
 */
(() => {
  const { h, sb, check, state, can, today, thisPeriod, fmtDate, fmtNum, daysUntil, addMonths, BULAN, toast, modal, unitShort, ROLE_LABEL } = KKS;
  const badge = (txt, cls) => h('span', { class: 'k-badge ' + (cls || '') }, txt);
  window.KUI = { badge };

  // ================= DASHBOARD =================
  async function safe(fn) { try { return await fn(); } catch (e) { console.warn(e); return null; } }
  const unitQ = (q) => KKS.byUnit(q);

  function deadlines() {
    const d = new Date(); const y = d.getFullYear(); const m = d.getMonth(); const day = d.getDate();
    const out = [];
    const prevMonth = BULAN[(m + 11) % 12];
    out.push({ t: `Laporan Manajemen (Lapman) data ${prevMonth}`, due: new Date(y, m, 3), mod: 'kpi' });
    out.push({ t: `KPI Safety Rate data ${prevMonth} (pusat tarik tgl 6)`, due: new Date(y, m, 5), mod: 'kpi' });
    if ([0, 3, 6, 9].includes(m)) out.push({ t: `Laporan Evaluasi SMK3 TW ${m === 0 ? 'IV ' + (y - 1) : ['', 'I', 'II', 'III'][m / 3] + ' ' + y}`, due: new Date(y, m, 10), mod: 'smk3' });
    const q = Math.floor(m / 3) + 1;
    out.push({ t: `SAG triwulan ${q} ${y} (min. 1× per 3 bulan)`, due: new Date(y, q * 3, 0), mod: 'sag' });
    return out.map(o => ({ ...o, days: Math.round((o.due - new Date(y, m, day)) / 864e5) })).filter(o => o.days >= -5);
  }

  async function dashboard(c) {
    const per = thisPeriod(); const t = today();
    const cards = h('div', { class: 'k-cards' }); const grid = h('div', { class: 'k-grid-2' });
    c.append(h('div', { class: 'k-intro' }, `Ringkasan ${KKS.unitName(state.unit)} — ${KKS.fmtDateLong()}. Angka dihitung langsung dari data yang diinput.`), cards, grid);
    const card = (label, value, note, cls, mod) => cards.append(h('a', { class: 'k-card ' + (cls || ''), href: mod ? '#/' + mod : null, style: { textDecoration: 'none', color: 'inherit' } },
      h('div', { class: 'k-card-label' }, label), h('div', { class: 'k-card-value' }, value ?? '–'), note ? h('div', { class: 'k-card-note' }, note) : null));
    const todo = [];

    if (can('APAR', 'R')) await safe(async () => {
      const apar = check(await unitQ(sb.from('apar').select('id,code,unit_id,last_refill,valid_months,condition').eq('active', true)));
      const insp = check(await unitQ(sb.from('apar_inspections').select('apar_id').eq('period', per)));
      const done = new Set(insp.map(i => i.apar_id));
      const notYet = apar.filter(a => !done.has(a.id));
      const exp = apar.filter(a => a.last_refill && daysUntil(addMonths(a.last_refill, a.valid_months)) < 0);
      const soon = apar.filter(a => a.last_refill && (d => d >= 0 && d <= 30)(daysUntil(addMonths(a.last_refill, a.valid_months))));
      card('APAR belum dicek bulan ini', notYet.length, `dari ${apar.length} tabung`, notYet.length ? 'warn' : 'ok', 'apar-cek');
      card('APAR kedaluwarsa', exp.length, soon.length ? `${soon.length} habis ≤ 30 hari` : 'masa berlaku isi', exp.length ? 'bad' : 'ok', 'apar');
      if (notYet.length) todo.push([`Pemeriksaan APAR ${KKS.periodLabel(per)}: ${notYet.length} tabung belum dicek`, 'apar-cek', 'warn']);
      exp.forEach(a => todo.push([`${a.code} (${unitShort(a.unit_id)}) kedaluwarsa sejak ${fmtDate(addMonths(a.last_refill, a.valid_months))} — refill`, 'apar', 'bad']));
    });
    if (can('P3K', 'R')) await safe(async () => {
      const boxes = check(await unitQ(sb.from('p3k_boxes').select('id').eq('active', true)));
      const chk = check(await unitQ(sb.from('p3k_checks').select('box_id').eq('period', per)));
      const n = boxes.length - new Set(chk.map(x => x.box_id)).size;
      card('Kotak P3K belum dicek', n, `dari ${boxes.length} kotak`, n ? 'warn' : 'ok', 'p3k-cek');
      if (n) todo.push([`Checklist P3K ${KKS.periodLabel(per)}: ${n} kotak belum dicek`, 'p3k-cek', 'warn']);
    });
    if (can('PATROL', 'R')) await safe(async () => {
      const [py, pm] = per.split('-').map(Number);
      const s = check(await unitQ(sb.from('patrol_schedules').select('id,status,date').gte('date', per + '-01').lt('date', pm === 12 ? `${py + 1}-01-01` : `${py}-${KKS.pad(pm + 1)}-01`)));
      card('Safety patrol bulan ini', s.filter(x => x.status === 'SELESAI').length + '/' + s.length, s.length ? 'selesai / terjadwal' : 'belum dijadwalkan', s.length ? '' : 'warn', 'patrol');
      if (!s.length) todo.push(['Jadwal safety patrol bulan ini belum dibuat', 'patrol', 'warn']);
    });
    if (can('JSAWP', 'R')) await safe(async () => {
      const wp = check(await unitQ(sb.from('work_permits').select('id,status,end_at,ext1_until,ext2_until,title').in('status', ['DIAJUKAN', 'DIPERIKSA', 'BERLAKU'])));
      const wait = wp.filter(w => w.status !== 'BERLAKU');
      card('Izin kerja menunggu persetujuan', wait.length, `${wp.length - wait.length} izin berlaku`, wait.length ? 'warn' : '', 'jsawp');
      wait.forEach(w => todo.push([`Izin kerja "${w.title}" menunggu ${w.status === 'DIAJUKAN' ? 'pemeriksaan User' : 'persetujuan HSE'}`, 'jsawp', 'warn']));
      wp.filter(w => w.status === 'BERLAKU' && new Date(w.ext2_until || w.ext1_until || w.end_at) < new Date()).forEach(w => todo.push([`Izin kerja "${w.title}" sudah lewat masa berlaku — tutup atau perpanjang`, 'jsawp', 'bad']));
    });
    if (can('TEMUAN', 'R')) await safe(async () => {
      const f = check(await unitQ(sb.from('findings').select('id,finding,status,target_date,target_date_new,pq_no,unit_id').neq('status', 'CLOSED')));
      const od = f.filter(x => (x.target_date_new || x.target_date) && (x.target_date_new || x.target_date) < t);
      card('Temuan terbuka', f.length, `${od.length} lewat target (overdue)`, od.length ? 'bad' : (f.length ? 'warn' : 'ok'), 'temuan');
      od.slice(0, 8).forEach(x => todo.push([`Temuan ${x.pq_no || ''} overdue (target ${fmtDate(x.target_date_new || x.target_date)}): ${x.finding.slice(0, 80)}`, 'temuan', 'bad']));
    });
    if (can('HAZARD', 'R')) await safe(async () => {
      const hz = check(await unitQ(sb.from('hazards').select('id,tolerability,rtolerability').eq('state', 'OPEN')));
      const intol = hz.filter(x => (x.rtolerability || x.tolerability) === 'INTOLERABLE').length;
      card('Hazard terbuka', hz.length, `${intol} intolerable`, intol ? 'bad' : '', 'hazard');
    });
    if (can('PERSONEL', 'R')) await safe(async () => {
      const cert = check(await unitQ(sb.from('certificates').select('id,name,valid_until,personnel_id').not('valid_until', 'is', null)));
      const near = cert.filter(x => daysUntil(x.valid_until) <= 90);
      card('Sertifikat habis ≤ 90 hari', near.length, 'lisensi/diklat/medex', near.length ? 'warn' : 'ok', 'personel');
      near.forEach(x => todo.push([`Sertifikat "${x.name}" ${daysUntil(x.valid_until) < 0 ? 'sudah habis' : 'habis'} ${fmtDate(x.valid_until)}`, 'personel', daysUntil(x.valid_until) < 0 ? 'bad' : 'warn']));
    });
    if (can('SECPROG', 'R')) await safe(async () => {
      const [y, m] = per.split('-').map(Number);
      const sl = check(await unitQ(sb.from('sec_program_slots').select('id,kind,month,status,unit_id').eq('year', y).lte('month', m).eq('status', 'RENCANA')));
      card('Program keamanan belum terlaksana', sl.length, `s.d. ${BULAN[m - 1]} ${y}`, sl.length ? 'warn' : 'ok', 'sec-program');
      sl.forEach(s => todo.push([`${s.kind} keamanan ${BULAN[s.month - 1]} (${unitShort(s.unit_id)}) belum terlaksana`, 'sec-program', s.month < m ? 'bad' : 'warn']));
    });

    const dl = deadlines();
    grid.append(
      h('div', { class: 'k-panel' }, h('h3', {}, 'Perlu tindakan'), todo.length ? h('ul', { class: 'k-list' }, todo.map(([txt, mod, cls]) =>
        h('li', {}, h('span', {}, badge(cls === 'bad' ? 'Segera' : 'Perlu', cls), ' ', txt), h('a', { href: '#/' + mod }, 'Buka →')))) : h('p', { class: 'k-help' }, 'Tidak ada yang tertunda. 👍')),
      h('div', { class: 'k-panel' }, h('h3', {}, 'Kalender tenggat pelaporan'), h('ul', { class: 'k-list' }, dl.map(d =>
        h('li', {}, h('span', {}, d.t), badge(d.days < 0 ? `lewat ${-d.days} hari` : d.days === 0 ? 'hari ini' : `${d.days} hari lagi (${fmtDate(`${d.due.getFullYear()}-${KKS.pad(d.due.getMonth() + 1)}-${KKS.pad(d.due.getDate())}`)})`, d.days < 0 ? 'bad' : d.days <= 3 ? 'warn' : 'info')))),
        h('p', { class: 'k-help' }, 'Juga dipantau: testing keamanan 2-bulanan, masa berlaku APAR, sertifikat, izin kerja, target temuan.')));
  }
  KKS.register({ id: 'dashboard', title: 'Dashboard', domain: 'UMUM', icon: '🏠', order: 1, render: dashboard });

  // ================= LOKASI & AREA =================
  KKS.register({ id: 'lokasi', title: 'Lokasi (8)', domain: 'ADMIN', icon: '📍', perm: 'MASTER', order: 90, render: KCRUD.page({
    id: 'lokasi', title: 'Lokasi', table: 'units', perm: 'MASTER', unitless: true, order: ['sort', true], noDelete: true, itemName: 'lokasi',
    beforeSave: (v, row) => { if (!row && !v.id) throw new Error('Kode lokasi wajib'); return v; },
    fields: [
      { k: 'id', l: 'Kode', list: true, req: true, readonly: false, help: 'Mis. TRK', editOnly: false },
      { k: 'icao', l: 'ICAO', list: true }, { k: 'sheet_code', l: 'Kode sheet traffic', list: true, help: 'Malinau = LNU' },
      { k: 'name', l: 'Nama resmi', list: true, req: true, span: 2 }, { k: 'short_name', l: 'Nama singkat', list: true },
      { k: 'type', l: 'Jenis', t: 'select', opts: ['Cabang', 'Cabang Pembantu', 'Unit'], list: true }, { k: 'city', l: 'Kota (untuk tanggal laporan)', list: true },
      { k: 'sort', l: 'Urutan', t: 'number' }, { k: 'active', l: 'Aktif', t: 'bool', def: true, list: true }
    ]
  }) });
  KKS.register({ id: 'area', title: 'Gedung, lantai & ruang', domain: 'ADMIN', icon: '🏢', perm: 'MASTER', order: 91, render: KCRUD.page({
    id: 'area', title: 'Gedung, lantai & ruang', table: 'areas', perm: 'MASTER', order: ['building', true, 'floor', true], itemName: 'area',
    fields: [
      { k: 'building', l: 'Gedung', t: 'list', opts: ['Gedung ADM/APP', 'Gedung Tower', 'Shelter', 'Area luar'], req: true, list: true },
      { k: 'floor', l: 'Lantai', list: true }, { k: 'room', l: 'Ruang', list: true, span: 2, cls: 'wrap' }, { k: 'size_m', l: 'Ukuran (m)', list: true },
      { k: 'kind', l: 'Jenis', t: 'select', opts: [['office', 'Perkantoran'], ['ops', 'Operasional/peralatan'], ['shelter', 'Shelter'], ['outdoor', 'Area luar']], list: true },
      { k: 'active', l: 'Aktif', t: 'bool', def: true }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ]
  }) });

  // ================= PERSONEL & SERTIFIKAT =================
  const personnelDef = {
    id: 'personel', title: 'Personel', table: 'personnel', perm: 'PERSONEL', order: ['full_name', true], itemName: 'personel',
    intro: 'Simpan nama & jabatan saja — NIK, KTP, NPWP, rekening, nomor HP pribadi tidak perlu dimasukkan.',
    fields: [
      { k: 'full_name', l: 'Nama lengkap', req: true, list: true }, { k: 'position_title', l: 'Jabatan', list: true },
      { k: 'employment', l: 'Status', t: 'select', opts: ['Organik', 'Outsourcing (OS)', 'PKWT', 'Lainnya'], list: true },
      { k: 'functional_role', l: 'Peran fungsional', t: 'list', opts: ['Ahli K3 Umum', 'Safety Officer', 'Petugas Peran Kebakaran', 'Petugas P3K', 'Inspektur Keamanan Internal', 'Personel Avsec', 'Ksatria Tarakan', 'ATC', 'Teknisi', 'AFIS'], list: true },
      { k: 'avsec', l: 'Personel Avsec', t: 'bool' }, { k: 'inspector', l: 'Inspektur keamanan internal', t: 'bool' },
      { k: 'active', l: 'Aktif', t: 'bool', def: true, list: true }, { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    rowActions: [{ label: 'Sertifikat', run: (r) => KKS.go('sertifikat', { personnel: r.id }) }]
  };
  KKS.register({ id: 'personel', title: 'Personel', domain: 'UMUM', icon: '👥', perm: 'PERSONEL', order: 80, render: KCRUD.page(personnelDef) });
  KKS.register({ id: 'sertifikat', title: 'Sertifikat, lisensi & diklat', domain: 'UMUM', icon: '🎓', perm: 'PERSONEL', order: 81, render: (c, p, a) => KCRUD.page({
    id: 'sertifikat', title: 'Sertifikat, lisensi & diklat', table: 'certificates', perm: 'PERSONEL', order: ['valid_until', true], itemName: 'sertifikat',
    select: '*, personnel(full_name, position_title)',
    query: (q) => p.personnel ? q.eq('personnel_id', p.personnel) : q,
    presets: () => p.personnel ? { personnel_id: p.personnel } : {},
    rowClass: (r) => r.valid_until && daysUntil(r.valid_until) < 0 ? 'row-danger' : (r.valid_until && daysUntil(r.valid_until) <= 90 ? 'row-warn' : ''),
    evidence: { domain: 'UMUM', module: 'PERSONEL', period: (r) => (r.valid_from || KKS.today()).slice(0, 7) },
    fields: [
      { k: 'personnel_id', l: 'Personel', t: 'ref', req: true, ref: { table: 'personnel', label: r => `${r.full_name} — ${r.position_title || ''}`, order: ['full_name'] }, list: true, render: r => r.personnel ? `${r.personnel.full_name}` : '' },
      { k: 'type', l: 'Jenis', t: 'select', opts: ['K3', 'Lisensi', 'Rating', 'IELP', 'Medex', 'Avsec', 'Diklat lain'], list: true },
      { k: 'name', l: 'Nama sertifikat / diklat', req: true, list: true, span: 2, cls: 'wrap' }, { k: 'number', l: 'Nomor' }, { k: 'issuer', l: 'Penerbit', list: true },
      { k: 'valid_from', l: 'Berlaku sejak', t: 'date', list: true }, { k: 'valid_until', l: 'Berlaku sampai', t: 'date', list: true },
      { k: '_status', l: 'Status', form: false, list: true, render: r => !r.valid_until ? badge('Tanpa batas') : daysUntil(r.valid_until) < 0 ? badge('Expired', 'bad') : daysUntil(r.valid_until) <= 90 ? badge(`${daysUntil(r.valid_until)} hari lagi`, 'warn') : badge('Berlaku', 'ok') },
      { k: 'note', l: 'Catatan', t: 'textarea' }
    ],
    print: { title: 'DATA PERSONIL & DIKLAT K3', sig: 'K3' }
  })(c, p, a) });

  // ================= PENGGUNA & PERAN =================
  async function usersPage(c, p, actions) {
    if (!KKS.isSuper()) c.append(h('div', { class: 'k-alert k-alert-info' }, 'Hanya Super Admin yang dapat menambah/mengubah akun. Anda dapat melihat daftar.'));
    const box = h('div', { class: 'k-table-wrap' }, h('div', { class: 'k-empty' }, 'Memuat…'));
    c.append(h('div', { class: 'k-intro' }, 'Satu orang boleh punya beberapa peran. Peran dengan lokasi "Semua" berlaku untuk 8 lokasi; Kepala Unit cukup diberi lokasinya sendiri. Penegakan hak akses dilakukan di database (RLS).'), box);
    if (KKS.isSuper()) actions.append(h('button', { class: 'k-btn k-btn-primary', onclick: () => editUser(null) }, '+ Tambah pengguna'));
    async function call(body) {
      const { data, error } = await sb.functions.invoke('admin-users', { body });
      if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch { } throw new Error(m); }
      if (data && data.error) throw new Error(data.error);
      return data;
    }
    async function load() {
      try {
        const data = await call({ action: 'list' });
        box.innerHTML = '';
        const tb = h('tbody');
        data.users.forEach((u, i) => tb.append(h('tr', { class: u.active === false ? 'row-danger' : '' },
          h('td', { class: 'num' }, i + 1), h('td', {}, u.full_name || '—', h('br'), h('small', { class: 'k-help' }, u.position_title || '')),
          h('td', {}, u.email), h('td', {}, (u.roles || []).map(r => h('div', {}, badge(ROLE_LABEL[r.role] || r.role, 'info'), ' ', r.unit_id ? unitShort(r.unit_id) : 'Semua lokasi'))),
          h('td', {}, u.active === false ? badge('Nonaktif', 'bad') : badge('Aktif', 'ok'), h('br'), h('small', { class: 'k-help' }, u.last_sign_in_at ? 'Login ' + fmtDate(u.last_sign_in_at, true) : 'Belum pernah login')),
          h('td', { class: 'k-actions' }, KKS.isSuper() ? h('button', { class: 'k-btn k-btn-sm', onclick: () => editUser(u) }, 'Ubah') : null))));
        box.append(h('table', { class: 'k-table' }, h('thead', {}, h('tr', {}, ['No', 'Nama / jabatan', 'Email', 'Peran & lokasi', 'Status', 'Aksi'].map(x => h('th', {}, x)))), tb));
      } catch (e) { box.innerHTML = ''; box.append(h('div', { class: 'k-alert k-alert-danger' }, e.message)); }
    }
    function editUser(u) {
      const isNew = !u;
      const name = h('input', { class: 'k-input', value: u ? u.full_name || '' : '' });
      const pos = h('input', { class: 'k-input', value: u ? u.position_title || '' : '' });
      const email = h('input', { class: 'k-input', type: 'email', value: u ? u.email : '', disabled: !isNew || null });
      const pass = h('input', { class: 'k-input', type: 'text', placeholder: isNew ? 'min. 8 karakter' : 'kosongkan bila tidak diganti' });
      const active = h('input', { type: 'checkbox', checked: !u || u.active !== false });
      const rolesBox = h('div');
      const addRole = (r = {}) => {
        const rs = h('select', { class: 'k-input' }, Object.entries(ROLE_LABEL).map(([k, l]) => h('option', { value: k, selected: r.role === k || null }, l)));
        const us = h('select', { class: 'k-input' }, h('option', { value: '' }, 'Semua lokasi'), state.units.map(x => h('option', { value: x.id, selected: r.unit_id === x.id || null }, x.short_name)));
        const row = h('div', { class: 'k-toolbar', 'data-role': 1 }, rs, us, h('button', { type: 'button', class: 'k-icon-btn', onclick: () => row.remove() }, '✕'));
        row.get = () => ({ role: rs.value, unit_id: us.value || null });
        rolesBox.append(row);
      };
      (u && u.roles && u.roles.length ? u.roles : [{ role: 'petugas_k3', unit_id: 'TRK' }]).forEach(addRole);
      const save = h('button', { class: 'k-btn k-btn-primary' }, 'Simpan');
      const m = modal({ title: isNew ? 'Tambah pengguna' : 'Ubah pengguna', wide: true, body: h('div', { class: 'k-form' },
        h('label', { class: 'k-field' }, h('span', {}, 'Nama lengkap'), name), h('label', { class: 'k-field' }, h('span', {}, 'Jabatan'), pos),
        h('label', { class: 'k-field' }, h('span', {}, 'Email login'), email), h('label', { class: 'k-field' }, h('span', {}, 'Password'), pass),
        h('label', { class: 'k-check' }, active, ' Akun aktif'),
        h('div', { class: 'k-form-section' }, 'Peran & cakupan lokasi'), h('div', { class: 'span-full' }, rolesBox, h('button', { type: 'button', class: 'k-btn k-btn-sm', onclick: () => addRole() }, '+ Tambah peran'))),
        footer: [
          (!isNew && u.id !== state.user.id) ? h('button', { class: 'k-btn k-btn-danger-o', style: { marginRight: 'auto' }, onclick: async () => {
            if (!await KKS.confirmBox(`Hapus akun ${u.email} secara permanen? Data yang pernah diinput tetap tersimpan. Untuk sementara, cukup hilangkan centang "Akun aktif".`, 'Ya, hapus akun')) return;
            try { await call({ action: 'delete', user_id: u.id }); toast('Akun dihapus.', 'success'); m.close(); load(); } catch (e) { toast(e.message, 'error'); }
          } }, 'Hapus akun') : null,
          h('button', { class: 'k-btn', onclick: () => m.close() }, 'Batal'), save] });
      save.onclick = async () => {
        const roles = Array.from(rolesBox.querySelectorAll('[data-role]')).map(r => r.get());
        if (!roles.length) return toast('Minimal satu peran.', 'error');
        if (isNew && (!email.value || pass.value.length < 8)) return toast('Email & password (min. 8 karakter) wajib.', 'error');
        if (pass.value && pass.value.length < 8) return toast('Password min. 8 karakter.', 'error');
        save.disabled = true;
        try {
          await call({ action: isNew ? 'create' : 'update', user_id: u && u.id, email: email.value.trim(), password: pass.value || undefined, full_name: name.value.trim(), position_title: pos.value.trim(), active: active.checked, roles });
          toast('Pengguna tersimpan.', 'success'); m.close(); load();
        } catch (e) { toast(e.message, 'error'); } finally { save.disabled = false; }
      };
    }
    load();
  }
  KKS.register({ id: 'pengguna', title: 'Pengguna & peran', domain: 'ADMIN', icon: '🔐', perm: 'USERS', order: 92, render: usersPage });

  // ================= PENGATURAN =================
  async function settingsPage(c) {
    const editable = can('MASTER', 'U', null);
    const sig = JSON.parse(JSON.stringify(KKS.setting('signatories', {})));
    const kpi = JSON.parse(JSON.stringify(KKS.setting('kpi_targets', {})));
    const LABEL = { default: 'Default', K3: 'Laporan K3 (APAR, P3K, patrol, APD, pengukuran)', SMK3: 'Evaluasi SMK3 triwulan', HIRADC: 'HIRADC K3', JSA: 'JSA', WP: 'Surat Izin Kerja', KESELAMATAN: 'Laporan keselamatan / KPI / SAG', KEAMANAN: 'Laporan keamanan (logbook, HHMD)', BA: 'Berita Acara keamanan', PENGAWASAN: 'Matriks tindak lanjut temuan' };
    const sigBox = h('div');
    Object.keys(KREF.SIGNATORIES).forEach(key => {
      const list = sig[key] || KREF.SIGNATORIES[key];
      const row = h('div', { class: 'k-panel' }, h('b', {}, LABEL[key] || key));
      const inputs = list.map(([l, r]) => [h('input', { class: 'k-input', value: l }), h('input', { class: 'k-input', value: r })]);
      inputs.forEach(([a, b]) => row.append(h('div', { class: 'k-toolbar' }, a, b)));
      row.get = () => inputs.map(([a, b]) => [a.value, b.value]);
      row.dataset.key = key; sigBox.append(row);
    });
    const y = new Date().getFullYear();
    const kpiYear = kpi[y] || {};
    const kpiInputs = KREF.KPI.filter(k => k.target !== null).map(k => [k.key, h('input', { class: 'k-input', type: 'number', step: 'any', value: kpiYear[k.key] ?? k.target })]);
    const save = h('button', { class: 'k-btn k-btn-primary', disabled: !editable || null }, 'Simpan pengaturan');
    c.append(
      h('div', { class: 'k-panel' }, h('h3', {}, 'Penandatangan laporan PDF (label & jabatan)'), h('p', { class: 'k-help' }, 'Nama tidak dicetak — blok tanda tangan dibiarkan kosong untuk TTD basah (keputusan Q5).'), sigBox),
      h('div', { class: 'k-panel' }, h('h3', {}, `Target KPI Safety Rate klaster Tarakan ${y}`), h('div', { class: 'k-form' }, kpiInputs.map(([k, inp]) => h('label', { class: 'k-field' }, h('span', {}, KREF.KPI.find(x => x.key === k).name), inp)))),
      h('div', { class: 'k-panel' }, h('h3', {}, 'Isi & obat kotak P3K'), h('p', { class: 'k-help' }, 'Jumlah standar dan obat/item tambahan kini diatur per lokasi di menu K3 → ', h('a', { href: '#/p3k-isi' }, 'Isi standar kotak P3K'), '.')),
      save,
      h('div', { class: 'k-panel', style: { marginTop: '16px' } }, h('h3', {}, 'Panduan interaktif (akun Anda)'),
        h('p', { class: 'k-help' }, 'Panduan setiap halaman tampil otomatis sekali. Tekan tombol di bawah untuk menampilkannya lagi dari awal di semua halaman.'),
        h('button', { class: 'k-btn', onclick: async () => { await KTour.reset(); toast('Semua panduan akan tampil lagi.', 'success'); KKS.go('dashboard'); } }, 'Ulangi semua panduan')));
    save.onclick = async () => {
      try {
        const s = {}; Array.from(sigBox.children).forEach(r => { s[r.dataset.key] = r.get(); });
        kpi[y] = Object.fromEntries(kpiInputs.map(([k, inp]) => [k, Number(inp.value)]));
        await KKS.saveSetting('signatories', s); await KKS.saveSetting('kpi_targets', kpi);
        toast('Pengaturan tersimpan.', 'success');
      } catch (e) { toast(e.message, 'error'); }
    };
  }
  KKS.register({ id: 'pengaturan', title: 'Pengaturan', domain: 'ADMIN', icon: '⚙️', perm: 'MASTER', order: 93, render: settingsPage });

  // ================= LOG AKTIVITAS =================
  KKS.register({ id: 'log', title: 'Log aktivitas', domain: 'ADMIN', icon: '📜', perm: 'USERS', order: 94, render: async (c) => {
    const rows = check(await sb.from('activity_log').select('*').order('at', { ascending: false }).limit(500));
    const profs = check(await sb.from('profiles').select('user_id,full_name'));
    const nm = Object.fromEntries(profs.map(p => [p.user_id, p.full_name]));
    const ACT = { INSERT: ['Tambah', 'ok'], UPDATE: ['Ubah', 'info'], DELETE: ['Hapus', 'bad'] };
    c.append(h('div', { class: 'k-intro' }, '500 aktivitas terakhir (tambah/ubah/hapus) di seluruh modul. Data yang dihapus tersimpan salinannya.'),
      h('div', { class: 'k-table-wrap' }, h('table', { class: 'k-table' }, h('thead', {}, h('tr', {}, ['Waktu', 'Pengguna', 'Aksi', 'Tabel', 'Lokasi', 'ID'].map(x => h('th', {}, x)))),
        h('tbody', {}, rows.map(r => h('tr', {}, h('td', {}, fmtDate(r.at, true)), h('td', {}, nm[r.user_id] || (r.user_id ? r.user_id.slice(0, 8) : 'sistem')),
          h('td', {}, badge(...(ACT[r.action] || [r.action]))), h('td', {}, r.tbl), h('td', {}, r.unit_id || ''), h('td', {}, h('small', { class: 'k-help' }, (r.row_id || '').slice(0, 8)))))))));
  } });
})();
