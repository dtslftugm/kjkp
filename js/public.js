(function () {
  'use strict';

  /* ============================================================
     STATE
     ============================================================ */
  var allData = [];

  /* ============================================================
     DOM REFERENCES
     ============================================================ */
  var elLoading = document.getElementById('state-loading');
  var elError = document.getElementById('state-error');
  var elErrorMsg = document.getElementById('error-msg');
  var elHeaderStat = document.getElementById('header-status');

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', function () {
    feather.replace();
    setupTheme();
    loadData();
  });

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
    if (elLoading) elLoading.style.display = 'block';
    if (elError) elError.style.display = 'none';
    elHeaderStat.textContent = 'Memuat data…';

    DashboardAPI.getPensiunData()
      .then(function (data) {
        var dosen = data.dosen || [];
        var tendik = data.tendik || [];
        allData = dosen.concat(tendik);

        elHeaderStat.textContent = 'Live · ' + allData.length + ' pegawai';

        updateStats();
        updateDemografi(dosen, tendik);

        if (elLoading) elLoading.style.display = 'none';
      })
      .catch(function (err) {
        console.error('[Public Dashboard] Gagal memuat:', err);
        if (elErrorMsg) elErrorMsg.textContent = 'Error: ' + err.message;
        if (elLoading) elLoading.style.display = 'none';
        if (elError) elError.style.display = 'block';
        elHeaderStat.textContent = 'Gagal memuat data';
      });
  }

  /* ============================================================
     STATS URGENSI  (seluruh data)
     ============================================================ */
  function updateStats() {
    var counts = { merah: 0, kuning: 0, oranye: 0, hijau: 0 };

    allData.forEach(function (r) {
      if (counts.hasOwnProperty(r.urgensi)) counts[r.urgensi]++;
    });

    setEl('stat-merah', counts.merah);
    setEl('stat-kuning', counts.kuning);
    setEl('stat-oranye', counts.oranye);
    setEl('stat-hijau', counts.hijau);
    setEl('stat-total', allData.length);
  }

  /* ============================================================
     DEMOGRAFI
     ============================================================ */
  function updateDemografi(dosen, tendik) {
    var guruBesar = dosen.filter(function (r) {
      return r.jabatan_fungsional &&
        r.jabatan_fungsional.toLowerCase().indexOf('guru besar') !== -1;
    }).length;

    // Cek sampel data dari server untuk debugging (hapus setelah selesai)
    if (dosen.length > 0) {
      console.log('--- DEBUGGING DATA DOSEN ---');
      console.log('Sampel Dosen Pertama:', {
        nama: dosen[0].nama,
        jabatan: dosen[0].jabatan_fungsional,
        jenjang_raw: dosen[0].jenjang
      });
    }

    var doktor = dosen.filter(function (r) {
      var isGB = r.jabatan_fungsional && r.jabatan_fungsional.toLowerCase().indexOf('guru besar') !== -1;

      // Mengantisipasi format "s3", "S3", "S-3", " S3 " dsb.
      var isS3 = false;
      if (r.jenjang) {
        var cleanJenjang = String(r.jenjang).replace(/\s|-/g, '').toUpperCase();
        isS3 = (cleanJenjang === 'S3' || cleanJenjang.indexOf('S3') !== -1);
      }

      // Jika butuh lihat apa saja isinya, ini akan mencetak semua jenjang dosen (selain guru besar) ke console
      // if (!isGB) { console.log('Jabatan:', r.jabatan_fungsional, '| Jenjang terbaca:', r.jenjang); }

      return isS3 && !isGB;
    }).length;

    setEl('stat-total-pegawai', allData.length);
    setEl('stat-total-dosen', dosen.length);
    setEl('stat-guru-besar', guruBesar);
    setEl('stat-doktor', doktor);
    setEl('stat-total-tendik', tendik.length);
  }

  /* ============================================================
     UTILITY
     ============================================================ */
  function setEl(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val !== undefined ? val : '–';
  }

})();
