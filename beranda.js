let drawerOpen = false;
let startX = 0;
let currentX = 0;
let swiping = false;
let balanceVisible = false;
let balanceVisibleAkun = false;
let toastTimer = null;
const pageOrder = ['beranda', 'riwayat', 'lainnya', 'faq', 'akun'];

let allTransactions = [];
let currentFilter = 'semua';
let currentKeyword = '';
let currentDateFilter = '';
let isLoaded = false;
let isImageHidden = localStorage.getItem('isImageHidden') === 'true';

function getPageTitle(pageId){ return ({beranda:'Beranda',riwayat:'Riwayat Transaksi',lainnya:'Lainnya',faq:'FAQ',akun:'Akun Saya'})[pageId] || 'Beranda'; }
function getButtonForPage(pageId){ return document.querySelectorAll('.nav-btn')[pageOrder.indexOf(pageId)] || null; }

function getUcapan(){
  const jam = new Date().getHours();
  const text = jam>=4&&jam<11?'Selamat Pagi':jam>=11&&jam<15?'Selamat Siang':jam>=15&&jam<18?'Selamat Sore':'Selamat Malam';
  const el = document.getElementById('ucapan');
  if (el) el.textContent = text;
}

function formatRupiah(num){
  const n = Number(String(num || 0).replace(/[^\d.-]/g, '')) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatSaldoElements() {
  const saldoBeranda = document.getElementById('saldo-member');
  const saldoLainnya = document.getElementById('balanceText');
  const balanceWrapper = document.getElementById('balance');
  const saldoAkun = document.getElementById('balanceTextAkun');

  if (saldoBeranda) {
    const raw = saldoBeranda.getAttribute('data-saldo') || saldoBeranda.textContent;
    saldoBeranda.textContent = formatRupiah(raw);
  }

  if (saldoLainnya && balanceWrapper) {
    const raw = balanceWrapper.getAttribute('data-saldo') || saldoLainnya.textContent;
    saldoLainnya.textContent = balanceVisible ? formatRupiah(raw) : '••••••••';
  }

  if (saldoAkun) {
    const raw = saldoAkun.getAttribute('data-saldo') || saldoAkun.textContent;
    saldoAkun.textContent = balanceVisibleAkun ? formatRupiah(raw) : '••••••••';
  }
}

function toggleMenu(open){
  const drawer = document.getElementById('menuDrawer');
  const panel = document.getElementById('drawerPanel');
  if (!drawer || !panel) return;
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body.style.overflow = open ? 'hidden' : '';
  drawerOpen = open;
  panel.style.transition = '';
  panel.style.transform = '';
}

function setupDrawerSwipe(){
  const panel = document.getElementById('drawerPanel');
  if (!panel) return;

  panel.addEventListener('touchstart', e => {
    if (!drawerOpen) return;
    startX = e.touches[0].clientX;
    currentX = startX;
    swiping = true;
    panel.style.transition = 'none';
  }, { passive:true });

  panel.addEventListener('touchmove', e => {
    if (!swiping || !drawerOpen) return;
    currentX = e.touches[0].clientX;
    panel.style.transform = `translateX(${Math.min(0, currentX - startX)}px)`;
  }, { passive:true });

  panel.addEventListener('touchend', () => {
    if (!swiping || !drawerOpen) return;
    swiping = false;
    panel.style.transition = '';
    panel.style.transform = '';
    if (currentX - startX < -60) toggleMenu(false);
  });
}

function switchPage(pageId, btn){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');

  const h1 = document.getElementById(
    pageId === 'beranda' ? 'pageTitle' :
    pageId === 'riwayat' ? 'pageTitle2' :
    pageId === 'lainnya' ? 'pageTitle3' :
    pageId === 'faq' ? 'pageTitle4' : 'pageTitle5'
  );
  if (h1) h1.textContent = getPageTitle(pageId);

  if (pageId === 'riwayat') renderTransactions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function swipeToPage(direction){
  const index = pageOrder.indexOf(document.querySelector('.page.active')?.id || 'beranda');
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= pageOrder.length) return;
  const nextPageId = pageOrder[nextIndex];
  switchPage(nextPageId, getButtonForPage(nextPageId));
}

function setupNavSwipe(){
  let touchStartX = 0, touchStartY = 0, tracking = false;
  document.addEventListener('touchstart', e => {
    if (drawerOpen) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    tracking = true;
  }, { passive:true });

  document.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    const tag = e.target?.tagName;
    if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
    dx < 0 ? swipeToPage(1) : swipeToPage(-1);
  }, { passive:true });
}

function initFlashSaleSchedule(){
  const startTime = new Date();
  startTime.setHours(0,0,0,0);
  const endTime = new Date();
  endTime.setHours(23,59,0,0);

  const section = document.getElementById('flashSaleSection');
  const startEl = document.getElementById('flashStartTime');
  const endEl = document.getElementById('flashEndTime');
  const statusEl = document.getElementById('flashStatus');

  const formatter = new Intl.DateTimeFormat('id-ID', {
    day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit',
    timeZone:'Asia/Jakarta', hour12:false
  });

  if (startEl) startEl.textContent = formatter.format(startTime) + ' WIB';
  if (endEl) endEl.textContent = formatter.format(endTime) + ' WIB';

  function update(){
    const now = new Date();
    if (now >= endTime){
      section?.classList.add('flash-sale-hidden');
      if(statusEl) statusEl.textContent='Flash sale sudah selesai.';
      return;
    }
    section?.classList.remove('flash-sale-hidden');
    const remaining = endTime - now;
    const totalMinutes = Math.max(0, Math.floor(remaining / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = Math.max(0, Math.floor((remaining % 60000) / 1000));
    if(statusEl) statusEl.textContent = `Flash sale aktif. Sisa waktu ${hours} jam ${minutes} menit ${seconds} detik.`;
  }

  update();
  setInterval(update, 1000);
}

function toggleBalance(){
  const el = document.getElementById('balanceText');
  const icon = document.getElementById('toggleBalanceIcon');
  const balance = document.getElementById('balance');
  if(!el || !icon || !balance) return;
  const raw = balance.getAttribute('data-saldo') || '0';
  balanceVisible = !balanceVisible;
  el.textContent = balanceVisible ? formatRupiah(raw) : '••••••••';
  icon.textContent = balanceVisible ? 'visibility' : 'visibility_off';
}

function toggleBalanceAkun(){
  const el = document.getElementById('balanceTextAkun');
  const icon = document.getElementById('toggleBalanceIconAkun');
  if(!el || !icon) return;
  const raw = el.getAttribute('data-saldo') || '0';
  balanceVisibleAkun = !balanceVisibleAkun;
  el.textContent = balanceVisibleAkun ? formatRupiah(raw) : '••••••••';
  icon.textContent = balanceVisibleAkun ? 'visibility' : 'visibility_off';
}

function refreshBalance(){
  showToast('Saldo diperbarui');
  formatSaldoElements();
}

function showToast(message){
  const toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
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

function updateStats() {
  let total = 0, success = 0, pending = 0, failed = 0;
  allTransactions.forEach(item => {
    const status = normalizeStatus(getField(item, ['status', 'status_pengiriman', 'keterangan', 'state'], ''));
    total++;
    if (status === 'success') success++;
    else if (status === 'pending') pending++;
    else if (status === 'failed') failed++;
  });
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-success').textContent = success;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-failed').textContent = failed;
}

function renderTransactions() {
  const container = document.getElementById('riwayat-list');
  const empty = document.getElementById('riwayat-empty');
  if (!container || !empty) return;

  const keywordInput = document.getElementById('searchInput');
  const liveKeyword = keywordInput ? keywordInput.value.trim().toLowerCase() : '';
  const mergedKeyword = (currentKeyword || liveKeyword).toLowerCase();

  const filtered = allTransactions.filter(item => {
    const status = normalizeStatus(getField(item, ['status', 'status_pengiriman', 'keterangan', 'state'], ''));
    const matchFilter =
      currentFilter === 'semua' ||
      (currentFilter === 'sukses' && status === 'success') ||
      (currentFilter === 'proses' && status === 'pending') ||
      (currentFilter === 'gagal' && status === 'failed') ||
      (currentFilter === 'tagihan' && isTagihanItem(item));

    const text = [
      getField(item, ['nama_barang', 'nama_produk', 'product_name', 'nama'], ''),
      getField(item, ['nomor_pembayaran', 'ref_id', 'id_transaksi', 'invoice_id'], ''),
      getField(item, ['status', 'status_pengiriman', 'keterangan', 'state'], '')
    ].join(' ').toLowerCase();

    const itemDateKey = formatDateKey(getField(item, ['tanggal', 'created_at', 'date'], ''));
    const matchDate = !currentDateFilter || itemDateKey === currentDateFilter;

    return matchFilter && matchDate && (!mergedKeyword || text.includes(mergedKeyword));
  });

  if (!filtered.length) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    empty.querySelector('h3').textContent = isLoaded ? (mergedKeyword || currentDateFilter || currentFilter !== 'semua' ? 'Data tidak ditemukan.' : 'Tidak Ada Riwayat Transaksi.') : 'Memuat data...';
    updateStats();
    return;
  }

  empty.classList.add('hidden');
  const grouped = {};
  filtered.forEach(item => {
    const key = formatDate(getField(item, ['tanggal', 'created_at', 'date'], ''));
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  container.innerHTML = '';
  Object.keys(grouped).forEach(date => {
    const header = document.createElement('div');
    header.className = 'date-header';
    header.innerHTML = `<div class="judul"><span>${date}</span></div>`;
    container.appendChild(header);

    grouped[date].forEach(item => {
      const statusRaw = getField(item, ['status', 'status_pengiriman', 'keterangan', 'state'], '');
      const card = document.createElement('div');
      card.className = 'transaction-card';

      const name = getField(item, ['nama_barang', 'nama_produk', 'product_name', 'nama'], '-');
      const nomor = getField(item, ['nomor_pembayaran', 'ref_id', 'id_transaksi', 'invoice_id'], '-');
      const tanggal = getField(item, ['tanggal', 'created_at', 'date'], '-');
      const img = getField(item, ['url_gambar_produk', 'image', 'gambar'], 'https://via.placeholder.com/60');

      card.innerHTML = `
        <img src="${img}" alt="${name}" loading="lazy" />
        <div class="transaction-details">
          <small>${formatDate(tanggal)}</small>
          <strong>${name}</strong>
          <div class="meta-row">
            <span class="meta-pill"><span class="material-icons-outlined text-[14px]">tag</span>#${nomor}</span>
          </div>
        </div>
        <div class="transaction-status ${normalizeStatus(statusRaw)}">
          <i class="material-icons-outlined">${getStatusIcon(statusRaw)}</i>
          <span>${getStatusText(statusRaw)}</span>
        </div>
      `;

      const link = getField(item, ['link_transaksi', 'link'], '');
      if (link && link !== '-') {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => window.open(link, '_blank'));
      }
      container.appendChild(card);
    });
  });

  applyImageVisibility();
  updateStats();
}

function loadTransactions(page = 1, reset = true) {
  const token = 'eyJhcHAiOiI1ODExNyIsImF1dGgiOiIyMDIxMDIwMiIsInNpZ24iOiJHWjRlRDB5S0c1aFUyUGhRUjNob2pBPT0ifQ==';
  const tokenUser = '{{token_user}}';
  const idUser = '{{id_user}}';
  const url = `https://openapi.bukaolshop.net/v1/user/transaksi?token=${encodeURIComponent(token)}&token_user=${encodeURIComponent(tokenUser)}&id_user=${encodeURIComponent(idUser)}&page=${page}`;
  const container = document.getElementById('riwayat-list');

  if (page === 1 && container) container.innerHTML = '<div class="text-center py-6 text-slate-500 font-semibold">Memuat transaksi...</div>';

  fetch(url)
    .then(res => res.json())
    .then(json => {
      const data = normalizeItems(json);
      if (reset) allTransactions = [];
      if (data.length) {
        allTransactions = allTransactions.concat(data);
        isLoaded = true;
        renderTransactions();
        loadTransactions(page + 1, false);
      } else {
        isLoaded = true;
        renderTransactions();
      }
    })
    .catch(() => {
      isLoaded = true;
      if (container) container.innerHTML = '<div class="text-center py-6 text-red-500 font-semibold">Gagal memuat data transaksi.</div>';
    });
}

function applyImageVisibility() {
  document.querySelectorAll('.transaction-card img').forEach(img => {
    img.style.display = isImageHidden ? 'none' : 'block';
  });
}

function setImageVisibility(hidden) {
  isImageHidden = hidden;
  localStorage.setItem('isImageHidden', String(isImageHidden));
  applyImageVisibility();
}

function toggleImages() { setImageVisibility(!isImageHidden); }

function openFilterModal() {
  const modal = document.getElementById('filter-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeFilterModal() {
  const modal = document.getElementById('filter-modal');
  if (!modal) return;
  modal.classList.remove('flex');
  modal.classList.add('hidden');
}

function filterServices() {
  const items = [...document.querySelectorAll('.service-item')];
  const q = (new URLSearchParams(location.search).get('q') || '').trim().toLowerCase();
  const cat = (new URLSearchParams(location.search).get('category') || '').trim().toLowerCase();
  let visible = 0;

  items.forEach(btn => {
    const name = (btn.dataset.name || '').toLowerCase();
    const category = (btn.dataset.category || '').toLowerCase();
    const match = (!q || name.includes(q) || btn.innerText.toLowerCase().includes(q)) && (!cat || category === cat);
    btn.style.display = match ? 'flex' : 'none';
    if (match) visible++;
  });

  const empty = document.getElementById('emptyState');
  if (empty) empty.style.display = visible ? 'none' : 'block';
}

function filterFaq(query){ const q = (query || '').toLowerCase().trim(); document.querySelectorAll('.faq-item').forEach(item => item.style.display = !q || item.textContent.toLowerCase().includes(q) ? '' : 'none'); }
function filterFaqByCategory(category, btn){ document.querySelectorAll('.faq-chip').forEach(chip => chip.classList.remove('active')); btn?.classList.add('active'); const q = (document.getElementById('faqSearch')?.value || '').toLowerCase().trim(); document.querySelectorAll('.faq-item').forEach(item => { const cat = item.getAttribute('data-category') || ''; const text = item.textContent.toLowerCase(); item.style.display = (category === 'all' || cat === category) && (!q || text.includes(q)) ? '' : 'none'; }); }

function bindEvents() {
  document.getElementById('close-filter-modal')?.addEventListener('click', closeFilterModal);
  document.getElementById('filter-modal')?.addEventListener('click', function (e) { if (e.target === this) closeFilterModal(); });

  document.getElementById('filter-search')?.addEventListener('input', function () {
    currentKeyword = this.value.trim();
    renderTransactions();
  });

  document.getElementById('clear-filter-search')?.addEventListener('click', function () {
    const input = document.getElementById('filter-search');
    if (input) input.value = '';
    currentKeyword = '';
    renderTransactions();
  });

  document.getElementById('filter-date')?.addEventListener('change', function () {
    currentDateFilter = this.value;
    renderTransactions();
  });

  document.getElementById('clear-date')?.addEventListener('click', function () {
    const input = document.getElementById('filter-date');
    if (input) input.value = '';
    currentDateFilter = '';
    renderTransactions();
  });

  document.getElementById('apply-filter')?.addEventListener('click', function () {
    currentKeyword = document.getElementById('filter-search')?.value.trim() || '';
    renderTransactions();
    closeFilterModal();
  });

  document.getElementById('reset-all-filter')?.addEventListener('click', function () {
    currentFilter = 'semua';
    currentDateFilter = '';
    currentKeyword = '';
    const searchInput = document.getElementById('filter-search');
    const dateInput = document.getElementById('filter-date');
    const mainSearch = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    if (dateInput) dateInput.value = '';
    if (mainSearch) mainSearch.value = '';
    renderTransactions();
    closeFilterModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeFilterModal();
  });
}

function setFilter(filter) {
  currentFilter = filter;
  renderTransactions();
}

document.addEventListener('DOMContentLoaded', function () {
  getUcapan();
  setupDrawerSwipe();
  setupNavSwipe();
  initFlashSaleSchedule();
  formatSaldoElements();
  bindEvents();
  applyImageVisibility();
  loadTransactions(1, true);
  filterServices();
});