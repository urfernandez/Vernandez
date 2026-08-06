let drawerOpen = false;
let startX = 0;
let currentX = 0;
let swiping = false;

let saldoDisembunyikan = true;
let isImageHidden = false;

const API_CONFIG = {
  baseUrl: 'https://openapi.bukaolshop.net/v1/user/transaksi',
  token: 'eyJhcHAiOiI1ODExNyIsImF1dGgiOiIyMDIxMDIwMiIsInNpZ24iOiJHWjRlRDB5S0c1aFUyUGhRUjNob2pBPT0ifQ==',
  tokenUser: '{{token_user}}',
  idUser: '{{id_user}}'
};

const userProfile = {
  nama: "{{nama_user}}",
  telp: "{{nomor_telepon}}",
  saldo: "{{saldo_user}}",
  poin: "{{poin_member}}"
};

let allTransactions = [];
let currentTxFilter = 'semua';
let currentTxKeyword = '';
let currentDateFilter = '';
let apexChart;
let isLoaded = false;

const faqData = [
  {
    kategori: 'transaksi',
    pertanyaan: 'Bagaimana cara melakukan Top Up?',
    jawaban: 'Pilih menu Top Up, masukkan nominal, pilih metode pembayaran, lalu ikuti instruksi sampai transaksi selesai.'
  },
  {
    kategori: 'saldo',
    pertanyaan: 'Apakah saldo bisa disembunyikan?',
    jawaban: 'Ya. Gunakan tombol ikon mata pada saldo untuk menyembunyikan atau menampilkan nominal saldo.'
  },
  {
    kategori: 'transaksi',
    pertanyaan: 'Berapa lama proses transaksi?',
    jawaban: 'Umumnya cepat, tetapi waktu proses dapat berbeda tergantung layanan, antrian, dan jaringan.'
  },
  {
    kategori: 'akun',
    pertanyaan: 'Di mana melihat riwayat transaksi?',
    jawaban: 'Buka menu Riwayat Transaksi untuk melihat status transaksi masuk, proses, berhasil, atau gagal.'
  },
  {
    kategori: 'akun',
    pertanyaan: 'Bagaimana cara ubah data profil?',
    jawaban: 'Masuk ke menu Akun Saya, lalu pilih Edit Profil untuk memperbarui nama dan nomor telepon.'
  },
  {
    kategori: 'bantuan',
    pertanyaan: 'Bagaimana jika transaksi bermasalah?',
    jawaban: 'Silakan hubungi CS melalui menu Hubungi Kami dan sertakan nomor transaksi agar cepat diproses.'
  }
];

let currentFaqCategory = 'semua';

function renderFaqList(){
  const list = document.getElementById('faqList');
  const empty = document.getElementById('faqEmptyState');
  if (!list || !empty) return;

  const q = (document.getElementById('faqSearchInput')?.value || '').trim().toLowerCase();
  const filtered = faqData.filter(item => {
    const matchCategory = currentFaqCategory === 'semua' || item.kategori === currentFaqCategory;
    const text = `${item.pertanyaan} ${item.jawaban} ${item.kategori}`.toLowerCase();
    return matchCategory && (!q || text.includes(q));
  });

  list.innerHTML = filtered.map((item, index) => `
    <div class="faq-item ${index === 0 ? 'open' : ''}" data-category="${item.kategori}">
      <button class="faq-btn" type="button" onclick="toggleFaq(this)">
        <div class="faq-q">${item.pertanyaan}</div>
        <span class="material-icons-outlined text-slate-600">expand_more</span>
      </button>
      <div class="faq-a">${item.jawaban}</div>
    </div>
  `).join('');

  empty.classList.toggle('hidden', filtered.length !== 0);
}

function setFaqCategory(category){
  currentFaqCategory = category;
  document.querySelectorAll('.faq-chip').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === category || (category === 'semua' && btn.textContent.trim().toLowerCase() === 'semua'));
  });
  renderFaqList();
}

function showToast(msg){
  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');
  if(!toast || !text) return;
  text.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.classList.remove('show'), 1800);
}

function toggleMenu(open) {
  const drawer = document.getElementById('menuDrawer');
  const panel = document.getElementById('drawerPanel');
  if (!drawer || !panel) return;
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body.style.overflow = open ? 'hidden' : '';
  drawerOpen = open;
}

function handleNav(label){
  toggleMenu(false);
  if (label === 'Mutasi Saldo') return switchPage('transaksi');
  if (label === 'Beranda') return switchPage('beranda');
  if (label === 'FAQ') return switchPage('faq');
  if (label === 'Lainnya') return switchPage('lainnya');
  if (label === 'Akun') return switchPage('akun');
  showToast('Demo: ' + label);
}

function getUcapan() {
  const jam = new Date().getHours();
  let ucapan = 'Selamat Malam';
  if (jam >= 4 && jam < 11) ucapan = 'Selamat Pagi';
  else if (jam >= 11 && jam < 15) ucapan = 'Selamat Siang';
  else if (jam >= 15 && jam < 18) ucapan = 'Selamat Sore';
  document.querySelectorAll('#ucapan, #ucapan2, #ucapan3, #ucapan4, #ucapan5').forEach(el => el && (el.textContent = ucapan));
}

function maskSaldoText(rawSaldo) {
  const raw = String(rawSaldo ?? '').replace(/[^\d.-]/g, '');
  const digits = raw ? raw.length : 1;
  const maskedDigits = Math.max(1, Math.min(10, digits));
  return 'Rp ' + '•'.repeat(maskedDigits);
}

function formatRupiah(num) {
  const n = Number(String(num || 0).replace(/[^\d.-]/g, '')) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

function applyRupiahFormat(){
  const el = document.getElementById('saldo-member');
  const other = document.getElementById('otherSaldoValue');
  if (!el) return;
  const raw = el.getAttribute('data-saldo') || el.textContent || '0';
  if (saldoDisembunyikan) el.textContent = maskSaldoText(raw);
  else el.textContent = formatRupiah(raw);
  if (other) {
    other.setAttribute('data-saldo', raw);
    other.textContent = saldoDisembunyikan ? maskSaldoText(raw) : formatRupiah(raw);
  }

  const akunSaldo = document.getElementById('akunSaldo');
  if (akunSaldo) akunSaldo.textContent = saldoDisembunyikan ? maskSaldoText(raw) : formatRupiah(raw);

  const akunSaldoMode = document.getElementById('akunSaldoMode');
  if (akunSaldoMode) akunSaldoMode.textContent = saldoDisembunyikan ? 'Disembunyikan' : 'Ditampilkan';

  const otherIcon = document.getElementById('otherToggleSaldoIcon');
  const otherBtn = document.getElementById('otherToggleSaldoBtn');
  if (otherIcon && otherBtn){
    otherIcon.textContent = saldoDisembunyikan ? 'visibility_off' : 'visibility';
    otherBtn.setAttribute('aria-label', saldoDisembunyikan ? 'Tampilkan saldo' : 'Sembunyikan saldo');
  }
}

function toggleSaldoVisibility(){
  saldoDisembunyikan = !saldoDisembunyikan;
  const icon = document.getElementById('toggleSaldoVisibilityIcon');
  const btn = document.getElementById('toggleSaldoVisibilityBtn');
  if (icon && btn){
    icon.textContent = saldoDisembunyikan ? 'visibility_off' : 'visibility';
    btn.setAttribute('aria-label', saldoDisembunyikan ? 'Tampilkan saldo' : 'Sembunyikan saldo');
  }
  applyRupiahFormat();
  showToast(saldoDisembunyikan ? 'Saldo disembunyikan' : 'Saldo ditampilkan');
}

function setupDrawerSwipe() {
  const panel = document.getElementById('drawerPanel');
  if (!panel) return;

  const isOpen = () => drawerOpen;

  panel.addEventListener('touchstart', function(e) {
    if (!isOpen()) return;
    startX = e.touches[0].clientX;
    currentX = startX;
    swiping = true;
    panel.style.transition = 'none';
  }, { passive: true });

  panel.addEventListener('touchmove', function(e) {
    if (!swiping || !isOpen()) return;
    currentX = e.touches[0].clientX;
    const diff = Math.min(0, currentX - startX);
    panel.style.transform = `translateX(${diff}px)`;
  }, { passive: true });

  panel.addEventListener('touchend', function() {
    if (!swiping || !isOpen()) return;
    swiping = false;
    panel.style.transition = '';
    panel.style.transform = '';
    if (currentX - startX < -60) toggleMenu(false);
  });

  panel.addEventListener('touchcancel', function() {
    swiping = false;
    panel.style.transition = '';
    panel.style.transform = '';
  });
}

document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') toggleMenu(false);
});

function switchPage(key){
  const pages = {
    'beranda': document.getElementById('page-beranda'),
    'transaksi': document.getElementById('page-transaksi'),
    'lainnya': document.getElementById('page-lainnya'),
    'faq': document.getElementById('page-faq'),
    'akun': document.getElementById('page-akun')
  };

  Object.values(pages).forEach(p => p && p.classList.remove('active'));
  if (pages[key]) pages[key].classList.add('active');

  const mapping = {
    'beranda': 'nav-beranda',
    'transaksi': 'nav-transaksi',
    'lainnya': 'nav-lainnya',
    'faq': 'nav-faq',
    'akun': 'nav-akun'
  };
  ['nav-beranda','nav-transaksi','nav-lainnya','nav-faq','nav-akun'].forEach(id=>{
    const b = document.getElementById(id);
    if (b) b.classList.toggle('active', id === mapping[key]);
  });

  if (key === 'transaksi') {
    renderTxList();
    if (!apexChart) renderChart();
    loadTransactions(1, true);
  }
  if (key === 'faq') renderFaqList();
  if (key === 'beranda') setHeaderTitle('Beranda');
  if (key === 'transaksi') setHeaderTitle('Riwayat Transaksi');
  if (key === 'lainnya') setHeaderTitle('Layanan Lainnya');
  if (key === 'faq') setHeaderTitle('FAQ');
  if (key === 'akun') setHeaderTitle('Akun Saya');
  toggleMenu(false);
}

function setHeaderTitle(title){
  const candidates = ['headerTitle','headerTitle2','headerTitle3','headerTitle4','headerTitle5'].map(id=>document.getElementById(id)).filter(Boolean);
  const found = candidates.find(el => el.offsetParent !== null) || candidates[0];
  if (found) found.textContent = title;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '-';
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateKey(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['selesai', 'lunas', 'di kirim', 'dikirim', 'success', 'berhasil'].some(v => s.includes(v))) return 'success';
  if (['di proses', 'proses', 'pending'].some(v => s.includes(v))) return 'pending';
  if (['di batalkan', 'batal', 'gagal', 'failed'].some(v => s.includes(v))) return 'failed';
  return 'gray';
}

function getStatusIcon(status) {
  const s = normalizeStatus(status);
  if (s === 'success') return 'check_circle';
  if (s === 'pending') return 'autorenew';
  if (s === 'failed') return 'cancel';
  return 'info';
}

function getStatusText(status) {
  const s = String(status || '').toLowerCase();
  if (['selesai', 'lunas', 'di kirim', 'dikirim', 'success', 'berhasil'].some(v => s.includes(v))) return 'SUKSES';
  if (['di proses', 'proses', 'pending'].some(v => s.includes(v))) return 'PROSES';
  if (['di batalkan', 'batal', 'gagal', 'failed'].some(v => s.includes(v))) return 'GAGAL';
  return 'PROSES';
}

function normalizeItems(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.data)) return result.data;
  if (Array.isArray(result.result)) return result.result;
  if (Array.isArray(result.transaksi)) return result.transaksi;
  return [];
}

function getField(item, keys, fallback = '-') {
  for (const key of keys) {
    if (item && item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') return item[key];
  }
  return fallback;
}

function isTagihanItem(item) {
  const text = [
    getField(item, ['nama_barang', 'nama_produk', 'product_name', 'nama'], ''),
    getField(item, ['kategori', 'type', 'jenis', 'tipe'], ''),
    getField(item, ['status', 'status_pengiriman', 'keterangan', 'state'], '')
  ].join(' ').toLowerCase();
  return text.includes('tagihan') || text.includes('billing') || text.includes('invoice');
}

function updateTxStats(items){
  let total = 0, success = 0, pending = 0, failed = 0;
  items.forEach(item => {
    total++;
    const st = normalizeStatus(getField(item, ['status', 'status_pengiriman', 'keterangan', 'state'], ''));
    if (st === 'success') success++;
    else if (st === 'pending') pending++;
    else if (st === 'failed') failed++;
  });
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total', total);
  set('stat-success', success);
  set('stat-pending', pending);
  set('stat-failed', failed);
}

function renderTxList(){
  const list = document.getElementById('txList');
  const empty = document.getElementById('txEmpty');
  if(!list || !empty) return;

  const q = (document.getElementById('txSearchInput')?.value || currentTxKeyword || '').trim().toLowerCase();

  const filtered = allTransactions.filter(t => {
    const status = normalizeStatus(getField(t, ['status', 'status_pengiriman', 'keterangan', 'state'], ''));
    const jenis = String(getField(t, ['jenis', 'type'], '')).toLowerCase();
    const isTagihan = isTagihanItem(t);

    const matchFilter =
      currentTxFilter === 'semua' ||
      (currentTxFilter === 'sukses' && status === 'success') ||
      (currentTxFilter === 'proses' && status === 'pending') ||
      (currentTxFilter === 'gagal' && status === 'failed') ||
      (currentTxFilter === 'tagihan' && isTagihan);

    const text = [
      getField(t, ['nama_barang', 'nama_produk', 'product_name', 'nama', 'judul'], ''),
      getField(t, ['nomor_pembayaran', 'ref_id', 'id_transaksi', 'invoice_id'], ''),
      getField(t, ['status', 'status_pengiriman', 'keterangan', 'state'], ''),
      getField(t, ['tujuan', 'tujuan_pembayaran', 'metode', 'kategori'], ''),
      jenis
    ].join(' ').toLowerCase();

    const itemDateKey = formatDateKey(getField(t, ['tanggal', 'created_at', 'date', 'waktu'], ''));
    const matchDate = !currentDateFilter || itemDateKey === currentDateFilter;

    return matchFilter && matchDate && (!q || text.includes(q) || status.includes(q));
  });

  updateTxStats(allTransactions);

  if (!filtered.length){
    list.innerHTML = '';
    empty.classList.remove('hidden');
    empty.querySelector('h3').textContent = isLoaded ? ((q || currentDateFilter || currentTxFilter !== 'semua') ? 'Data tidak ditemukan.' : 'Tidak Ada Riwayat Transaksi') : 'Memuat data...';
    return;
  }

  empty.classList.add('hidden');
  const grouped = {};
  filtered.forEach(item => {
    const key = formatDate(getField(item, ['tanggal', 'created_at', 'date', 'waktu'], ''));
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  list.innerHTML = '';
  Object.keys(grouped).forEach(date => {
    const header = document.createElement('div');
    header.className = 'date-header';
    header.innerHTML = `<div class="judul"><span>${date}</span></div>`;
    list.appendChild(header);

    grouped[date].forEach((t, idx) => {
      const name = getField(t, ['nama_barang', 'nama_produk', 'product_name', 'nama', 'judul'], '-');
      const nomor = getField(t, ['nomor_pembayaran', 'ref_id', 'id_transaksi', 'invoice_id'], '-');
      const tanggal = getField(t, ['tanggal', 'created_at', 'date', 'waktu'], '-');
      const meta = getField(t, ['tujuan', 'tujuan_pembayaran', 'metode', 'kategori', 'meta'], '-');
      const img = isImageHidden ? '' : `<img src="${getField(t, ['url_gambar_produk', 'image', 'gambar'], 'https://via.placeholder.com/180x180.png?text=Tx+' + (idx + 1))}" alt="${name}" loading="lazy" />`;
      const statusRaw = getField(t, ['status', 'status_pengiriman', 'keterangan', 'state'], '');

      const card = document.createElement('div');
      card.className = 'transaction-card';
      card.innerHTML = `
        ${img}
        <div class="transaction-details">
          <small>${formatDate(tanggal)}</small>
          <strong>${name}</strong>
          <div class="meta-row">
            <span class="meta-pill"><span class="material-icons-outlined text-[14px]">tag</span>#${nomor}</span>
            <span class="meta-pill"><span class="material-icons-outlined text-[14px]">payments</span>${meta}</span>
          </div>
        </div>
        <div class="transaction-status ${normalizeStatus(statusRaw)}">
          <i class="material-icons-outlined">${getStatusIcon(statusRaw)}</i>
          <span>${getStatusText(statusRaw)}</span>
        </div>
      `;
      const link = getField(t, ['link_transaksi', 'link'], '');
      if (link && link !== '-') {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => window.open(link, '_blank'));
      }
      list.appendChild(card);
    });
  });
}

async function loadTransactions(page = 1, reset = true) {
  const url = `${API_CONFIG.baseUrl}?token=${encodeURIComponent(API_CONFIG.token)}&token_user=${encodeURIComponent(API_CONFIG.tokenUser)}&id_user=${encodeURIComponent(API_CONFIG.idUser)}&page=${page}`;
  const list = document.getElementById('txList');
  if (page === 1 && list) list.innerHTML = '<div class="text-center py-6 text-slate-500 font-semibold">Memuat transaksi...</div>';

  try {
    const res = await fetch(url);
    const json = await res.json();
    const data = normalizeItems(json);

    if (reset) allTransactions = [];
    if (data.length) {
      allTransactions = allTransactions.concat(data);
      isLoaded = true;
      renderTxList();
      if (data.length > 0) loadTransactions(page + 1, false);
    } else {
      isLoaded = true;
      renderTxList();
    }
  } catch (err) {
    isLoaded = true;
    if (list) list.innerHTML = '<div class="text-center py-6 text-red-500 font-semibold">Gagal memuat data transaksi.</div>';
  }
}

function setTxFilter(filter){
  currentTxFilter = filter;
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  const map = { semua: 0, sukses: 1, proses: 2, gagal: 3, tagihan: 4 };
  const btn = document.querySelectorAll('.filter-pill')[map[filter]];
  if (btn) btn.classList.add('active');
  renderTxList();
}

function toggleTxImages(){
  isImageHidden = !isImageHidden;
  renderTxList();
  showToast(isImageHidden ? 'Gambar disembunyikan' : 'Gambar ditampilkan');
}

function renderChart(){
  const el = document.querySelector('#apexChart');
  if (!el) return;
  const options = {
    chart: { type: 'area', height: 260, toolbar: { show: false }, animations: { enabled: true } },
    series: [{ name: 'Nominal', data: [10, 18, 12, 25, 22, 28, 20] }],
    xaxis: { categories: ['Minggu 1','Minggu 2','Minggu 3','Minggu 4','Minggu 5','Minggu 6','Minggu 7'] },
    grid: { strokeDashArray: 5, padding: { left: 10, right: 10, top: 0, bottom: 0 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 0.7, opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: ['#2563eb'],
    tooltip: { y: { formatter: (val)=> `${val}k` } },
  };
  apexChart = new ApexCharts(el, options);
  apexChart.render();
}

function toggleFaq(btn){
  const item = btn.closest('.faq-item');
  if(!item) return;
  item.classList.toggle('open');
}

function openTxFilterModal(){
  const modal = document.getElementById('txFilterModal');
  if (!modal) return;
  const input = document.getElementById('txFilterSearch');
  if (input) input.value = currentTxKeyword || '';
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  modal.setAttribute('aria-hidden', 'false');
}

function closeTxFilterModal(){
  const modal = document.getElementById('txFilterModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  modal.setAttribute('aria-hidden', 'true');
}

function setupLainnyaFilter(){
  const serviceList = document.getElementById('serviceList');
  const emptyState = document.getElementById('emptyState');
  if (!serviceList || !emptyState) return;
  const items = Array.from(serviceList.querySelectorAll('.service-item'));

  function filterItems() {
    const q = (window.__serviceKeyword || '').trim().toLowerCase();
    const category = window.__serviceCategory || 'semua';
    let visible = 0;

    items.forEach(btn => {
      const text = (btn.dataset.name || btn.textContent || '').toLowerCase();
      const cat = (btn.dataset.category || '').toLowerCase();
      const match = (!q || text.includes(q)) && (category === 'semua' || cat === category);
      btn.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    emptyState.style.display = visible ? 'none' : 'block';
  }

  window.filterLainnya = function(keyword = '', category = 'semua'){
    window.__serviceKeyword = keyword;
    window.__serviceCategory = category;
    filterItems();
  };

  filterItems();
}

document.addEventListener('DOMContentLoaded', function () {
  getUcapan();

  const dn = document.getElementById('drawerNama');
  const dt = document.getElementById('drawerTelp');
  if(dn) dn.textContent = userProfile.nama;
  if(dt) dt.textContent = userProfile.telp;

  const saldoEl = document.getElementById('saldo-member');
  const poinEl = document.getElementById('point-member');

  if(saldoEl){
    saldoEl.setAttribute('data-saldo', userProfile.saldo || '0');
    saldoEl.textContent = '0';
  }
  if(poinEl) poinEl.textContent = userProfile.poin || '0';

  const akunNama = document.getElementById('akunNama');
  const akunTelp = document.getElementById('akunTelp');
  const akunPoin = document.getElementById('akunPoin');
  if(akunNama) akunNama.textContent = userProfile.nama;
  if(akunTelp) akunTelp.textContent = userProfile.telp;
  if(akunPoin) akunPoin.textContent = userProfile.poin || '0';

  const icon = document.getElementById('toggleSaldoVisibilityIcon');
  const btn = document.getElementById('toggleSaldoVisibilityBtn');
  if (icon && btn) {
    icon.textContent = 'visibility_off';
    btn.setAttribute('aria-label', 'Tampilkan saldo');
  }

  applyRupiahFormat();
  setupDrawerSwipe();
  setupLainnyaFilter();
  renderTxList();
  renderFaqList();

  document.getElementById('closeTxFilterModal')?.addEventListener('click', closeTxFilterModal);
  document.getElementById('txFilterModal')?.addEventListener('click', function(e){ if (e.target === this) closeTxFilterModal(); });
  document.getElementById('txFilterSearch')?.addEventListener('input', function(){ currentTxKeyword = this.value.trim(); renderTxList(); });
  document.getElementById('clearTxFilterSearch')?.addEventListener('click', function(){
    const input = document.getElementById('txFilterSearch');
    const main = document.getElementById('txSearchInput');
    if (input) input.value = '';
    if (main) main.value = '';
    currentTxKeyword = '';
    renderTxList();
  });
  document.getElementById('applyTxFilter')?.addEventListener('click', function(){
    const input = document.getElementById('txFilterSearch');
    currentTxKeyword = input?.value.trim() || '';
    renderTxList();
    closeTxFilterModal();
  });
  document.getElementById('resetTxFilter')?.addEventListener('click', function(){
    currentTxFilter = 'semua';
    currentTxKeyword = '';
    const input = document.getElementById('txFilterSearch');
    const main = document.getElementById('txSearchInput');
    if (input) input.value = '';
    if (main) main.value = '';
    renderTxList();
    closeTxFilterModal();
  });

  switchPage('beranda');
  loadTransactions(1, true);
});