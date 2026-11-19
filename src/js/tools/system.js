/* Kategorie: System */
(() => {
  'use strict';
  const { register } = window.TB;

  register({
    id: 'system-info', name: 'System-Info', glyph: 'SYS', cat: 'system',
    desc: 'Bildschirm, CPU-Kerne, Speicher, GPU, Sprache und Netzwerkstatus.', keywords: 'system info hardware gpu screen display cpu',
    render(root, U) {
      root.innerHTML = `<div class="cols"><div class="panel"><h3>Gerät</h3><div id="dev"></div></div><div class="panel"><h3>Bildschirm</h3><div id="scr"></div></div></div><div class="cols"><div class="panel"><h3>Grafik</h3><div id="gpu"></div></div><div class="panel"><h3>Umgebung</h3><div id="env"></div></div></div>`;
      const draw = () => {
        const n = navigator, s = screen;
        const ua = n.userAgentData;
        U.q('#dev').innerHTML = U.kv([['Plattform', (ua && ua.platform) || n.platform], ['CPU-Kerne (logisch)', String(n.hardwareConcurrency || '—')], ['Arbeitsspeicher (ca.)', n.deviceMemory ? '≥ ' + n.deviceMemory + ' GB' : '—'], ['Touch-Punkte', String(n.maxTouchPoints)], ['Online', n.onLine ? 'Ja' : 'Nein'], ['Verbindung', n.connection ? `${n.connection.effectiveType || ''} ${n.connection.downlink ? '· ' + n.connection.downlink + ' Mbit/s' : ''}` : '—']]);
        U.q('#scr').innerHTML = U.kv([['Auflösung (Punkte)', `${s.width} × ${s.height}`], ['Pixel-Dichte', devicePixelRatio + '× ' + (devicePixelRatio >= 2 ? '(Retina)' : '')], ['Physische Pixel', `${Math.round(s.width * devicePixelRatio)} × ${Math.round(s.height * devicePixelRatio)}`], ['Verfügbar', `${s.availWidth} × ${s.availHeight}`], ['Fenster', `${innerWidth} × ${innerHeight}`], ['Farbtiefe', s.colorDepth + ' Bit'], ['Farbraum P3', matchMedia('(color-gamut: p3)').matches ? 'Ja' : 'Nein'], ['HDR', matchMedia('(dynamic-range: high)').matches ? 'Ja' : 'Nein'], ['Dark Mode', matchMedia('(prefers-color-scheme: dark)').matches ? 'Aktiv' : 'Aus']]);
        let gpu = [['WebGL', 'nicht verfügbar']];
        try {
          const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
          if (gl) { const d = gl.getExtension('WEBGL_debug_renderer_info'); gpu = [['Renderer', d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)], ['Hersteller', d ? gl.getParameter(d.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)], ['Version', gl.getParameter(gl.VERSION)], ['Max. Texturgrösse', String(gl.getParameter(gl.MAX_TEXTURE_SIZE))]]; }
        } catch { /* ignore */ }
        U.q('#gpu').innerHTML = U.kv(gpu);
        const ro = Intl.DateTimeFormat().resolvedOptions();
        U.q('#env').innerHTML = U.kv([['Sprache', n.languages ? n.languages.join(', ') : n.language], ['Zeitzone', ro.timeZone], ['Locale', ro.locale], ['Engine', (n.userAgent.match(/(Chrome|Electron|Firefox|Safari)\/[\d.]+/g) || []).join(' · ')], ['Cookies', n.cookieEnabled ? 'aktiviert' : 'deaktiviert'], ['Reduzierte Bewegung', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Ja' : 'Nein']]);
      };
      draw();
      window.addEventListener('resize', draw);
      return () => window.removeEventListener('resize', draw);
    },
  });

  register({
    id: 'keycode', name: 'Tastatur-Tester', glyph: '⌨', cat: 'system',
    desc: 'Tastendruck anzeigen: key, code, keyCode und Modifier – ideal zum Testen.', keywords: 'keyboard key code event javascript keycode',
    render(root, U) {
      root.innerHTML = `<div class="panel" style="text-align:center;padding:40px"><div class="muted">Drücke eine beliebige Taste …</div><div class="big" id="k" style="font-size:64px;margin:10px 0;color:var(--accent-text)">—</div><div class="row" style="justify-content:center" id="mods"></div></div>
        <div class="cols"><div class="panel"><h3>Event</h3><div id="res"></div></div><div class="panel"><h3>Verlauf</h3><div id="hist" class="row"></div></div></div>`;
      const hist = [];
      const on = (e) => {
        if (document.getElementById('palette') && !document.getElementById('palette').hidden) return;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return;
        e.preventDefault();
        U.q('#k').textContent = e.key === ' ' ? '␣' : e.key;
        U.q('#mods').innerHTML = [['metaKey', '⌘ Cmd'], ['ctrlKey', '⌃ Ctrl'], ['altKey', '⌥ Option'], ['shiftKey', '⇧ Shift']].map(([k, l]) => `<span class="badge ${e[k] ? '' : 'warn'}" style="${e[k] ? '' : 'opacity:.35'}">${l}</span>`).join('');
        U.q('#res').innerHTML = U.kv([['event.key', e.key], ['event.code', e.code], ['event.keyCode', String(e.keyCode)], ['event.which', String(e.which)], ['event.location', ['Standard', 'Links', 'Rechts', 'Ziffernblock'][e.location] || String(e.location)], ['repeat', String(e.repeat)]]);
        hist.unshift(e.key === ' ' ? 'Space' : e.key); hist.length = Math.min(hist.length, 30);
        U.q('#hist').innerHTML = hist.map((h) => `<kbd>${U.esc(h)}</kbd>`).join('');
      };
      window.addEventListener('keydown', on);
      return () => window.removeEventListener('keydown', on);
    },
  });

  register({
    id: 'display-test', name: 'Bildschirm-Test', glyph: '▣', cat: 'system',
    desc: 'Pixelfehler, Ausleuchtung und Farbverläufe am Display prüfen (Vollbild).', keywords: 'dead pixel display monitor test fullscreen',
    render(root, U) {
      const C = [['#ffffff', 'Weiss'], ['#000000', 'Schwarz'], ['#ff0000', 'Rot'], ['#00ff00', 'Grün'], ['#0000ff', 'Blau'], ['#004984', 'SWISSNAND'], ['#808080', 'Grau 50 %'], ['grad', 'Verlauf'], ['grid', 'Raster']];
      root.innerHTML = `<div class="panel"><p class="muted" style="margin-top:0">Klicke eine Farbe, um sie im Vollbild zu zeigen. <b>Klick</b> oder <b>→</b> wechselt zur nächsten, <b>Esc</b> beendet.</p>
        <div class="grid">${C.map(([c, l], i) => `<button class="card" data-i="${i}" style="cursor:pointer;flex-direction:column;align-items:stretch;font:inherit;text-align:left"><div style="height:70px;border-radius:8px;border:1px solid var(--border);background:${c === 'grad' ? 'linear-gradient(90deg,#000,#fff)' : c === 'grid' ? 'repeating-linear-gradient(0deg,#000 0 1px,#fff 1px 10px),repeating-linear-gradient(90deg,#000 0 1px,transparent 1px 10px)' : c}"></div><b style="margin-top:8px">${l}</b></button>`).join('')}</div></div>`;
      let el = null, idx = 0;
      const bg = (c) => c === 'grad' ? 'linear-gradient(90deg,#000,#fff)' : c === 'grid' ? 'repeating-linear-gradient(0deg,#000 0 1px,transparent 1px 20px),repeating-linear-gradient(90deg,#000 0 1px,#fff 1px 20px)' : c;
      const close = () => { if (el) { el.remove(); el = null; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } };
      const show = (i) => { idx = (i + C.length) % C.length; if (!el) { el = document.createElement('div'); el.className = 'fs-color'; el.onclick = () => show(idx + 1); document.body.appendChild(el); el.requestFullscreen && el.requestFullscreen().catch(() => {}); } el.style.background = bg(C[idx][0]); };
      const key = (e) => { if (!el) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight' || e.key === ' ') show(idx + 1); else if (e.key === 'ArrowLeft') show(idx - 1); };
      const fsc = () => { if (!document.fullscreenElement) close(); };
      U.qa('[data-i]').forEach((b) => { b.onclick = () => show(+b.dataset.i); });
      window.addEventListener('keydown', key); document.addEventListener('fullscreenchange', fsc);
      return () => { close(); window.removeEventListener('keydown', key); document.removeEventListener('fullscreenchange', fsc); };
    },
  });
})();
