/**
 * Dashboard KJKP DTSL – API Client
 * Wrapper untuk komunikasi dengan GAS backend.
 *
 * Strategi CORS:
 *   1. Fetch normal (jika GAS sudah dikonfigurasi dengan header CORS)
 *   2. JSONP fallback otomatis jika fetch gagal karena CORS
 *
 * Mudah dimigrasi ke backend Node.js:
 *   Ganti implementasi fetchDosen_() dan fetchTendik_()
 *   tanpa mengubah kontrak fungsi publik.
 */

(function (window) {
    'use strict';

    /* ------------------------------------------------------------------ */
    /*  INTERNAL HELPERS                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Fetch via JSONP – untuk menghindari CORS error pada GAS webapp
     * @param {string} url  – URL tanpa callback param
     * @return {Promise<any>}
     */
    function fetchJSONP(url) {
        return new Promise(function (resolve, reject) {
            var cbName = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
            var script = document.createElement('script');
            var timeout = setTimeout(function () {
                cleanup();
                reject(new Error('JSONP timeout'));
            }, 15000);

            function cleanup() {
                clearTimeout(timeout);
                delete window[cbName];
                if (script.parentNode) script.parentNode.removeChild(script);
            }

            window[cbName] = function (data) {
                cleanup();
                resolve(data);
            };

            var sep = url.indexOf('?') === -1 ? '?' : '&';
            script.src = url + sep + 'callback=' + cbName;
            script.onerror = function () { cleanup(); reject(new Error('JSONP gagal memuat script')); };
            document.head.appendChild(script);
        });
    }

    /**
     * Fetch dengan fallback JSONP
     * @param {string} url
     * @param {Object} params – key-value query params tambahan
     * @return {Promise<Object>}  payload GAS { status, data, timestamp }
     */
    function apiFetch(url, params) {
        var qs = Object.keys(params || {}).map(function (k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        }).join('&');
        var fullUrl = qs ? url + '?' + qs : url;

        // Coba fetch biasa dulu
        if (window.fetch) {
            return window.fetch(fullUrl)
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .catch(function (err) {
                    // Jika CORS / network error → fallback JSONP
                    console.warn('[API] Fetch gagal, fallback ke JSONP:', err.message);
                    return fetchJSONP(fullUrl);
                });
        }

        // Tidak ada fetch API (browser lawas) → langsung JSONP
        return fetchJSONP(fullUrl);
    }

    /* ------------------------------------------------------------------ */
    /*  PUBLIC API                                                          */
    /* ------------------------------------------------------------------ */

    var _url = (window.CONFIG && window.CONFIG.API_URL) || '';

    var DashboardAPI = {
        /**
         * Ambil data gabungan pensiun (dosen + tendik)
         * @return {Promise<{ dosen: DosenRecord[], tendik: TendikRecord[] }>}
         */
        getPensiunData: function () {
            return apiFetch(_url, { action: 'pensiun' }).then(function (payload) {
                if (payload.status !== 'success') throw new Error(payload.message || 'API error');
                return payload.data;
            });
        },

        /**
         * Ambil semua data dosen
         * @return {Promise<DosenRecord[]>}
         */
        getDosen: function () {
            return apiFetch(_url, { action: 'dosen' }).then(function (payload) {
                if (payload.status !== 'success') throw new Error(payload.message || 'API error');
                return payload.data;
            });
        },

        /**
         * Ambil semua data tendik
         * @return {Promise<TendikRecord[]>}
         */
        getTendik: function () {
            return apiFetch(_url, { action: 'tendik' }).then(function (payload) {
                if (payload.status !== 'success') throw new Error(payload.message || 'API error');
                return payload.data;
            });
        }
    };

    window.DashboardAPI = DashboardAPI;

})(window);
