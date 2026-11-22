/**
 * Data referensi baku (dari 05_BASIS_PENGETAHUAN_KKS.md). Dapat ditimpa lewat menu Pengaturan (app_settings).
 */
window.KREF = {
  APAR_PARAMS: [
    ['hose', 'Selang / nozzle'], ['pressure', 'Isi (tekanan/berat — indikator hijau)'], ['body', 'Cat / tabung'],
    ['pin_seal', 'Pin & segel'], ['handle', 'Handle / tuas'], ['unobstructed', 'Posisi tidak terhalang']
  ],
  APAR_TYPES: ['ABC Powder (CF-500)', 'ABC Powder', 'DCP Powder', 'CO2', 'Gas Cair (CF-21)', 'Gas Cair (AF-11)', 'Hallotron', 'Foam', 'APAB'],
  APAR_MITIGATION: '1. Tabung dan body APAR dalam kondisi baik, 2. Indikator tekanan ada pada warna hijau, 3. Pin dan segel pengaman dalam kondisi baik, 4. Kondisi selang tidak ada sumbatan, retakan, atau kerusakan lain, 5. Nozzle APAR tidak ada korosi atau penyumbatan, 6. Handle/Tuas APAR tidak ada kerusakan fisik, seperti retakan, karat, atau deformasi.',

  P3K_ITEMS: [
    [1, 'Kasa steril terbungkus', 20], [2, 'Perban (lebar 5 cm)', 2], [3, 'Perban (lebar 10 cm)', 2], [4, 'Plester (1,25 cm)', 2],
    [5, 'Plester cepat', 10], [6, 'Kapas (25 gram)', 1], [7, 'Kain segitiga / mitela', 2], [8, 'Gunting', 1], [9, 'Peniti', 12],
    [10, 'Sarung tangan sekali pakai', 2], [11, 'Masker', 1], [12, 'Pinset', 1], [13, 'Lampu senter', 1], [14, 'Gelas untuk cuci mata', 1],
    [15, 'Kantong plastik bersih', 1], [16, 'Aquades (100 ml lar. saline)', 1], [17, 'Povidon iodin (60 ml)', 1], [18, 'Alkohol 70%', 1],
    [19, 'Buku panduan P3K di tempat kerja', 1], [20, 'Buku catatan daftar isi kotak', 1]
  ],

  PATROL_AREAS: ['G. ADM', 'G. TWR', 'VHF-ER', 'LOC', 'GP', 'VOR', 'RDR'],
  PATROL_ITEMS: [
    [1, 'Evacuation route', 'Tanda evakuasi jelas & tidak tertutup; tidak meletakkan benda menutupi jalur', ['Tidak ada tanda evakuasi', 'Ada tapi tertutup', 'Ada tapi pudar', 'Ada & menuju pintu darurat tapi tidak sesuai layout', 'Ada, jelas, sesuai layout, menuju pintu darurat']],
    [2, 'Emergency exit signing box & emergency lamp', 'Berfungsi baik; dicek berkala', ['Tidak ada', 'Ada tapi tidak berfungsi', 'Berfungsi tapi tidak dicek berkala', 'Berfungsi, dicek, posisi tidak tepat', 'Berfungsi, dicek, posisi tepat']],
    [3, 'Evacuation map', 'Mudah dilihat; aktual; dipahami; min. A3', ['Tidak ada denah', 'Tidak aktual & tidak mudah dilihat', 'Tidak aktual, mudah dilihat, < A3', 'Aktual, tidak mudah dilihat, min A3', 'Aktual, mudah dilihat, min A3']],
    [4, 'Exit door & emergency exit', 'Mengarah keluar; tidak dislot; tidak disegel; tidak terhalang', ['Tidak berfungsi baik', 'Tidak mengarah keluar', 'Mengarah keluar tapi disegel & terhalang', 'Tidak disegel tapi terhalang', 'Memenuhi kriteria']],
    [5, 'APD', 'Tersedia; digunakan; sesuai standar; ada sign', ['Tidak ada di area', 'Ada, tidak digunakan', 'Digunakan sebagian, tanpa sign', 'Digunakan tapi tidak standar, tanpa sign', 'Digunakan semua, standar, ada sign']],
    [6, 'Humidity, Temperature', 'Higrometer & termometer ada, berfungsi, dicek, mudah dilihat', ['Tidak ada', 'Ada, tidak berfungsi/tidak dicek/tidak terlihat', 'Berfungsi, tidak dicek berkala, tidak terlihat', 'Berfungsi, dicek, tidak terlihat', 'Memenuhi kriteria']],
    [7, 'Pemadam kebakaran', 'APAR tersedia, berfungsi, dicek, ada SOP, tgl expire, tidak terhalang', ['Tidak ada', 'Tidak berfungsi/expire/terhalang', 'Berfungsi tanpa SOP', 'Berfungsi, dicek, tidak mudah dilihat', 'Berfungsi, dicek, mudah dilihat, tidak terhalang']],
    [8, 'P3K', 'Tersedia; dicek; berfungsi; SOP/checklist; mudah dilihat', ['Tidak ada', 'Ada tidak berfungsi', 'Berfungsi, SOP/checklist tidak update', 'Berfungsi, dicek, tidak mudah dilihat', 'Memenuhi kriteria']],
    [9, 'Kabel', 'Tidak melintang/terurai/terkelupas; stop kontak baik; steker tidak bertumpuk', ['Kabel terkelupas/stop kontak rusak', 'Kabel melintang tanpa pengaman', 'Kabel terurai', 'Steker bertumpuk, sambungan tidak aman', 'Memenuhi kriteria']],
    [10, 'Panel listrik', 'PIC; tanda bahaya; checklist; cover', ['Tidak ada PIC/tanda', 'Ada PIC, tanpa tanda/checklist/cover', 'PIC + tanda, tanpa checklist & cover', 'PIC, tanda, checklist, tanpa cover', 'Memenuhi kriteria']],
    [11, 'Emergency alarm', 'Ada; lampu & alarm berfungsi; checklist', ['Tidak ada', 'Tidak berfungsi', 'Berfungsi, tidak dicek berkala', 'Dicek tapi tidak update', 'Memenuhi kriteria']],
    [12, 'Tombol alarm kebakaran', 'Ada di area; berfungsi', ['Tidak ada', 'Tidak berfungsi', 'Berfungsi tanpa petunjuk & pemukul', 'Berfungsi tapi tidak dipahami operator', 'Berfungsi semestinya']],
    [13, 'Pengelolaan sampah', 'Tempat sampah terpilah', ['Tidak ada', 'Ada, tidak berfungsi, tanpa identifikasi', 'Berfungsi tanpa identifikasi', 'Ada identifikasi tapi tidak dipahami', 'Berfungsi & dipahami']],
    [14, 'Penerangan', 'Sesuai standar', ['Tidak ada', 'Tidak sesuai standar', 'Tidak sesuai fungsi', 'Sesuai, tanpa sign hemat energi', 'Semua sesuai']],
    [15, 'Lift', 'Sign "jangan digunakan saat darurat"; emergency button', ['Tidak ada sign & button', 'Button ada, tanpa sign', 'Sign tidak sesuai', 'Sign pudar', 'Semua sesuai']],
    [16, 'Parkir (mobil)', 'Layout; batas kecepatan; pengganjal roda', ['Tidak sesuai', 'Layout pudar, tanpa batas kecepatan/pengganjal', 'Parkir tidak sesuai', 'Parkir sesuai, tanpa batas kecepatan/pengganjal', 'Sesuai kriteria']],
    [17, 'Titik kumpul', 'Sign titik kumpul', ['Tidak ada', 'Ada tanpa sign', 'Sign pudar', 'Sign jelas, tempat tidak representatif', 'Sesuai']],
    [18, 'Kantin karyawan', 'PIC; APAR; layout; APD; wastafel', ['Tidak ada PIC/pemadam', 'PIC+APAR, layout tidak sesuai', '+layout, tanpa APD', '+APD, tanpa wastafel', 'Memenuhi']],
    [19, 'Pos security', 'Perlengkapan; SOP', ['Tidak ada perlengkapan', 'Tidak berfungsi', 'Berfungsi tanpa SOP', 'SOP tidak dipahami', 'Berfungsi semestinya']],
    [20, 'Tempat penyimpanan sampah sementara', 'Pemilahan; berfungsi; logbook', ['Tidak ada', 'Tidak berfungsi', 'Tempat tidak dibedakan', 'Tidak mudah dilihat', 'Berfungsi semestinya']],
    [21, 'TPS B3', 'SOP/WI; secondary containment; APD; logbook; ventilasi', ['Tidak ada TPS B3', 'Tidak berfungsi/lengkap/identifikasi', 'Lengkap, tanpa identifikasi & ventilasi', 'Ada identifikasi, pengangkatan tidak sesuai', 'Berfungsi, dipahami, ventilasi']],
    [22, 'Toilet', 'Rambu gender; alas kaki; sabun cair; pengering; keran tidak bocor', ['Rusak', 'Berfungsi tanpa semua kelengkapan', '+rambu & alas kaki', '+sabun & pengering, keran bocor', 'Semua sesuai']],
    [23, 'Office', 'Jalur evakuasi tidak terhalang; tempat sampah; rapi', ['Terhalang & tanpa tempat sampah', 'Terhalang, ada tempat sampah', 'Tidak terhalang, tanpa tempat sampah', 'Kurang rapi', 'Sesuai']],
    [24, 'Genset', 'PIC, SOP/WI; sign K3; APD; APAR; secondary containment; kabel rapi', ['Tidak sesuai', 'PIC+SOP saja', '+sign', '+APD', 'Sesuai']],
    [25, 'Workshop', 'PIC; sign K3; APD & tempatnya; APAR; kabel rapi', ['Tidak sesuai', 'PIC+SOP saja', '+sign', '+APD', 'Sesuai']],
    [26, 'Kebisingan', 'Alat ukur; tingkat sesuai standar', ['Tidak ada alat ukur', 'Alat tidak standar', 'Tidak standar tapi berfungsi', 'Standar tapi tidak sesuai fungsi', 'Sesuai']]
  ],

  SMK3_ITEMS: [
    ['A. DOKUMEN', 1, 'Kebijakan K3', [], 'doc'], ['A. DOKUMEN', 2, 'Manual SMK3', [], 'doc'], ['A. DOKUMEN', 3, 'SOP SMK3', [], 'doc'],
    ['A. DOKUMEN', 4, 'Instruksi Kerja K3', [], 'doc'], ['A. DOKUMEN', 5, 'FORM K3', [], 'doc'],
    ['A. DOKUMEN', 6, 'JSA (Job Safety Analysis)', [], 'jsawp'], ['A. DOKUMEN', 7, 'Work Permit', [], 'jsawp'],
    ['B. FASILITAS', 8, 'APD', ['Body Harness & Lanyard', 'Rompi', 'Safety Shoes', 'Helmet', 'Masker Gas', 'Safety Gloves', 'Safety Glasses', 'Safety Boot', 'Safety Gloves Electric', 'Senter', 'Head Lamp', 'Face Shield', 'Kacamata/Google', 'Metal Detector', 'Sarung tangan', 'Earmuff/Ear plug', 'Masker Kain'], 'apd'],
    ['B. FASILITAS', 9, 'Signage K3', ['Jalur Evakuasi', 'Titik Kumpul', 'Exit', 'Larangan menggunakan Lift saat kebakaran & gempa bumi', 'Lay out gedung'], 'doc'],
    ['B. FASILITAS', 10, 'Kotak P3K', [], 'p3k'],
    ['B. FASILITAS', 11, 'APAR', ['Dry Chemical Powder', 'Gas Cair (CF 21/AF 11/Hallotron)', 'CO2'], 'apar'],
    ['B. FASILITAS', 12, 'APAB', [], 'doc'], ['B. FASILITAS', 13, 'Hydrant', ['Halaman', 'Gedung'], 'doc'],
    ['B. FASILITAS', 14, 'Fire Suppression', [], 'doc'], ['B. FASILITAS', 15, 'Sprinkler', [], 'doc'], ['B. FASILITAS', 16, 'Fire Alarm', [], 'doc'],
    ['C. KEGIATAN', 17, 'Rapat Tim P2K3 / Tim K3', [], 'rapat'], ['C. KEGIATAN', 18, 'Safety Patrol', [], 'patrol'],
    ['D. KEJADIAN', 19, 'Insiden', [], 'insiden'], ['D. KEJADIAN', 20, 'Kecelakaan Kerja / Kecelakaan dalam hubungan kerja', [], 'kecelakaan']
  ],

  WP_TYPES: ['Kerja panas', 'Kerja di ketinggian', 'Kerja ruang tertutup', 'Kerja tak rutin'],
  WP_HAZARDS: ['Terpukul', 'Terjepit', 'Jatuh', 'Tergores/teriris', 'Terpeleset', 'Sinar las', 'Suhu ekstrem', 'Zat beracun', 'Arus listrik', 'Benda masuk mata', 'Lainnya'],
  WP_ISOLATIONS: ['Aliran gas', 'Listrik', 'Air', 'Bahan bakar', 'Pemasangan kabel LOTO', 'Minyak hidrolik', 'Peralatan sekuriti', 'Alat pemadam', 'Udara bertekanan', 'Lainnya'],
  WP_PPE: ['Helmet', 'Masker', 'Kacamata', 'Pelindung telinga', 'Sarung tangan', 'Safety shoes', 'Breathing apparatus', 'Sabuk pengaman', 'Apron'],
  WP_SAFEGUARDS: ['Tali', 'Gas detector', 'Lampu senter', 'Papan injakan', 'Penjaga area', 'APAR', 'Safety line', 'Scaffolding', 'Tangga', 'Fire watch'],

  K3_LEVELS: { LOW: 'Low (1–4)', MEDIUM: 'Medium (5–8)', HIGH: 'High (9–12)', EXTREME: 'Extreme (15–25)' },
  k3Level: (v) => v == null ? null : v <= 4 ? 'LOW' : v <= 8 ? 'MEDIUM' : v <= 12 ? 'HIGH' : 'EXTREME',
  K3_ACTION: { LOW: 'Pengendalian yang ada (PPE & administrasi)', MEDIUM: 'Tambah pengendalian (PPE-engineering)', HIGH: 'Tambah (PPE-substitusi); tidak boleh lanjut sebelum dikendalikan', EXTREME: 'PPE-eliminasi; tidak boleh lanjut' },

  ICAO_PROB: [[5, 'Frequent'], [4, 'Occasional'], [3, 'Remote'], [2, 'Improbable'], [1, 'Extremely Improbable']],
  ICAO_SEV: [['A', 'Catastrophic'], ['B', 'Hazardous'], ['C', 'Major'], ['D', 'Minor'], ['E', 'Negligible']],
  icaoTol(p, s) {
    if (!p || !s) return null; const k = p + s;
    if (['5A', '5B', '5C', '4A', '4B', '3A'].includes(k)) return 'INTOLERABLE';
    if (['5D', '5E', '4C', '4D', '4E', '3B', '3C', '3D', '2A', '2B', '2C', '1A'].includes(k)) return 'TOLERABLE';
    return 'ACCEPTABLE';
  },
  secLevel: (v) => v == null ? null : v >= 26 ? 'TINGGI' : v >= 20 ? 'MENENGAH-TINGGI' : v >= 14 ? 'MENENGAH' : v >= 8 ? 'MENENGAH-RENDAH' : 'RENDAH',
  secAccept: (v) => v == null ? null : v >= 20 ? 'TIDAK DAPAT DITOLERANSI' : v >= 14 ? 'ALARP' : 'DAPAT DITOLERANSI',

  KPI: [
    { code: 'LAG-AIRPROX', key: 'AIRPROX', name: 'AIRPROX Cat. A & Cat. B With ANS Contribution', type: 'Lagging', pol: '<=', target: 0 },
    { code: 'LAG-COORD', key: 'COORD', name: 'ATS Coordination Error', type: 'Lagging', pol: '<=', target: 0 },
    { code: 'LAG-RBHB', key: 'RBHB', name: 'ATC Readback–Hearback Issue', type: 'Lagging', pol: '<=', target: 0 },
    { code: 'LAG-FAC', key: 'FAC', name: 'Facilities Issues', type: 'Lagging', pol: '<=', target: 0 },
    { code: 'LEAD-AVAIL', key: 'AVAIL', name: 'Availability Pelayanan Telekomunikasi Penerbangan', type: 'Leading', pol: '>=', target: 99 },
    { code: 'LEAD-NOTAM', key: 'NOTAM', name: 'Inkorporasi NOTAM Permanen ke AIP', type: 'Leading', pol: '>=', target: null },
    { code: 'LEAD-UF', key: 'UF', name: 'Respon User Feedback Publikasi Aeronautika', type: 'Leading', pol: '>=', target: null }
  ],
  KPI_CATEGORY_LABEL: { AIRPROX: 'Airprox Cat. A/B', COORD: 'Coordination Error (BoC)', RBHB: 'Readback–Hearback', FAC: 'Facilities Issues' },
  OCC_CATEGORIES: ['Aborted take-off after rolling', 'Accident', 'Airprox', 'Aircraft is missing', 'Birds/animal hazard in aerodrome vicinity (BIRD)', 'Birdstrike (affect safety of flight) or damage to aircraft (BIRD)', 'Cancel Approach', 'Deviation from ATC clearance or ATM regulation/procedures', 'Divert', 'Equipment failure/malfunction', 'Failure of communication function', 'Failure/malfunction of surveillance function (ATM)', 'Go Around', 'Other', 'Other – Incident', 'Other – Other Occurrences', 'Procedure/coordination issues (BoC)', 'RTA', 'RTB', 'Runway Blocked By Aircraft', 'Runway Incursion Cat. C', 'Serious Incident', 'Take-off or landing incidents', 'Taxiway excursion', 'TCAS RA', 'Tire Burst/Flat Tire', 'Unauthorized penetration of airspace', 'Unmanned rocket/free balloon/UAV/kite hazard', 'Visual aid and aerodrome equipment issues'],
  /** Saran kategori KPI dari kategori EFFORT (tetap perlu dicek admin). */
  suggestKpi(cat) {
    const c = String(cat || '').toLowerCase();
    if (c.includes('airprox')) return 'AIRPROX';
    if (c.includes('coordination') || c.includes('boc')) return 'COORD';
    if (c.includes('readback') || c.includes('hearback')) return 'RBHB';
    if (c.includes('equipment') || c.includes('communication function') || c.includes('surveillance')) return 'FAC';
    return null;
  },

  HAZARD_SOURCES: ['Operasional', 'Audit Internal', 'Audit Eksternal', 'Inspeksi Internal', 'Inspeksi Eksternal', 'SAG', 'Laporan Sukarela (VSR)', 'Lainnya'],
  HAZARD_CATEGORIES: ['TECHNICAL – Facilities C', 'TECHNICAL – Facilities N', 'TECHNICAL – Facilities S', 'TECHNICAL – Facilities D', 'TECHNICAL – Support', 'TECHNICAL – Operation', 'HUMAN – TEK', 'HUMAN – OPS', 'ENVIRONMENT – TEK', 'ENVIRONMENT – OPS', 'ORGANIZATIONAL – TEK', 'ORGANIZATIONAL – OPS'],
  PIC_LIST: ['General Manager', 'Manager Operasi', 'Manager Teknik', 'Manager KKS', 'Manager Administrasi & Keuangan', 'Kepala Cabang Pembantu', 'Kepala Unit'],

  ORGANIZERS: ['DNP', 'KOBU VII', 'Dirkampen', 'SPI', 'Internal-SMK3', 'Internal-Keselamatan', 'Internal-Kampen', 'RSA', 'Divisi SO', 'Lainnya'],
  OVERSIGHT_KINDS: ['Audit', 'Inspeksi', 'Monitoring', 'Monleb', 'Surveillance', 'Regular Check'],
  FIELDS: ['ATS', 'CNS', 'AFIS', 'K3', 'KMP', 'SMS', '170', '172'],
  SEC_KINDS: ['AUDIT', 'INSPEKSI', 'TEST', 'SURVEY', 'DST', 'TABLE TOP', 'AWARENESS'],
  SEC_FAC_KINDS: ['HHMD', 'WTMD', 'CCTV', 'HT', 'Mirror', 'Pagar', 'Access Door', 'X-Ray', 'Lainnya'],
  SEC_INCIDENT_KINDS: ['Pencurian', 'Sabotase', 'Gangguan KKB', 'Demo/unjuk rasa', 'Masuk area tidak sah', 'Ancaman bom/hoax', 'Barang mencurigakan', 'Pengrusakan fasilitas', 'Perilaku mencurigakan', 'Gangguan siber', 'Lainnya'],
  HHMD_ITEMS: ['Pembersihan unit', 'Supply voltage / baterai', 'Fungsi tombol / switch', 'Alert audible (suara)', 'Alert visual (lampu)', 'Uji deteksi benda logam uji', 'Kondisi fisik casing', 'Buku pemeliharaan & SOP tersedia'],
  ACTIVITY_KINDS: {
    K3: ['Bulan K3', 'Simulasi APAR', 'Simulasi gempa / evakuasi', 'Simulasi ERP', 'Rapat Tim K3 / P2K3', 'Tinjauan Manajemen', 'Sosialisasi K3', 'Pencucian AC', 'Seminar kesehatan', 'Insiden', 'Kecelakaan kerja', 'Lainnya'],
    KESELAMATAN: ['Safety promotion', 'Safety briefing', 'Safety campaign', 'Postflight report', 'PUTA / drone', 'Wildlife / layang-layang', 'Runway Safety Team', 'Investigasi internal', 'Lainnya'],
    KEAMANAN: ['DST (Duty Security Training)', 'Table Top Exercise', 'Security awareness', 'Rapat Komite Keamanan', 'Review ANSSP & SOP', 'Sosialisasi ANSSP & SOP', 'Patroli keamanan', 'Lainnya'],
    PENGAWASAN: ['Rapat bulanan', 'Inspeksi & monitoring ke unit', 'Lainnya']
  },

  /** Penandatangan default per jenis laporan (bisa diubah di Pengaturan). */
  SIGNATORIES: {
    default: [['Dibuat Oleh,', 'Petugas Pengelola K3'], ['Mengetahui,', 'Manager Safety']],
    K3: [['Dibuat Oleh,', 'Petugas Pengelola K3'], ['Mengetahui,', 'Manager KKS']],
    SMK3: [['Yang membuat,', 'Manager KKS'], ['Mengetahui,', 'General Manager']],
    HIRADC: [['Prepared by,', 'Ahli K3'], ['Reviewed by,', 'Manager KKS'], ['Approved by,', 'General Manager']],
    JSA: [['Dibuat oleh,', 'Teknisi / Vendor'], ['Diperiksa oleh,', 'User'], ['Disetujui oleh,', 'Fungsi HSE']],
    WP: [['Dibuat,', 'Subkontraktor / Pelaksana'], ['Disetujui,', 'Unit K3'], ['Diketahui,', 'Manager K3']],
    KESELAMATAN: [['Dibuat Oleh,', 'Manager KKS'], ['Mengetahui,', 'General Manager']],
    KEAMANAN: [['Pembuat Laporan,', 'Personel Security Avsec'], ['Penanggung Jawab,', 'Manager KKS']],
    BA: [['Inspektur Keamanan Internal,', 'Inspektur'], ['Mengetahui,', 'General Manager']],
    PENGAWASAN: [['Dibuat Oleh,', 'Manager KKS'], ['Mengetahui,', 'General Manager']]
  }
};
