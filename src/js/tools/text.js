/* Kategorie: Text */
(() => {
  'use strict';
  const { register } = window.TB;

  register({
    id: 'text-stats', name: 'Text-Statistik', glyph: 'Aa', cat: 'text',
    desc: 'Zeichen, Wörter, Zeilen, Bytes, Lesezeit und häufigste Wörter zählen.', keywords: 'count words characters lines',
    render(root, U) {
      root.innerHTML = `<div class="panel"><textarea id="in" style="min-height:260px" placeholder="Text einfügen …"></textarea></div><div class="panel"><div class="stat-grid" id="st"></div></div><div class="panel"><h3>Häufigste Wörter</h3><div id="top" class="row"></div></div>`;
      const run = () => {
        const t = U.q('#in').value;
        const words = t.match(/[\p{L}\p{N}'’-]+/gu) || [];
        const stats = [['Zeichen', [...t].length], ['Ohne Leerzeichen', [...t.replace(/\s/g, '')].length], ['Wörter', words.length], ['Zeilen', t ? t.split('\n').length : 0],
          ['Sätze', (t.match(/[^.!?]+[.!?]+/g) || []).length], ['Absätze', t.split(/\n\s*\n/).filter((x) => x.trim()).length], ['Bytes (UTF-8)', U.utf8.enc(t).length], ['Lesezeit', Math.max(0, Math.ceil(words.length / 230)) + ' min']];
        U.q('#st').innerHTML = stats.map(([k, v]) => `<div class="stat"><b>${typeof v === 'number' ? U.fmtNum(v, 0) : v}</b><span>${k}</span></div>`).join('');
        const freq = {}; words.forEach((w) => { w = w.toLowerCase(); if (w.length > 2) freq[w] = (freq[w] || 0) + 1; });
        U.q('#top').innerHTML = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([w, c]) => `<span class="badge">${U.esc(w)} · ${c}</span>`).join('') || '<span class="muted">—</span>';
      };
      U.q('#in').oninput = run; run();
    },
  });

  const splitWords = (s) => s.replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  register({
    id: 'case', name: 'Case Converter', glyph: 'aA', cat: 'text',
    desc: 'camelCase, snake_case, kebab-case, PascalCase, UPPER und mehr.', keywords: 'camel snake kebab pascal upper lower title',
    render(root, U) {
      root.innerHTML = `<div class="panel"><textarea id="in" style="min-height:100px">SWISSNAND it toolbox Version 2</textarea></div><div class="panel"><div id="res"></div></div>`;
      const run = () => {
        const s = U.q('#in').value, w = splitWords(s), lw = w.map((x) => x.toLowerCase());
        const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
        U.q('#res').innerHTML = U.kv([['camelCase', lw.map((x, i) => i ? cap(x) : x).join('')], ['PascalCase', lw.map(cap).join('')], ['snake_case', lw.join('_')], ['SCREAMING_SNAKE', lw.join('_').toUpperCase()],
          ['kebab-case', lw.join('-')], ['dot.case', lw.join('.')], ['path/case', lw.join('/')], ['Title Case', s.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase())],
          ['Satzanfang', s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()], ['GROSS', s.toUpperCase()], ['klein', s.toLowerCase()], ['iNVERTIERT', [...s].map((c) => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('')]]);
      };
      U.q('#in').oninput = run; run();
    },
  });

  /* Zeilenweises Diff (Myers/LCS) */
  const diffLines = (a, b) => {
    const A = a.split('\n'), B = b.split('\n'), n = A.length, m = B.length;
    if (n * m > 4e6) return null;
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push(['same', A[i]]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(['del', A[i++]]);
      else out.push(['add', B[j++]]);
    }
    while (i < n) out.push(['del', A[i++]]);
    while (j < m) out.push(['add', B[j++]]);
    return out;
  };

  register({
    id: 'diff', name: 'Text-Vergleich (Diff)', glyph: '±', cat: 'text',
    desc: 'Zwei Texte oder Konfigurationen zeilenweise vergleichen.', keywords: 'diff compare vergleichen changes',
    render(root, U) {
      root.innerHTML = `<div class="panel cols"><div class="field"><div class="label">Original</div><textarea id="a" spellcheck="false">server {\n  listen 80;\n  server_name swissnand.ch;\n  root /var/www/html;\n}</textarea></div>
        <div class="field"><div class="label">Geändert</div><textarea id="b" spellcheck="false">server {\n  listen 443 ssl;\n  server_name swissnand.ch www.swissnand.ch;\n  root /var/www/html;\n}</textarea></div></div>
        <div class="panel"><div class="row" style="margin-bottom:10px"><h3 style="margin:0">Unterschiede</h3><span class="spacer"></span><label class="check"><input type="checkbox" id="ws"> Leerzeichen ignorieren</label><label class="check"><input type="checkbox" id="only"> Nur Änderungen</label><span id="sum"></span></div><div class="diff" id="out"></div></div>`;
      const run = () => {
        let a = U.q('#a').value, b = U.q('#b').value;
        if (U.q('#ws').checked) { const n = (s) => s.split('\n').map((l) => l.trim().replace(/\s+/g, ' ')).join('\n'); a = n(a); b = n(b); }
        const d = diffLines(a, b);
        if (!d) { U.q('#out').innerHTML = '<div class="del">Texte zu gross für den Vergleich</div>'; return; }
        const add = d.filter((x) => x[0] === 'add').length, del = d.filter((x) => x[0] === 'del').length;
        U.q('#sum').innerHTML = `<span class="badge ok">+${add}</span> <span class="badge err">−${del}</span>`;
        U.q('#out').innerHTML = d.filter((x) => !U.q('#only').checked || x[0] !== 'same').map(([t, l]) => `<div class="${t}">${U.esc(l) || ' '}</div>`).join('') || '<div class="same muted">Keine Unterschiede</div>';
      };
      ['#a', '#b', '#ws', '#only'].forEach((s) => U.q(s).addEventListener('input', U.debounce(run, 150)));
      run();
    },
  });

  register({
    id: 'regex', name: 'Regex-Tester', glyph: '.*', cat: 'text',
    desc: 'Reguläre Ausdrücke live testen, Gruppen anzeigen, Suchen & Ersetzen.', keywords: 'regex regexp regular expression match replace',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row"><span class="mono muted">/</span><input id="re" class="mono grow" value="(\\w+)@([\\w.-]+\\.\\w+)"/><span class="mono muted">/</span><input id="fl" class="mono" value="g" style="width:70px"/></div>
        <div class="row small" style="margin-top:8px">${[['g', 'global'], ['i', 'ignore case'], ['m', 'multiline'], ['s', 'dotAll'], ['u', 'unicode']].map(([f, l]) => `<label class="check"><input type="checkbox" data-f="${f}"> ${f} <span class="muted">${l}</span></label>`).join('')}</div><div id="msg"></div></div>
        <div class="panel"><div class="field"><div class="label">Testtext <span class="hint" id="cnt"></span></div><textarea id="txt" spellcheck="false">Kontakt: info@swissnand.ch oder support@example.com\nKeine Adresse: hallo@welt</textarea></div>
        <div class="field"><div class="label">Treffer</div><div class="out" id="hl" style="white-space:pre-wrap"></div></div></div>
        <div class="cols"><div class="panel"><h3>Gruppen</h3><div id="grp"></div></div><div class="panel"><h3>Ersetzen</h3><input id="rep" class="mono" value="$1 [at] $2"/><div class="out" id="repOut" style="margin-top:10px"></div></div></div>`;
      const syncChecks = () => U.qa('[data-f]').forEach((c) => { c.checked = U.q('#fl').value.includes(c.dataset.f); });
      U.qa('[data-f]').forEach((c) => c.addEventListener('change', () => { U.q('#fl').value = U.qa('[data-f]').filter((x) => x.checked).map((x) => x.dataset.f).join(''); run(); }));
      const run = () => {
        const src = U.q('#re').value, fl = U.q('#fl').value, t = U.q('#txt').value; U.q('#msg').innerHTML = '';
        syncChecks();
        let re; try { re = new RegExp(src, fl.includes('g') ? fl : fl + 'g'); } catch (e) { U.q('#msg').innerHTML = `<div class="msg err">${U.esc(e.message)}</div>`; return; }
        if (!src) { U.q('#hl').textContent = t; U.q('#grp').innerHTML = ''; U.q('#cnt').textContent = ''; return; }
        const ms = [...t.matchAll(re)].slice(0, 1000);
        const used = fl.includes('g') ? ms : ms.slice(0, 1);
        let html = '', last = 0;
        for (const m of used) { if (m[0] === '' && m.index === last && html) continue; html += U.esc(t.slice(last, m.index)) + '<mark>' + U.esc(m[0]) + '</mark>'; last = m.index + m[0].length; }
        U.q('#hl').innerHTML = html + U.esc(t.slice(last));
        U.q('#cnt').textContent = used.length + ' Treffer';
        U.q('#grp').innerHTML = used.length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>#</th><th>Treffer</th>${used[0].length > 1 ? Array.from({ length: used[0].length - 1 }, (_, i) => `<th>$${i + 1}</th>`).join('') : ''}</tr>${used.slice(0, 200).map((m, i) => `<tr><td class="muted">${i + 1}</td>${[...m].map((g) => `<td class="mono">${U.esc(g ?? '')}</td>`).join('')}</tr>`).join('')}</table></div>` : '<span class="muted">Keine Treffer</span>';
        try { U.q('#repOut').textContent = t.replace(new RegExp(src, fl), U.q('#rep').value); } catch { /* ignore */ }
      };
      ['#re', '#fl', '#txt', '#rep'].forEach((s) => U.q(s).addEventListener('input', run));
      run();
    },
  });

  const LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');

  register({
    id: 'lorem', name: 'Lorem Ipsum', glyph: 'Li', cat: 'text',
    desc: 'Blindtext als Absätze, Sätze oder Wörter erzeugen.', keywords: 'placeholder dummy text blindtext',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row"><input type="number" id="n" value="3" min="1" max="100" style="width:90px"/>
        <div class="seg" id="unit"><button class="on" data-v="p">Absätze</button><button data-v="s">Sätze</button><button data-v="w">Wörter</button></div>
        <label class="check"><input type="checkbox" id="start" checked> Mit „Lorem ipsum“ beginnen</label><label class="check"><input type="checkbox" id="html"> Als HTML &lt;p&gt;</label>
        <span class="spacer"></span><button class="btn btn-primary" id="gen">${U.icon('refresh')}Neu</button><button class="btn" data-copy="#out">${U.icon('copy')}Kopieren</button></div></div>
        <div class="panel"><textarea id="out" readonly style="min-height:320px;font-family:var(--font);font-size:14px"></textarea></div>`;
      let unit = 'p';
      const word = () => LOREM[U.randInt(LOREM.length)];
      const sentence = () => { const w = Array.from({ length: 6 + U.randInt(10) }, word); w[0] = w[0][0].toUpperCase() + w[0].slice(1); return w.join(' ').replace(/ (\w+) /, (m, x) => U.randInt(3) ? m : ` ${x}, `) + '.'; };
      const para = () => Array.from({ length: 4 + U.randInt(4) }, sentence).join(' ');
      const gen = () => {
        const n = Math.min(100, Math.max(1, +U.q('#n').value || 1));
        let out;
        if (unit === 'w') out = [Array.from({ length: n }, word).join(' ')];
        else if (unit === 's') out = [Array.from({ length: n }, sentence).join(' ')];
        else out = Array.from({ length: n }, para);
        if (U.q('#start').checked) out[0] = 'Lorem ipsum dolor sit amet, ' + out[0].charAt(0).toLowerCase() + out[0].slice(1);
        if (unit === 'w' && U.q('#start').checked) out[0] = out[0].split(' ').slice(0, Math.max(n, 5)).join(' ');
        U.q('#out').value = U.q('#html').checked ? out.map((p) => `<p>${p}</p>`).join('\n') : out.join('\n\n');
      };
      U.q('#unit').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; unit = b.dataset.v; U.qa('#unit button').forEach((x) => x.classList.toggle('on', x === b)); gen(); };
      ['#n', '#start', '#html'].forEach((s) => U.q(s).addEventListener('input', gen));
      U.q('#gen').onclick = gen; gen();
    },
  });

  register({
    id: 'lines', name: 'Zeilen-Werkzeug', glyph: '≡', cat: 'text',
    desc: 'Zeilen sortieren, Duplikate entfernen, umkehren, mischen, nummerieren.', keywords: 'sort unique dedupe lines shuffle reverse trim',
    render(root, U) {
      const ACT = [['sort', 'A → Z'], ['sortd', 'Z → A'], ['num', 'Numerisch'], ['len', 'Nach Länge'], ['uniq', 'Duplikate entfernen'], ['rev', 'Umkehren'], ['shuf', 'Mischen'], ['trim', 'Trimmen'], ['empty', 'Leere entfernen'], ['number', 'Nummerieren'], ['quote', '"Quoten",'], ['join', 'Zu einer Zeile']];
      root.innerHTML = `<div class="panel"><div class="row" style="margin-bottom:12px">${ACT.map(([a, l]) => `<button class="btn btn-sm" data-a="${a}">${l}</button>`).join('')}</div>
        <div class="row" style="margin-bottom:12px"><label class="check"><input type="checkbox" id="ci"> Gross/Klein ignorieren</label><span class="spacer"></span><span class="small muted" id="cnt"></span><button class="btn btn-sm" data-copy="#in">${U.icon('copy')}Kopieren</button></div>
        <textarea id="in" style="min-height:380px" spellcheck="false">server-03\nserver-01\nnas\nserver-01\n\nrouter\n  switch-core  \nnas</textarea></div>`;
      const cnt = () => { const l = U.q('#in').value.split('\n'); U.q('#cnt').textContent = `${l.length} Zeilen · ${new Set(l).size} eindeutig`; };
      U.qa('[data-a]').forEach((b) => {
        b.onclick = () => {
          let l = U.q('#in').value.split('\n');
          const ci = U.q('#ci').checked, k = (s) => ci ? s.toLowerCase() : s;
          const coll = new Intl.Collator('de', { numeric: true, sensitivity: ci ? 'base' : 'variant' });
          switch (b.dataset.a) {
            case 'sort': l.sort(coll.compare); break;
            case 'sortd': l.sort((a, c) => coll.compare(c, a)); break;
            case 'num': l.sort((a, c) => (parseFloat(a) || 0) - (parseFloat(c) || 0)); break;
            case 'len': l.sort((a, c) => a.length - c.length); break;
            case 'uniq': { const s = new Set(); l = l.filter((x) => !s.has(k(x)) && s.add(k(x))); break; }
            case 'rev': l.reverse(); break;
            case 'shuf': for (let i = l.length - 1; i > 0; i--) { const j = U.randInt(i + 1); [l[i], l[j]] = [l[j], l[i]]; } break;
            case 'trim': l = l.map((x) => x.trim()); break;
            case 'empty': l = l.filter((x) => x.trim()); break;
            case 'number': { const w = String(l.length).length; l = l.map((x, i) => String(i + 1).padStart(w, ' ') + '. ' + x); break; }
            case 'quote': l = l.filter((x) => x.trim()).map((x, i, a) => `"${x.replace(/"/g, '\\"')}"${i < a.length - 1 ? ',' : ''}`); break;
            case 'join': l = [l.filter((x) => x.trim()).join(', ')]; break;
          }
          U.q('#in').value = l.join('\n'); cnt();
        };
      });
      U.q('#in').oninput = cnt; cnt();
    },
  });

  register({
    id: 'slug', name: 'Slug Generator', glyph: 'a-b', cat: 'text',
    desc: 'URL-freundliche Slugs und Dateinamen erzeugen (inkl. Umlaute).', keywords: 'slugify url permalink filename',
    render(root, U) {
      root.innerHTML = `<div class="panel"><input id="in" value="Über die Zürcher IT-Wartung & Grössen-Planung 2026!" style="font-size:15px"/>
        <div class="row" style="margin-top:12px"><label class="check">Trenner <select id="sep" style="width:auto"><option value="-">-</option><option value="_">_</option><option value=".">.</option></select></label><label class="check"><input type="checkbox" id="low" checked> Kleinbuchstaben</label></div></div><div class="panel"><div id="res"></div></div>`;
      const run = () => {
        const sep = U.q('#sep').value;
        let s = U.q('#in').value.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss').replace(/&/g, ' und ');
        s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
        if (U.q('#low').checked) s = s.toLowerCase();
        const slug = s.replace(/[^a-zA-Z0-9]+/g, sep).replace(new RegExp(`^\\${sep}+|\\${sep}+$`, 'g'), '');
        U.q('#res').innerHTML = U.kv([['Slug', slug], ['Dateiname', slug + '.md'], ['URL', 'https://swissnand.ch/' + slug]]);
      };
      ['#in', '#sep', '#low'].forEach((s) => U.q(s).addEventListener('input', run)); run();
    },
  });

  register({
    id: 'markdown', name: 'Markdown Vorschau', glyph: 'MD', cat: 'text',
    desc: 'Markdown live als HTML anzeigen und exportieren.', keywords: 'markdown md preview html readme',
    render(root, U) {
      root.innerHTML = `<div class="row" style="margin-bottom:12px"><button class="btn" id="cp">${U.icon('copy')}HTML kopieren</button><button class="btn" id="dl">${U.icon('download')}HTML speichern</button></div>
        <div class="cols"><div class="panel"><textarea id="in" style="min-height:460px" spellcheck="false"># SWISSNAND\n\nEine **Toolbox** für _IT-Profis_.\n\n## Features\n\n- Offline\n- Open Source\n- Dark Mode\n\n| Tool | Kategorie |\n|------|-----------|\n| Subnetz | Netzwerk |\n| Hash | Sicherheit |\n\n\`\`\`bash\nbrew install --cask swissnand-toolbox\n\`\`\`\n\n> Gebaut in der Schweiz 🇨🇭</textarea></div>
        <div class="panel"><iframe class="md-frame" id="pv" sandbox="allow-same-origin" style="min-height:460px"></iframe></div></div>`;
      let html = '';
      const css = () => { const cs = getComputedStyle(document.documentElement); return `body{font:15px/1.6 -apple-system,system-ui,sans-serif;color:${cs.getPropertyValue('--text')};background:${cs.getPropertyValue('--surface')};padding:8px 18px;margin:0}a{color:${cs.getPropertyValue('--accent-text')}}code,pre{font-family:ui-monospace,Menlo,monospace;background:${cs.getPropertyValue('--surface-2')};border-radius:6px}code{padding:2px 5px;font-size:13px}pre{padding:12px;overflow:auto}pre code{padding:0}table{border-collapse:collapse}td,th{border:1px solid ${cs.getPropertyValue('--border')};padding:6px 10px}blockquote{margin:0;padding-left:14px;border-left:3px solid #004984;color:${cs.getPropertyValue('--muted')}}h1,h2{border-bottom:1px solid ${cs.getPropertyValue('--border')};padding-bottom:4px}img{max-width:100%}`; };
      const run = () => {
        html = window.marked.parse(U.q('#in').value);
        U.q('#pv').srcdoc = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'"><style>${css()}</style>${html}`;
      };
      U.q('#in').oninput = U.debounce(run, 150);
      U.q('#cp').onclick = () => U.copy(html);
      U.q('#dl').onclick = () => U.download('dokument.html', `<!doctype html><meta charset="utf-8"><title>Dokument</title>${html}`, 'text/html');
      run();
    },
  });

  register({
    id: 'unicode', name: 'Zeichen-Inspektor', glyph: 'U+', cat: 'text',
    desc: 'Unicode-Codepoints, UTF-8/UTF-16-Bytes und unsichtbare Zeichen anzeigen.', keywords: 'unicode utf8 codepoint invisible zero width emoji',
    render(root, U) {
      root.innerHTML = `<div class="panel"><input id="in" value="Grüezi 👋 IT​-Box" style="font-size:16px"/><div class="small muted" style="margin-top:8px" id="sum"></div></div><div class="panel"><div class="tbl-wrap"><table class="tbl" id="tb"></table></div></div>`;
      const NAMES = { 0x20: 'LEERZEICHEN', 0xA0: 'GESCHÜTZTES LEERZEICHEN', 0x200B: 'ZERO WIDTH SPACE', 0x200C: 'ZERO WIDTH NON-JOINER', 0x200D: 'ZERO WIDTH JOINER', 0xFEFF: 'BOM / ZWNBSP', 0x9: 'TAB', 0xA: 'LINE FEED', 0xD: 'CARRIAGE RETURN', 0x2028: 'LINE SEPARATOR', 0x00AD: 'SOFT HYPHEN' };
      const run = () => {
        const chars = [...U.q('#in').value].slice(0, 500);
        let hidden = 0;
        U.q('#tb').innerHTML = '<tr><th>Zeichen</th><th>Codepoint</th><th>UTF-8</th><th>UTF-16</th><th>HTML</th><th>Hinweis</th></tr>' + chars.map((c) => {
          const cp = c.codePointAt(0);
          const inv = NAMES[cp] && cp !== 0x20 || /\p{Cf}|\p{Cc}/u.test(c);
          if (inv) hidden++;
          const u16 = Array.from({ length: c.length }, (_, i) => c.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')).join(' ');
          return `<tr><td style="font-size:18px">${inv ? '<span class="badge warn">⌧</span>' : U.esc(c)}</td><td class="mono">U+${cp.toString(16).toUpperCase().padStart(4, '0')}</td><td class="mono">${U.bytesToHex(U.utf8.enc(c)).toUpperCase().match(/../g).join(' ')}</td><td class="mono">${u16}</td><td class="mono">&amp;#${cp};</td><td class="small">${NAMES[cp] || (inv ? 'Steuer-/Formatzeichen' : '')}</td></tr>`;
        }).join('');
        U.q('#sum').innerHTML = `${chars.length} Zeichen · ${U.utf8.enc(U.q('#in').value).length} Bytes UTF-8` + (hidden ? ` · <span class="badge warn">${hidden} unsichtbare Zeichen</span>` : '');
      };
      U.q('#in').oninput = run; run();
    },
  });
})();
