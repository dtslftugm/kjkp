(function () {
  'use strict';

  /* ============================================================
     SIMPLE LOGIN GATE
     Kata sandi disimpan di localStorage setelah berhasil login.
     Untuk keamanan lebih tinggi, integrasikan dengan backend.
     ============================================================ */
  var ADMIN_PASSWORD = 'dtsl2026'; // Ganti sesuai kebutuhan

  function isAuthenticated() {
    return localStorage.getItem('kjkp-admin-auth') === 'ok';
  }

  function showLoginModal() {
    var overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  function hideLoginModal() {
    var overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function setupLogin() {
    var overlay = document.getElementById('login-overlay');
    var form = document.getElementById('login-form');
    var inputPwd = document.getElementById('login-password');
    var errMsg = document.getElementById('login-error');
    var btnLogout = document.getElementById('btn-logout');

    if (!overlay) return;

    if (!isAuthenticated()) {
      showLoginModal();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (inputPwd.value === ADMIN_PASSWORD) {
        localStorage.setItem('kjkp-admin-auth', 'ok');
        hideLoginModal();
        initDashboard();
      } else {
        errMsg.textContent = 'Kata sandi salah. Coba lagi.';
        inputPwd.value = '';
        inputPwd.focus();
      }
    });

    if (btnLogout) {
      btnLogout.addEventListener('click', function () {
        localStorage.removeItem('kjkp-admin-auth');
        showLoginModal();
      });
    }
  }

  /* ============================================================
      STATE
     ============================================================ */
  var allData = [];   // seluruh data setelah digabung
  var filtered = [];   // data setelah filter diterapkan
  var sortCol = 'sisa_hari';
  var sortDir = 'asc';
  var filterKat = 'semua';
  var filterWaktu = '12';  // default 12 bulan
  var searchQuery = '';

  // State untuk Penghargaan
  var filteredPenghargaan = [];
  var filterPenghargaanJenis = 'semua';
  var filterPenghargaanMk = 'semua';
  var filterPenghargaanTipe = 'semua';
  var searchPenghargaanQuery = '';
  var sortPenghargaanCol = 'masa_kerja';
  var sortPenghargaanDir = 'desc';
  var currentView = 'pensiun';

  /* ============================================================
     DOM REFERENCES
     ============================================================ */
  var elBody = document.getElementById('table-body');
  var elLoading = document.getElementById('state-loading');
  var elEmpty = document.getElementById('state-empty');
  var elError = document.getElementById('state-error');
  var elErrorMsg = document.getElementById('error-msg');
  var elRowCount = document.getElementById('row-count');
  var elUpdated = document.getElementById('last-updated');
  var elHeaderStat = document.getElementById('header-status');

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    feather.replace();
    setupTheme();
    setupSidebar();
    setupLogin();

    if (isAuthenticated()) {
      initDashboard();
    }
  });

  function initDashboard() {
    setupChips();
    setupSearch();
    setupSortHeaders();
    setupNavigation();
    setupPenghargaanListeners();
    loadData();
  }

  /* ============================================================
     SIDEBAR – Collapse / Expand / Auto-collapse
     ============================================================ */
  function setupSidebar() {
    var sidebar = document.getElementById('sidebar');
    var btnOpen = document.getElementById('sidebar-toggle');
    var btnClose = document.getElementById('sidebar-close');
    var wrapper = document.querySelector('.main-content-wrapper');

    function openSidebar() {
      sidebar.classList.add('open');
      sidebar.classList.remove('collapsed');
      if (wrapper) wrapper.classList.remove('sidebar-collapsed');
    }

    function closeSidebar() {
      // Mobile: slide out. Desktop: collapse to icon-only.
      if (window.innerWidth < 900) {
        sidebar.classList.remove('open');
      } else {
        sidebar.classList.add('collapsed');
        sidebar.classList.remove('open');
        if (wrapper) wrapper.classList.add('sidebar-collapsed');
      }
    }

    function toggleSidebar() {
      if (window.innerWidth < 900) {
        if (sidebar.classList.contains('open')) {
          closeSidebar();
        } else {
          openSidebar();
        }
      } else {
        if (sidebar.classList.contains('collapsed')) {
          openSidebar();
        } else {
          closeSidebar();
        }
      }
    }

    function autoCollapse() {
      if (window.innerWidth < 900) {
        sidebar.classList.remove('open', 'collapsed');
        if (wrapper) wrapper.classList.remove('sidebar-collapsed');
      } else {
        // Start expanded on desktop
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('open');
        if (wrapper) wrapper.classList.remove('sidebar-collapsed');
      }
    }

    if (btnOpen) {
      btnOpen.addEventListener('click', toggleSidebar);
    }

    if (btnClose) {
      btnClose.addEventListener('click', toggleSidebar);
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function (e) {
      if (window.innerWidth < 900 &&
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        (!btnOpen || (!btnOpen.contains(e.target) && e.target !== btnOpen)) &&
        (!btnClose || (!btnClose.contains(e.target) && e.target !== btnClose))) {
        closeSidebar();
      }
    });

    // Responsive auto-adjust
    window.addEventListener('resize', autoCollapse);

    autoCollapse();
  }

  /* ============================================================
     THEME
     ============================================================ */
  function setupTheme() {
    var btn = document.getElementById('theme-toggle');
    var icon = document.getElementById('theme-icon');
    var label = document.getElementById('theme-label');

    function applyTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('kjkp-theme', t);
      icon.textContent = (t === 'light') ? '☀️' : '🌙';
      label.textContent = (t === 'light') ? 'Light' : 'Dark';
    }

    // Sinkronkan label dengan tema yang sudah diinisialisasi
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current);

    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });
  }

  /* ============================================================
     DATA LOADING
     ============================================================ */
  function loadData() {
    showState('loading');
    elHeaderStat.textContent = 'Memuat data…';

    DashboardAPI.getPensiunData()
      .then(function (data) {
        var dosen = data.dosen || [];
        var tendik = data.tendik || [];
        allData = dosen.concat(tendik);

        var now = new Date();
        if (elUpdated) elUpdated.textContent = 'Diperbarui: ' + formatDateTime(now);
        elHeaderStat.textContent = 'Cached · ' + allData.length + ' data';

        // Proses data untuk Penghargaan & Demografi
        allData.forEach(function (r) {
          var isPNS = String(r.nip || '').startsWith('19') && String(r.nip || '').length === 18;
          r.isPNS = isPNS;

          // ── Masa Kerja dari TGL SK CPNS ──────────────────────────────────
          // Digunakan untuk: Satyalancana Karya Satya (khusus PNS)
          r.tmtDate = parseDMY(r.tgl_sk_cpns);
          if (r.tmtDate) {
            var mkCpns = calcMasaKerja(r.tmtDate, now);
            r.mkTahun = mkCpns.tahun;
            r.mkBulan = mkCpns.bulan;
            r.mkLabel = mkCpns.label;
            r.mkTotal = mkCpns.totalTahunDesimal;
          } else {
            r.mkTahun = 0;
            r.mkBulan = 0;
            r.mkLabel = '–';
            r.mkTotal = 0;
          }

          // ── Masa Kerja dari TGL SK UGM ───────────────────────────────────
          // Digunakan untuk: Penghargaan Kesetiaan UGM (PNS & Dosen/Tendik Tetap)
          r.tmtUGMDate = parseDMY(r.tgl_sk_ugm);
          var mkUGMTahun, mkUGMBulan, mkUGMLabel, mkUGMTotal;
          if (r.tmtUGMDate) {
            var mkUGM = calcMasaKerja(r.tmtUGMDate, now);
            mkUGMTahun = mkUGM.tahun;
            mkUGMBulan = mkUGM.bulan;
            mkUGMLabel = mkUGM.label;
            mkUGMTotal = mkUGM.totalTahunDesimal;
          } else {
            mkUGMTahun = 0;
            mkUGMBulan = 0;
            mkUGMLabel = '–';
            mkUGMTotal = 0;
          }
          r.mkUGMTahun = mkUGMTahun;
          r.mkUGMBulan = mkUGMBulan;
          r.mkUGMLabel = mkUGMLabel;
          r.mkUGMTotal = mkUGMTotal;

          // Kelayakan Kesetiaan UGM: 15, 25, 35 Tahun (PNS & Dosen/Tendik Tetap)
          // Dihitung dari TGL SK UGM
          if (mkUGMTahun >= 35) {
            r.awardUGM = { level: 35, tier: 'gold', label: 'Kesetiaan 35 Th' };
          } else if (mkUGMTahun >= 25) {
            r.awardUGM = { level: 25, tier: 'silver', label: 'Kesetiaan 25 Th' };
          } else if (mkUGMTahun >= 15) {
            r.awardUGM = { level: 15, tier: 'bronze', label: 'Kesetiaan 15 Th' };
          } else {
            r.awardUGM = { level: 0, tier: 'none', label: r.tmtUGMDate ? 'Belum (' + mkUGMTahun + ' Th)' : '–' };
          }

          // Kelayakan Satyalancana Karya Satya: 10, 20, 30 Tahun (Khusus PNS)
          // Dihitung dari TGL SK CPNS
          if (!isPNS) {
            r.awardSatya = { level: -1, tier: 'ineligible', label: 'Non-PNS' };
          } else if (r.mkTahun >= 30) {
            r.awardSatya = { level: 30, tier: 'gold', label: 'Satyalancana 30 Th' };
          } else if (r.mkTahun >= 20) {
            r.awardSatya = { level: 20, tier: 'silver', label: 'Satyalancana 20 Th' };
          } else if (r.mkTahun >= 10) {
            r.awardSatya = { level: 10, tier: 'bronze', label: 'Satyalancana 10 Th' };
          } else {
            r.awardSatya = { level: 0, tier: 'none', label: r.tmtDate ? 'Belum (' + r.mkTahun + ' Th)' : '–' };
          }
        });

        updateDemografi(dosen, tendik);
        updateStatsPenghargaan();
        applyFilters();
        applyFiltersPenghargaan();
      })
      .catch(function (err) {
        console.error('[Admin Dashboard] Gagal memuat:', err);
        if (elErrorMsg) elErrorMsg.textContent = 'Error: ' + err.message;
        showState('error');
        elHeaderStat.textContent = 'Gagal memuat data';
      });
  }

  /* ============================================================
     FILTER & SORT
     ============================================================ */
  function applyFilters() {
    var q = searchQuery.toLowerCase();

    filtered = allData.filter(function (r) {
      // Filter kategori
      if (filterKat !== 'semua' && r.tipe !== filterKat) return false;

      // Filter waktu
      if (filterWaktu !== 'semua') {
        var maxHari = parseInt(filterWaktu) * 30.44;  // perkiraan hari per bulan
        if (r.sisa_hari < 0) return false; // sudah pensiun, abaikan
        if (r.sisa_hari > maxHari) return false;
      }

      // Filter search
      if (q) {
        var haystack = [r.nama, r.nip, r.jabatan_fungsional, r.gol, r.inisial, r.homebase]
          .join(' ').toLowerCase();

        // Pencarian tokenized (memecah query berdasarkan spasi)
        var terms = q.split(/\s+/);
        if (!terms.every(function (t) { return haystack.indexOf(t) !== -1; })) return false;
      }

      return true;
    });

    sortData();
  }

  function sortData() {
    filtered.sort(function (a, b) {
      var va, vb;
      if (sortCol === 'jabgol') {
        va = (a.gol || '') + ' ' + (a.jabatan_fungsional || '');
        vb = (b.gol || '') + ' ' + (b.jabatan_fungsional || '');
      } else {
        va = a[sortCol]; vb = b[sortCol];
      }

      // Numeric sort untuk sisa_hari
      if (sortCol === 'sisa_hari') {
        va = Number(va); vb = Number(vb);
        return sortDir === 'asc' ? va - vb : vb - va;
      }

      // Date string sort untuk tgl_lahir, tgl_pensiun (dd/mm/yyyy)
      if (sortCol === 'tgl_lahir' || sortCol === 'tgl_pensiun') {
        va = parseSortDate(va); vb = parseSortDate(vb);
        return sortDir === 'asc' ? va - vb : vb - va;
      }

      // String sort
      va = String(va || '').toLowerCase();
      vb = String(vb || '').toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    renderTable();
  }

  /* ============================================================
     RENDER TABLE
     ============================================================ */
  function renderTable() {
    updateStats();
    if (elRowCount) elRowCount.textContent = filtered.length;

    if (filtered.length === 0) { showState('empty'); return; }
    showState('table');

    var html = '';
    filtered.forEach(function (r, idx) {
      var jabgol = [];
      if (r.gol) jabgol.push('<strong>' + escHtml(r.gol) + '</strong>');
      if (r.jabatan_fungsional) jabgol.push(escHtml(r.jabatan_fungsional));
      var jabgolHtml = jabgol.join('<br>') || '<span class="text-muted">–</span>';

      var urgensiLabel = {
        merah: '≤ 6 bln',
        kuning: '≤ 12 bln',
        oranye: '≤ 24 bln',
        hijau: '> 24 bln',
        sudah: 'Pensiun'
      }[r.urgensi] || '';

      html += '<tr>' +
        '<td class="col-no">' + (idx + 1) + '</td>' +
        '<td class="col-nama"><div class="nama-wrap">' +
        '<div class="nama">' + escHtml(r.nama) + '</div>' +
        (r.homebase ? '<div class="sub">' + escHtml(r.homebase) + '</div>' : '') +
        '</div></td>' +
        '<td class="col-tipe"><span class="badge-tipe ' + r.tipe + '">' + (r.tipe === 'dosen' ? 'Dosen' : 'Tendik') + '</span></td>' +
        '<td class="col-jabgol text-sm">' + jabgolHtml + '</td>' +
        '<td class="col-nip text-muted">' + escHtml(r.nip || '–') + '</td>' +
        '<td class="col-lahir text-sm text-muted">' + escHtml(r.tgl_lahir || '–') + '</td>' +
        '<td class="col-pensiun text-sm">' + escHtml(r.tgl_pensiun || '–') + '</td>' +
        '<td class="col-sisa"><span class="sisa-waktu ' + r.urgensi + '">' + escHtml(r.sisa_waktu || '–') + '</span></td>' +
        '<td class="col-urgensi"><span class="badge ' + r.urgensi + '"><span class="badge-dot ' + r.urgensi + '"></span>' + urgensiLabel + '</span></td>' +
        '</tr>';
    });
    if (elBody) elBody.innerHTML = html;
  }

  /* ============================================================
     STATS
     ============================================================ */
  function updateStats() {
    var counts = { merah: 0, kuning: 0, oranye: 0, hijau: 0 };

    // Hitung dari seluruh data (bukan filtered) untuk stat global
    allData.forEach(function (r) {
      if (counts.hasOwnProperty(r.urgensi)) counts[r.urgensi]++;
    });
    setEl('stat-merah', counts.merah);
    setEl('stat-kuning', counts.kuning);
    setEl('stat-oranye', counts.oranye);
    setEl('stat-hijau', counts.hijau);
    setEl('stat-total', filtered.length);
  }

  /* ============================================================
     UI STATE
     ============================================================ */
  function showState(state) {
    if (elLoading) elLoading.style.display = 'none';
    if (elEmpty) elEmpty.style.display = 'none';
    if (elError) elError.style.display = 'none';
    if (elBody) elBody.innerHTML = '';

    if (state === 'loading' && elLoading) elLoading.style.display = 'block';
    if (state === 'empty' && elEmpty) elEmpty.style.display = 'block';
    if (state === 'error' && elError) elError.style.display = 'block';
  }

  /* ============================================================
     SETUP – CHIPS
     ============================================================ */
  function setupChips() {
    document.querySelectorAll('.chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = this.dataset.filter;
        var value = this.dataset.value;

        // Deactivate siblings in same group
        document.querySelectorAll('.chip[data-filter="' + filter + '"]').forEach(function (c) {
          c.classList.remove('active');
        });
        this.classList.add('active');
        if (filter === 'kategori') filterKat = value;
        if (filter === 'waktu') filterWaktu = value;
        applyFilters();
      });
    });
  }

  /* ============================================================
     SETUP – SEARCH
     ============================================================ */
  function setupSearch() {
    var input = document.getElementById('search-input');
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        searchQuery = input.value.trim();
        applyFilters();
      }, 250);
    });
  }

  /* ============================================================
     SETUP – SORT HEADERS
     ============================================================ */
  function setupSortHeaders() {
    document.querySelectorAll('th.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var col = this.dataset.col;
        sortDir = (sortCol === col && sortDir === 'asc') ? 'desc' : 'asc';
        sortCol = col;
        document.querySelectorAll('th.sortable').forEach(function (t) {
          t.classList.remove('sort-asc', 'sort-desc');
        });
        this.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        sortData();
      });
    });

    // Set initial sort indicator
    var defTh = document.querySelector('th[data-col="sisa_hari"]');
    if (defTh) defTh.classList.add('sort-asc');
  }

  /* ============================================================
     UTILITIES
     ============================================================ */
  function setEl(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = (val !== undefined) ? val : '–';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function parseSortDate(str) {
    if (!str) return 0;
    var p = str.split('/');
    return (p.length === 3)
      ? new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])).getTime()
      : 0;
  }

  function formatDateTime(d) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' WIB';
  }

  function parseDMY(dateStr) {
    if (!dateStr) return null;
    var parts = String(dateStr).trim().split('/');
    if (parts.length !== 3) return null;
    var d = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var y = parseInt(parts[2], 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    var dt = new Date(y, m, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function calcMasaKerja(tmtDate, refDate) {
    if (!tmtDate) return { tahun: 0, bulan: 0, label: '–', totalTahunDesimal: 0 };
    refDate = refDate || new Date();

    var yDiff = refDate.getFullYear() - tmtDate.getFullYear();
    var mDiff = refDate.getMonth() - tmtDate.getMonth();
    var dDiff = refDate.getDate() - tmtDate.getDate();

    if (dDiff < 0) {
      mDiff--;
    }
    if (mDiff < 0) {
      yDiff--;
      mDiff += 12;
    }
    if (yDiff < 0) yDiff = 0;
    if (mDiff < 0) mDiff = 0;

    return {
      tahun: yDiff,
      bulan: mDiff,
      label: yDiff + ' th ' + mDiff + ' bln',
      totalTahunDesimal: yDiff + (mDiff / 12)
    };
  }

  /* ============================================================
     DEMOGRAFI
     ============================================================ */
  function updateDemografi(dosen, tendik) {
    var guruBesar = dosen.filter(function (r) {
      return /guru besar|profesor|prof\./i.test(r.jabatan_fungsional || '');
    }).length;

    var doktor = dosen.filter(function (r) {
      var isGB = /guru besar|profesor|prof\./i.test(r.jabatan_fungsional || '');
      var cleanJenjang = String(r.jenjang || '').replace(/\s|-/g, '').toUpperCase();
      var isS3 = (cleanJenjang === 'S3' || cleanJenjang.indexOf('S3') !== -1 || cleanJenjang.indexOf('DOKTOR') !== -1);
      return isS3 && !isGB;
    }).length;

    setEl('stat-total-pegawai', allData.length);
    setEl('stat-total-dosen', dosen.length);
    setEl('stat-total-tendik', tendik.length);
    setEl('stat-guru-besar', guruBesar);
    setEl('stat-doktor', doktor);
  }

  /* ============================================================
     NAVIGATION & VIEW SWITCHING
     ============================================================ */
  function setupNavigation() {
    var navPensiun = document.getElementById('nav-pensiun');
    var navPenghargaan = document.getElementById('nav-penghargaan');

    function handleNavClick(e, view) {
      if (e) e.preventDefault();
      switchView(view);
      history.pushState(null, '', '#' + view);
    }

    if (navPensiun) {
      navPensiun.addEventListener('click', function (e) {
        handleNavClick(e, 'pensiun');
      });
    }

    if (navPenghargaan) {
      navPenghargaan.addEventListener('click', function (e) {
        handleNavClick(e, 'penghargaan');
      });
    }

    window.addEventListener('hashchange', function () {
      var h = window.location.hash.replace('#', '');
      if (h === 'penghargaan' || h === 'pensiun') {
        switchView(h);
      }
    });

    var initialHash = window.location.hash.replace('#', '');
    if (initialHash === 'penghargaan') {
      switchView('penghargaan');
    } else {
      switchView('pensiun');
    }
  }

  function switchView(view) {
    currentView = view;
    var viewPensiun = document.getElementById('view-pensiun');
    var viewPenghargaan = document.getElementById('view-penghargaan');
    var navPensiun = document.getElementById('nav-pensiun');
    var navPenghargaan = document.getElementById('nav-penghargaan');

    if (view === 'penghargaan') {
      if (viewPensiun) viewPensiun.style.display = 'none';
      if (viewPenghargaan) viewPenghargaan.style.display = 'block';
      if (navPensiun) navPensiun.classList.remove('active');
      if (navPenghargaan) navPenghargaan.classList.add('active');
      applyFiltersPenghargaan();
    } else {
      if (viewPensiun) viewPensiun.style.display = 'block';
      if (viewPenghargaan) viewPenghargaan.style.display = 'none';
      if (navPensiun) navPensiun.classList.add('active');
      if (navPenghargaan) navPenghargaan.classList.remove('active');
      applyFilters();
    }
    feather.replace();
  }

  /* ============================================================
     PENGHARGAAN: STATS, FILTER, SORT, RENDER
     ============================================================ */
  function updateStatsPenghargaan() {
    var c = { ugm35: 0, ugm25: 0, ugm15: 0, satya30: 0, satya20: 0, satya10: 0 };
    allData.forEach(function (r) {
      if (!r.awardUGM || !r.awardSatya) return;
      if (r.awardUGM.level === 35) c.ugm35++;
      else if (r.awardUGM.level === 25) c.ugm25++;
      else if (r.awardUGM.level === 15) c.ugm15++;

      if (r.awardSatya.level === 30) c.satya30++;
      else if (r.awardSatya.level === 20) c.satya20++;
      else if (r.awardSatya.level === 10) c.satya10++;
    });

    setEl('stat-ugm-35', c.ugm35);
    setEl('stat-ugm-25', c.ugm25);
    setEl('stat-ugm-15', c.ugm15);
    setEl('stat-satya-30', c.satya30);
    setEl('stat-satya-20', c.satya20);
    setEl('stat-satya-10', c.satya10);
  }

  function applyFiltersPenghargaan() {
    var q = searchPenghargaanQuery.toLowerCase();

    filteredPenghargaan = allData.filter(function (r) {
      if (!r.awardUGM || !r.awardSatya) return false;

      // Filter Kategori Pegawai
      if (filterPenghargaanTipe === 'dosen' && r.tipe !== 'dosen') return false;
      if (filterPenghargaanTipe === 'tendik' && r.tipe !== 'tendik') return false;
      if (filterPenghargaanTipe === 'pns' && !r.isPNS) return false;

      // Filter Jenis Penghargaan
      if (filterPenghargaanJenis === 'ugm') {
        if (r.awardUGM.level <= 0) return false;
      } else if (filterPenghargaanJenis === 'satya') {
        if (r.awardSatya.level <= 0) return false;
      } else if (filterPenghargaanJenis === 'berhak') {
        var hasUGM = r.awardUGM.level > 0;
        var hasSatya = r.awardSatya.level > 0;
        if (!hasUGM && !hasSatya) return false;
      }

      // Filter Masa Kerja — menggunakan masa kerja UGM untuk filter UGM,
      // dan masa kerja CPNS untuk filter Satyalancana
      if (filterPenghargaanMk === '35') {
        if (r.mkUGMTahun < 35) return false;
      } else if (filterPenghargaanMk === '25') {
        if (r.mkUGMTahun < 25) return false;
      } else if (filterPenghargaanMk === '15') {
        if (r.mkUGMTahun < 15) return false;
      } else if (filterPenghargaanMk === '10') {
        if (r.mkTahun < 10) return false;
      }

      // Filter search
      if (q) {
        var haystack = [
          r.nama, r.nip, r.jabatan_fungsional, r.gol, r.inisial, r.homebase,
          r.awardUGM.label, r.awardSatya.label
        ].join(' ').toLowerCase();

        var terms = q.split(/\s+/);
        if (!terms.every(function (t) { return haystack.indexOf(t) !== -1; })) return false;
      }

      return true;
    });

    sortDataPenghargaan();
  }

  function sortDataPenghargaan() {
    filteredPenghargaan.sort(function (a, b) {
      var va, vb;
      if (sortPenghargaanCol === 'masa_kerja') {
        va = a.mkUGMTotal || 0;
        vb = b.mkUGMTotal || 0;
        return sortPenghargaanDir === 'asc' ? va - vb : vb - va;
      }
      if (sortPenghargaanCol === 'tmt') {
        va = a.tmtUGMDate ? a.tmtUGMDate.getTime() : 0;
        vb = b.tmtUGMDate ? b.tmtUGMDate.getTime() : 0;
        return sortPenghargaanDir === 'asc' ? va - vb : vb - va;
      }
      va = String(a[sortPenghargaanCol] || '').toLowerCase();
      vb = String(b[sortPenghargaanCol] || '').toLowerCase();
      if (va < vb) return sortPenghargaanDir === 'asc' ? -1 : 1;
      if (va > vb) return sortPenghargaanDir === 'asc' ? 1 : -1;
      return 0;
    });

    renderTablePenghargaan();
  }

  function renderTablePenghargaan() {
    var elRowCountP = document.getElementById('row-count-penghargaan');
    var elBodyP = document.getElementById('table-body-penghargaan');
    var elEmptyP = document.getElementById('state-empty-penghargaan');

    if (elRowCountP) elRowCountP.textContent = filteredPenghargaan.length;

    if (filteredPenghargaan.length === 0) {
      if (elBodyP) elBodyP.innerHTML = '';
      if (elEmptyP) elEmptyP.style.display = 'block';
      return;
    }
    if (elEmptyP) elEmptyP.style.display = 'none';

    var html = '';
    filteredPenghargaan.forEach(function (r, idx) {
      var statusBadge = r.isPNS
        ? '<span class="badge-status-pns">PNS</span>'
        : '<span class="badge-status-tetap">' + (r.tipe === 'dosen' ? 'Dosen Tetap' : 'Tendik Tetap') + '</span>';

      var ugmBadge = '<span class="badge-award ' + (r.awardUGM ? r.awardUGM.tier : 'none') + '">' +
        (r.awardUGM && r.awardUGM.level > 0 ? '🏅 ' : '') + escHtml(r.awardUGM ? r.awardUGM.label : '–') + '</span>';

      var satyaBadge = '<span class="badge-award ' + (r.awardSatya ? r.awardSatya.tier : 'none') + '">' +
        (r.awardSatya && r.awardSatya.level > 0 ? '🎖️ ' : '') + escHtml(r.awardSatya ? r.awardSatya.label : '–') + '</span>';

      html += '<tr>' +
        '<td class="col-no text-muted">' + (idx + 1) + '</td>' +
        '<td class="col-nama"><strong>' + escHtml(r.nama) + '</strong>' +
        '<div class="text-xs text-muted" style="margin-top:2px;">' + escHtml(r.jabatan_fungsional || r.homebase || '–') + '</div>' +
        '</td>' +
        '<td class="col-tipe"><span class="badge-tipe ' + r.tipe + '">' + (r.tipe === 'dosen' ? 'Dosen' : 'Tendik') + '</span></td>' +
        '<td>' + statusBadge + '<div class="text-xs text-muted" style="margin-top:3px; font-family:monospace;">' + escHtml(r.nip || '–') + '</div></td>' +
        '<td class="text-sm">' + escHtml(r.tgl_sk_ugm || '–') + '</td>' +
        '<td class="text-sm"><strong>' + escHtml(r.mkUGMLabel) + '</strong></td>' +
        '<td>' + ugmBadge + '</td>' +
        '<td>' + satyaBadge + '</td>' +
        '</tr>';
    });

    if (elBodyP) elBodyP.innerHTML = html;
  }

  function setupPenghargaanListeners() {
    // Chips for Penghargaan
    document.querySelectorAll('.chip[data-filter^="penghargaan-"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = this.dataset.filter;
        var value = this.dataset.value;

        document.querySelectorAll('.chip[data-filter="' + filter + '"]').forEach(function (c) {
          c.classList.remove('active');
        });
        this.classList.add('active');

        if (filter === 'penghargaan-jenis') filterPenghargaanJenis = value;
        if (filter === 'penghargaan-mk') filterPenghargaanMk = value;
        if (filter === 'penghargaan-tipe') filterPenghargaanTipe = value;

        applyFiltersPenghargaan();
      });
    });

    // Search for Penghargaan
    var inputP = document.getElementById('search-penghargaan');
    if (inputP) {
      var timerP;
      inputP.addEventListener('input', function () {
        clearTimeout(timerP);
        timerP = setTimeout(function () {
          searchPenghargaanQuery = inputP.value.trim();
          applyFiltersPenghargaan();
        }, 250);
      });
    }

    // Sort headers for Penghargaan
    document.querySelectorAll('th[data-pcol]').forEach(function (th) {
      th.addEventListener('click', function () {
        var col = this.dataset.pcol;
        sortPenghargaanDir = (sortPenghargaanCol === col && sortPenghargaanDir === 'asc') ? 'desc' : 'asc';
        sortPenghargaanCol = col;

        document.querySelectorAll('th[data-pcol]').forEach(function (t) {
          t.classList.remove('sort-asc', 'sort-desc');
        });
        this.classList.add(sortPenghargaanDir === 'asc' ? 'sort-asc' : 'sort-desc');

        sortDataPenghargaan();
      });
    });
  }

})();
