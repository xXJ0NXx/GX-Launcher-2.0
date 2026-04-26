/* ============================================================
   GX-LAUNCHER 2.0 — SHARED SCRIPT
   ============================================================ */

// ===== STORAGE HELPERS =====
// Uses localStorage so settings persist on file:// and http:// alike.
// Falls back to an in-memory store if localStorage is unavailable.
const _memStore = {};
function _lsGet(name) {
    try { return localStorage.getItem(name); } catch(e) { return _memStore[name] ?? null; }
}
function _lsSet(name, value) {
    try { localStorage.setItem(name, value); } catch(e) { _memStore[name] = value; }
}
// Keep old names so nothing else needs to change
function getCookie(name)            { return _lsGet(name); }
function setCookie(name, value, _d) { _lsSet(name, String(value)); }

// ===== TOAST =====
let _toastTimer;
function showToast(msg, isError) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '') + ' show';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== STATUS LINE =====
function setStatus(html) {
    const el = document.getElementById('status-line');
    if (el) el.innerHTML = html;
}

// ===== LOADING OVERLAY =====
function showLoading(msg) {
    const ov = document.getElementById('loading-overlay');
    const tx = document.getElementById('loading-text');
    if (ov) ov.classList.add('active');
    if (tx) tx.textContent = msg || 'LOADING...';
    setLoadingBar(0);
}
function hideLoading() {
    const ov = document.getElementById('loading-overlay');
    if (ov) ov.classList.remove('active');
}
function setLoadingBar(pct) {
    const bar = document.getElementById('loading-bar');
    if (bar) bar.style.width = pct + '%';
}

// ===== THEME SYSTEM =====
const GX_THEMES = {
    'default':  {},
    'green':    { '--accent':'#00cc44','--accent-hi':'#00ff55','--accent-dim':'#006622','--accent-glow':'rgba(0,180,60,0.15)','--border2':'#003318' },
    'blood':    { '--accent':'#cc0000','--accent-hi':'#ff4444','--accent-dim':'#800000','--accent-glow':'rgba(200,0,0,0.22)','--border2':'#4a0000','--bg':'#080000','--bg2':'#0d0000','--bg3':'#120000','--panel':'#0f0000' },
    'midnight': { '--accent':'#5566ff','--accent-hi':'#7788ff','--accent-dim':'#2233bb','--accent-glow':'rgba(80,100,255,0.18)','--border2':'#1a2050','--bg':'#070710','--bg2':'#0c0c1a','--bg3':'#111125','--panel':'#0e0e1e' },
    'ash':      { '--accent':'#999999','--accent-hi':'#cccccc','--accent-dim':'#555555','--accent-glow':'rgba(150,150,150,0.15)','--border2':'#404040' },
    'amber':    { '--accent':'#cc7700','--accent-hi':'#ffaa00','--accent-dim':'#7a4400','--accent-glow':'rgba(200,120,0,0.18)','--border2':'#3a2200','--bg':'#090600','--bg2':'#100d00','--bg3':'#181200','--panel':'#130f00' },
};
const GX_DEFAULTS = {
    '--accent':'#cc0000','--accent-hi':'#ff2222','--accent-dim':'#7a0000',
    '--accent-glow':'rgba(180,0,0,0.18)','--bg':'#0a0a0a','--bg2':'#111111',
    '--bg3':'#181818','--panel':'#141414','--border2':'#3a0000'
};

function applyTheme(name) {
    const root = document.documentElement;
    // reset to defaults first
    for (const [k, v] of Object.entries(GX_DEFAULTS)) root.style.setProperty(k, v);
    // apply overrides
    const t = GX_THEMES[name] || {};
    for (const [k, v] of Object.entries(t)) root.style.setProperty(k, v);
    setCookie('launcherTheme', name, 365);
    // sync swatch UI if on settings page
    document.querySelectorAll('.theme-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.themeName === name);
    });
}

// ===== MOD MAKER (removed) =====
function updateNavVisibility() {} // kept as stub so old pages don't error
function toggleModMaker() {}

// ===== VERSION SELECTOR (used on index.html) =====
let _selectedVersion = '';

function toggleVersionDropdown() {
    const dd  = document.getElementById('version-dropdown');
    const sel = document.getElementById('version-select');
    if (!dd) return;
    const isOpen = dd.classList.toggle('open');
    sel.classList.toggle('open', isOpen);
}

function selectVersion(path, label, isWasm) {
    _selectedVersion = path;
    const lbl = document.getElementById('version-label');
    if (lbl) lbl.textContent = label;
    // close dropdown
    document.getElementById('version-dropdown')?.classList.remove('open');
    document.getElementById('version-select')?.classList.remove('open');
    // enable play
    const btn = document.getElementById('play-btn');
    if (btn) btn.disabled = false;
    // highlight active option
    document.querySelectorAll('.version-option').forEach(o => o.classList.remove('active-ver'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active-ver');
    // update mode badge
    const method = getCookie('launchMethod') || 'regular';
    const modeLabels = { regular:'REGULAR', 'about-blank':'ABOUT:BLANK', 'data-uri':'DATA URI', blob:'BLOB URL', popup:'POPUP' };
    const badge = document.getElementById('mode-badge-text');
    if (badge) badge.textContent = modeLabels[method] || method.toUpperCase();

    setStatus('VERSION: <span class="hl">' + label + '</span>');
}

// Close dropdown on outside click
document.addEventListener('click', e => {
    if (!e.target.closest('.version-wrapper')) {
        document.getElementById('version-dropdown')?.classList.remove('open');
        document.getElementById('version-select')?.classList.remove('open');
    }
});

// ===== LAUNCH LOGIC =====
function playGame() {
    if (!_selectedVersion) { showToast('Select a version first.', true); return; }

    const method = getCookie('launchMethod') || 'regular';
    // Build absolute URL so fetch/iframe work from any context
    const relUrl = _selectedVersion + '/index.html';
    const absUrl = new URL(relUrl, location.href).href;
    const popupFeatures = 'width=1280,height=720,toolbar=0,menubar=0,location=0,status=0';

    if (method === 'regular') {
        window.open(absUrl, '_blank');

    } else if (method === 'popup') {
        const w = window.open(absUrl, '_blank', popupFeatures);
        if (!w) showToast('Popup blocked — allow popups for this site.', true);

    } else if (method === 'about-blank') {
        // Fetch game HTML and write it directly — no iframe
        _fetchWithProgress(absUrl).then(html => {
            const win = window.open('', '_blank');
            if (!win) { showToast('Popup blocked.', true); return; }
            win.document.open();
            win.document.write(html);
            win.document.close();
            setStatus('LAUNCHED AS <span class="hl">ABOUT:BLANK</span>');
        }).catch(err => {
            showToast('Fetch failed: ' + err.message, true);
            setStatus('FETCH ERROR');
        });

    } else if (method === 'blob') {
        _fetchWithProgress(absUrl).then(html => {
            const blob    = new Blob([html], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setStatus('LAUNCHED AS <span class="hl">BLOB URL</span>');
        }).catch(err => {
            showToast('Fetch failed: ' + err.message, true);
            setStatus('FETCH ERROR');
        });

    } else if (method === 'data-uri') {
        // Build a self-contained loader page, encode it as a data: URI, and copy to clipboard.
        // When pasted into the address bar, the page fetches the game from the CDN itself —
        // no pre-fetching needed, works from any context.
        try {
            const folder  = _selectedVersion.split('/').map(encodeURIComponent).join('/');
            const cdnBase = 'https://raw.githack.com/xXJ0NXx/GX-Launcher/main/' + folder + '/';
            const gameUrl = cdnBase + 'index.html';

            const loaderHtml = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<base href="${cdnBase}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden;font-family:monospace;color:#fff}
#s{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#0a0a0a}
#bar-wrap{width:320px;height:6px;background:#222;border-radius:3px;overflow:hidden}
#bar{height:100%;width:0%;background:#cc0000;border-radius:3px;transition:width 0.1s}
#msg{font-size:13px;color:#aaa;letter-spacing:0.1em}
</style>
</head><body>
<div id="s">
  <div id="msg">FETCHING GAME...</div>
  <div id="bar-wrap"><div id="bar"></div></div>
</div>
<script>
(async()=>{
  const url='${gameUrl}';
  const bar=document.getElementById('bar');
  const msg=document.getElementById('msg');
  try{
    const res=await fetch(url);
    if(!res.ok)throw new Error('HTTP '+res.status);
    const len=+res.headers.get('content-length')||0;
    const reader=res.body.getReader();
    const chunks=[];let got=0;
    while(true){
      const{done,value}=await reader.read();
      if(done)break;
      chunks.push(value);got+=value.length;
      if(len)bar.style.width=(5+Math.round(got/len*90))+'%';
    }
    bar.style.width='100%';
    msg.textContent='LAUNCHING...';
    const merged=new Uint8Array(got);let pos=0;
    for(const c of chunks){merged.set(c,pos);pos+=c.length;}
    const html=new TextDecoder().decode(merged);
    const baseTag='<base href="${cdnBase}">';
    let patched;
    if(/<head[\s>]/i.test(html)){patched=html.replace(/(<head[^>]*>)/i,'$1\\n'+baseTag);}
    else if(/<html[\s>]/i.test(html)){patched=html.replace(/(<html[^>]*>)/i,'$1\\n<head>'+baseTag+'</head>');}
    else{patched=baseTag+html;}
    document.open();
    document.write(patched);
    document.close();
  }catch(e){
    msg.textContent='ERROR: '+e.message;
    bar.style.background='#aa0000';
  }
})();
</script>
</body></html>`;

            const b64     = btoa(unescape(encodeURIComponent(loaderHtml)));
            const dataUri = 'data:text/html;base64,' + b64;
            navigator.clipboard.writeText(dataUri).then(() => {
                _showDataUriSplash(true);
            }).catch(() => {
                _showDataUriSplash(false);
            });
            setStatus('DATA URI COPIED — PASTE IN ADDRESS BAR');
        } catch (e) {
            showToast('Failed to generate URI: ' + e.message, true);
            setStatus('URI ERROR');
        }
    }
}

function _showDataUriSplash(copied) {
    // Remove any existing splash
    document.getElementById('_gx_uri_splash')?.remove();
    const overlay = document.createElement('div');
    overlay.id = '_gx_uri_splash';
    overlay.style.cssText = [
        'position:fixed','inset:0','z-index:99999',
        'background:rgba(0,0,0,0.92)',
        'display:flex','flex-direction:column',
        'align-items:center','justify-content:center','gap:18px',
        'font-family:var(--mono,monospace)',
        'animation:_gxFadeIn 0.2s ease'
    ].join(';');
    overlay.innerHTML = `
        <style>
            @keyframes _gxFadeIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
            #_gx_uri_splash .splash-box {
                border:1px solid var(--accent,#cc0000);
                background:var(--panel,#141414);
                padding:32px 40px;
                text-align:center;
                max-width:420px;
                box-shadow:0 0 40px var(--accent-glow,rgba(180,0,0,0.2));
            }
            #_gx_uri_splash .splash-icon { font-size:36px; margin-bottom:12px; }
            #_gx_uri_splash .splash-title {
                font-size:13px; letter-spacing:0.18em; text-transform:uppercase;
                color:var(--accent,#cc0000); margin-bottom:10px;
            }
            #_gx_uri_splash .splash-body {
                font-size:11px; color:var(--text-dim,#888); line-height:1.7; margin-bottom:20px;
            }
            #_gx_uri_splash .splash-body strong { color:var(--text-bright,#fff); }
            #_gx_uri_splash .splash-warn {
                font-size:10px; color:#ffaa00; margin-bottom:16px;
            }
            #_gx_uri_splash .splash-close {
                background:var(--accent-dim,#7a0000); border:none;
                color:#fff; font-family:var(--mono,monospace);
                font-size:11px; padding:8px 24px; cursor:pointer;
                letter-spacing:0.1em; text-transform:uppercase;
                transition:background 0.13s;
            }
            #_gx_uri_splash .splash-close:hover { background:var(--accent,#cc0000); }
        </style>
        <div class="splash-box">
            <div class="splash-icon">📋</div>
            <div class="splash-title">${copied ? 'URI Copied!' : 'URI Ready'}</div>
            <div class="splash-body">
                ${copied
                    ? 'The <strong>data: URI</strong> has been copied to your clipboard.'
                    : 'Could not auto-copy — please copy the URI from the address bar manually.'}
                <br><br>
                Open a <strong>new tab</strong>, click the address bar,<br>
                <strong>paste</strong> and press <strong>Enter</strong>.
            </div>
            ${!copied ? '<div class="splash-warn">⚠ Clipboard access was blocked by your browser.</div>' : ''}
            <button class="splash-close" onclick="document.getElementById('_gx_uri_splash').remove()">Got it</button>
        </div>
    `;
    document.body.appendChild(overlay);
    // Auto-dismiss after 15s
    setTimeout(() => overlay?.remove(), 15000);
}

function _fetchWithProgress(url) {
    showLoading('FETCHING...');
    setLoadingBar(5);
    return fetch(url).then(res => {
        if (!res.ok) { hideLoading(); throw new Error('HTTP ' + res.status); }
        const total = parseInt(res.headers.get('content-length') || '0');
        const reader = res.body.getReader();
        let received = 0;
        const chunks = [];

        function pump() {
            return reader.read().then(({ done, value }) => {
                if (done) return;
                chunks.push(value);
                received += value.length;
                if (total) setLoadingBar(5 + Math.round(received / total * 80));
                return pump();
            });
        }

        return pump().then(() => {
            setLoadingBar(88);
            const merged = new Uint8Array(received);
            let pos = 0;
            for (const c of chunks) { merged.set(c, pos); pos += c.length; }
            hideLoading();
            setLoadingBar(100);
            return new TextDecoder().decode(merged);
        });
    }).catch(err => { hideLoading(); throw err; });
}

// ===== NAVIGATION HELPERS (kept for backward compat) =====
function redirectToNews()         { window.location.href = 'news.html'; }
function redirectToClients()      { window.location.href = 'clients.html'; }
function redirectToServers()      { window.location.href = 'servers.html'; }
function redirectToMods()         { window.location.href = 'mods.html'; }
function redirectToMain()         { window.location.href = 'index.html'; }
function redirectToOtherClients() { window.location.href = 'otherclients.html'; }
function redirectToSettings()     { window.location.href = 'settings.html'; }

function openBlankPage(link) { window.open(link); }

function createAbout(url) {
    const win = window.open();
    win.document.body.style.margin = '0';
    win.document.body.style.height = '100vh';
    const iframe = win.document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.margin = '0';
    iframe.src = url;
    win.document.body.appendChild(iframe);
}

// ===== SETTINGS PAGE ACTIONS =====
function saveUsername() {
    const val = (document.getElementById('username-input')?.value || '').trim();
    if (!val) { showToast('Enter a username first.', true); return; }
    setCookie('username', val, 365);
    document.querySelectorAll('.profile-name, #profile-name').forEach(el => el.textContent = val);
    showToast('Username saved: ' + val);
}

function applyThemeFromSwatch(name, el) {
    applyTheme(name);
    showToast('Theme: ' + name);
}

function selectLaunchMode(mode, el) {
    setCookie('launchMethod', mode, 365);
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');
    const labels = { regular:'REGULAR', 'about-blank':'ABOUT:BLANK', 'data-uri':'DATA URI', blob:'BLOB URL', popup:'POPUP' };
    const badge = document.getElementById('mode-badge-text');
    if (badge) badge.textContent = labels[mode] || mode.toUpperCase();
    showToast('Launch mode: ' + (labels[mode] || mode));
}

// ===== DOM READY — runs on every page =====
document.addEventListener('DOMContentLoaded', () => {

    // Apply saved username
    const username = getCookie('username');
    if (username) {
        document.querySelectorAll('.profile-name, #profile-name').forEach(el => el.textContent = username);
        const input = document.getElementById('username-input');
        if (input) input.value = username;
    }

    // Apply saved theme
    const savedTheme = getCookie('launcherTheme') || 'default';
    applyTheme(savedTheme);

    // Restore launch mode selection on settings page
    const savedMode = getCookie('launchMethod') || 'regular';
    document.querySelectorAll('.mode-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.mode === savedMode);
    });
    const badge = document.getElementById('mode-badge-text');
    const modeLabels = { regular:'REGULAR', 'about-blank':'ABOUT:BLANK', 'data-uri':'DATA URI', blob:'BLOB URL', popup:'POPUP' };
    if (badge) badge.textContent = modeLabels[savedMode] || savedMode.toUpperCase();
});
