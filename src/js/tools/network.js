/* Kategorie: Netzwerk */
(() => {
  'use strict';
  const { register } = window.TB;

  const ipToInt = (ip) => {
    const p = ip.trim().split('.');
    if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || +x > 255)) return null;
    return p.reduce((a, x) => a * 256 + +x, 0);
  };
  const intToIp = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  const maskFromBits = (b) => b === 0 ? 0 : (0xFFFFFFFF << (32 - b)) >>> 0;
  const ipClass = (n) => { const f = n >>> 24; return f < 128 ? 'A' : f < 192 ? 'B' : f < 224 ? 'C' : f < 240 ? 'D (Multicast)' : 'E (reserviert)'; };
  const ipType = (n) => {
    const inR = (a, b) => { const [ip, bits] = a.split('/'); const m = maskFromBits(+bits); return ((n & m) >>> 0) === ((ipToInt(ip) & m) >>> 0); };
    if (inR('10.0.0.0/8') || inR('172.16.0.0/12') || inR('192.168.0.0/16')) return 'Privat (RFC 1918)';
    if (inR('127.0.0.0/8')) return 'Loopback';
    if (inR('169.254.0.0/16')) return 'Link-Local (APIPA)';
    if (inR('100.64.0.0/10')) return 'Carrier-Grade NAT';
    if (inR('224.0.0.0/4')) return 'Multicast';
    if (inR('0.0.0.0/8')) return '„Dieses Netz“';
    if (inR('240.0.0.0/4')) return 'Reserviert';
    return 'Öffentlich';
  };
  const bin = (n) => n.toString(2).padStart(32, '0').replace(/(.{8})(?!$)/g, '$1.');

  register({
    id: 'subnet', name: 'Subnetz-Rechner', glyph: '/24', cat: 'network',
    desc: 'IPv4 CIDR: Netz, Broadcast, Hosts, Maske, Wildcard und Subnetting.', keywords: 'cidr subnet mask ipv4 netmask calculator',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row"><input id="in" class="mono grow" value="192.168.1.10/24" placeholder="10.0.0.1/16 oder 10.0.0.1 255.255.0.0" style="font-size:16px"/>
          <select id="bits" style="width:auto"></select></div><div id="msg"></div></div>
        <div class="cols"><div class="panel"><h3>Ergebnis</h3><div id="res"></div></div><div class="panel"><h3>Binär</h3><div id="bin"></div>
        <h3 style="margin-top:18px">Aufteilen in Subnetze</h3><div class="row"><span class="muted small">Neue Präfixlänge</span><select id="split" style="width:auto"></select></div><div id="subs" style="margin-top:10px"></div></div></div>`;
      const bitsSel = U.q('#bits'), splitSel = U.q('#split');
      bitsSel.innerHTML = Array.from({ length: 33 }, (_, i) => `<option value="${i}">/${i} – ${intToIp(maskFromBits(i))}</option>`).join('');
      const run = (fromSel) => {
        let s = U.q('#in').value.trim(); U.q('#msg').innerHTML = '';
        let ip, bits;
        const m = s.match(/^([\d.]+)\s*(?:\/\s*(\d{1,2})|\s+([\d.]+))?$/);
        if (!m || (ip = ipToInt(m[1])) === null) { U.q('#msg').innerHTML = '<div class="msg err">Ungültige IPv4-Adresse</div>'; return; }
        if (fromSel) bits = +bitsSel.value;
        else if (m[2] !== undefined) bits = +m[2];
        else if (m[3]) { const mk = ipToInt(m[3]); bits = mk === null ? NaN : mk.toString(2).replace(/0+$/, '').length; if (mk !== null && maskFromBits(bits) !== mk) bits = NaN; }
        else bits = 24;
        if (isNaN(bits) || bits > 32) { U.q('#msg').innerHTML = '<div class="msg err">Ungültige Maske/Präfix</div>'; return; }
        if (fromSel) U.q('#in').value = intToIp(ip) + '/' + bits;
        bitsSel.value = bits;
        const mask = maskFromBits(bits), net = (ip & mask) >>> 0, bc = (net | ~mask) >>> 0;
        const total = 2 ** (32 - bits);
        const hosts = bits >= 31 ? total : total - 2;
        const first = bits >= 31 ? net : net + 1, last = bits >= 31 ? bc : bc - 1;
        U.q('#res').innerHTML = U.kv([
          ['Adresse', intToIp(ip)], ['Netzwerk', `${intToIp(net)}/${bits}`], ['Netzmaske', intToIp(mask)], ['Wildcard', intToIp(~mask >>> 0)],
          ['Broadcast', bits >= 31 ? '—' : intToIp(bc)], ['Erster Host', intToIp(first)], ['Letzter Host', intToIp(last)],
          ['Nutzbare Hosts', U.fmtNum(hosts, 0)], ['Adressen total', U.fmtNum(total, 0)], ['Klasse', ipClass(ip)], ['Typ', ipType(ip)],
          ['Reverse DNS', intToIp(ip).split('.').reverse().join('.') + '.in-addr.arpa'],
        ]);
        U.q('#bin').innerHTML = `<div class="out" style="line-height:1.9">IP&nbsp;&nbsp;&nbsp;${bin(ip)}<br>Maske ${bin(mask)}<br>Netz&nbsp;&nbsp;${bin(net)}</div>`;
        const prev = +splitSel.value || Math.min(32, bits + 2);
        splitSel.innerHTML = Array.from({ length: 32 - bits }, (_, i) => bits + i + 1).map((b) => `<option ${b === prev ? 'selected' : ''}>${b}</option>`).join('');
        const nb = +splitSel.value;
        if (!nb) { U.q('#subs').innerHTML = ''; return; }
        const count = 2 ** (nb - bits), size = 2 ** (32 - nb);
        const rows = [];
        for (let i = 0; i < Math.min(count, 256); i++) { const n = net + i * size; rows.push(`<tr><td class="mono">${intToIp(n)}/${nb}</td><td class="mono">${intToIp(nb >= 31 ? n : n + 1)} – ${intToIp(nb >= 31 ? n + size - 1 : n + size - 2)}</td></tr>`); }
        U.q('#subs').innerHTML = `<div class="small muted" style="margin-bottom:6px">${U.fmtNum(count, 0)} Subnetze à ${U.fmtNum(nb >= 31 ? size : size - 2, 0)} Hosts${count > 256 ? ' (erste 256 angezeigt)' : ''}</div><div class="tbl-wrap" style="max-height:300px"><table class="tbl"><tr><th>Subnetz</th><th>Host-Bereich</th></tr>${rows.join('')}</table></div>`;
      };
      U.q('#in').addEventListener('input', () => run(false));
      bitsSel.onchange = () => run(true);
      splitSel.onchange = () => run(false);
      run(false);
    },
  });

  register({
    id: 'ip-convert', name: 'IP-Konverter', glyph: 'IP', cat: 'network',
    desc: 'IPv4 zwischen Punkt-, Dezimal-, Hex- und Binärdarstellung umrechnen.', keywords: 'ipv4 decimal hex binary long integer',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="field"><div class="label">IPv4-Adresse oder Zahl</div><input id="in" class="mono" value="192.168.178.1" style="font-size:16px"/></div><div id="res"></div><div id="msg"></div></div>`;
      const run = () => {
        const s = U.q('#in').value.trim(); U.q('#msg').innerHTML = '';
        let n = ipToInt(s);
        if (n === null) {
          if (/^0x[0-9a-f]{1,8}$/i.test(s)) n = parseInt(s, 16);
          else if (/^[01.]{32,35}$/.test(s) && s.replace(/\./g, '').length === 32) n = parseInt(s.replace(/\./g, ''), 2);
          else if (/^\d+$/.test(s) && +s <= 0xFFFFFFFF) n = +s;
        }
        if (n === null || isNaN(n)) { U.q('#res').innerHTML = ''; U.q('#msg').innerHTML = s ? '<div class="msg err">Nicht erkannt</div>' : ''; return; }
        U.q('#res').innerHTML = U.kv([['Punktnotation', intToIp(n)], ['Dezimal', String(n)], ['Hexadezimal', '0x' + n.toString(16).toUpperCase().padStart(8, '0')], ['Binär', bin(n)],
          ['IPv4-mapped IPv6', '::ffff:' + intToIp(n)], ['Typ', ipType(n)], ['Klasse', ipClass(n)]]);
      };
      U.q('#in').oninput = run; run();
    },
  });

  const expand6 = (s) => {
    s = s.trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
    let v4 = '';
    const m = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
    if (m) { const n = ipToInt(m[1]); if (n === null) throw new Error(); v4 = ((n >>> 16).toString(16)) + ':' + ((n & 0xffff).toString(16)); s = s.slice(0, -m[1].length) + v4; }
    if ((s.match(/::/g) || []).length > 1) throw new Error();
    let [a, b] = s.split('::');
    const ha = a ? a.split(':') : [], hb = b !== undefined ? (b ? b.split(':') : []) : null;
    let groups;
    if (hb === null) groups = ha; else groups = [...ha, ...Array(8 - ha.length - hb.length).fill('0'), ...hb];
    if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) throw new Error();
    return groups.map((g) => g.padStart(4, '0'));
  };
  const compress6 = (g) => {
    const short = g.map((x) => x.replace(/^0+(?=.)/, ''));
    let best = [-1, 0], cur = [-1, 0];
    short.forEach((x, i) => { if (x === '0') { if (cur[0] < 0) cur = [i, 1]; else cur[1]++; if (cur[1] > best[1]) best = [...cur]; } else cur = [-1, 0]; });
    if (best[1] < 2) return short.join(':');
    return (short.slice(0, best[0]).join(':') + '::' + short.slice(best[0] + best[1]).join(':'));
  };

  register({
    id: 'ipv6', name: 'IPv6-Werkzeug', glyph: 'v6', cat: 'network',
    desc: 'IPv6-Adressen expandieren, komprimieren und Präfixe berechnen.', keywords: 'ipv6 expand compress prefix',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row"><input id="in" class="mono grow" value="2001:db8::8a2e:370:7334/64" style="font-size:16px"/></div><div id="msg"></div></div><div class="panel"><div id="res"></div></div>`;
      const run = () => {
        const [addr, pre] = U.q('#in').value.trim().split('/'); U.q('#msg').innerHTML = '';
        try {
          const g = expand6(addr);
          const big = BigInt('0x' + g.join(''));
          const rows = [['Vollständig', g.join(':')], ['Komprimiert', compress6(g)], ['Reverse DNS', g.join('').split('').reverse().join('.') + '.ip6.arpa']];
          const f = parseInt(g[0], 16);
          rows.push(['Typ', big === 1n ? 'Loopback' : big === 0n ? 'Unspezifiziert' : (f & 0xffc0) === 0xfe80 ? 'Link-Local' : (f & 0xfe00) === 0xfc00 ? 'Unique Local (ULA)' : (f & 0xff00) === 0xff00 ? 'Multicast' : (f & 0xfff0) === 0x2001 && g[1] === '0db8' ? 'Dokumentation' : (f & 0xe000) === 0x2000 ? 'Global Unicast' : 'Andere']);
          if (pre !== undefined) {
            const p = +pre; if (isNaN(p) || p < 0 || p > 128) throw new Error();
            const mask = p === 0 ? 0n : ((1n << 128n) - 1n) ^ ((1n << BigInt(128 - p)) - 1n);
            const net = big & mask, last = net | (((1n << 128n) - 1n) ^ mask);
            const toG = (n) => n.toString(16).padStart(32, '0').match(/.{4}/g);
            rows.push(['Präfix', compress6(toG(net)) + '/' + p], ['Erste Adresse', compress6(toG(net))], ['Letzte Adresse', compress6(toG(last))], ['Anzahl Adressen', '2^' + (128 - p) + (128 - p <= 64 ? ' = ' + (2n ** BigInt(128 - p)).toLocaleString('de-CH') : '')]);
          }
          U.q('#res').innerHTML = U.kv(rows);
        } catch { U.q('#res').innerHTML = ''; U.q('#msg').innerHTML = '<div class="msg err">Ungültige IPv6-Adresse</div>'; }
      };
      U.q('#in').oninput = run; run();
    },
  });

  register({
    id: 'mac', name: 'MAC-Adressen', glyph: 'MAC', cat: 'network',
    desc: 'MAC-Adressen formatieren, analysieren und zufällig generieren.', keywords: 'mac address ethernet oui generator format',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="field"><div class="label">MAC-Adresse</div><div class="row"><input id="in" class="mono grow" value="3C:22:FB:12:AB:9E" style="font-size:16px"/><button class="btn" id="rnd">${U.icon('refresh')}Zufällig</button></div></div>
        <label class="check"><input type="checkbox" id="local" checked> Zufällige als „lokal verwaltet“ markieren</label><div id="msg"></div></div><div class="panel"><div id="res"></div></div>`;
      const run = () => {
        const h = U.q('#in').value.replace(/[^0-9a-f]/gi, '').toLowerCase(); U.q('#msg').innerHTML = '';
        if (h.length !== 12) { U.q('#res').innerHTML = ''; U.q('#msg').innerHTML = '<div class="msg err">Eine MAC-Adresse hat 12 Hex-Ziffern</div>'; return; }
        const p = h.match(/../g), b0 = parseInt(p[0], 16);
        U.q('#res').innerHTML = U.kv([['Doppelpunkt', p.join(':').toUpperCase()], ['Bindestrich (Windows)', p.join('-').toUpperCase()], ['Cisco', h.match(/.{4}/g).join('.')], ['Ohne Trennzeichen', h.toUpperCase()],
          ['OUI (Hersteller-Präfix)', p.slice(0, 3).join(':').toUpperCase()], ['Typ', b0 & 1 ? 'Multicast' : 'Unicast'], ['Verwaltung', b0 & 2 ? 'Lokal verwaltet (oft zufällig/privat)' : 'Global eindeutig (Hersteller)'],
          ['EUI-64 / IPv6 Link-Local', 'fe80::' + compress6(['0000', '0000', '0000', '0000', ((b0 ^ 2).toString(16).padStart(2, '0') + p[1]), p[2] + 'ff', 'fe' + p[3], p[4] + p[5]]).replace(/^::/, '')]]);
      };
      U.q('#rnd').onclick = () => {
        const b = crypto.getRandomValues(new Uint8Array(6));
        b[0] &= 0xfe; if (U.q('#local').checked) b[0] |= 2; else b[0] &= 0xfd;
        U.q('#in').value = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(':').toUpperCase(); run();
      };
      U.q('#in').oninput = run; run();
    },
  });

  register({
    id: 'url-parser', name: 'URL-Analyse', glyph: 'URL', cat: 'network',
    desc: 'URLs in Bestandteile zerlegen und Query-Parameter bearbeiten.', keywords: 'url parse query string params',
    render(root, U) {
      root.innerHTML = `<div class="panel"><input id="in" class="mono" style="font-size:15px" value="https://user:pass@www.swissnand.ch:8443/pfad/seite.html?lang=de&id=42&tag=it#abschnitt"/><div id="msg"></div></div>
        <div class="cols"><div class="panel"><h3>Bestandteile</h3><div id="res"></div></div><div class="panel"><h3>Query-Parameter</h3><div id="qs"></div></div></div>`;
      const run = () => {
        U.q('#msg').innerHTML = '';
        let u; try { u = new URL(U.q('#in').value.trim()); } catch { U.q('#res').innerHTML = ''; U.q('#qs').innerHTML = ''; U.q('#msg').innerHTML = '<div class="msg err">Ungültige URL (Protokoll nicht vergessen, z. B. https://)</div>'; return; }
        U.q('#res').innerHTML = U.kv([['Protokoll', u.protocol], ['Benutzer', u.username], ['Passwort', u.password], ['Host', u.hostname], ['Port', u.port || '(Standard)'], ['Pfad', u.pathname], ['Query', u.search], ['Fragment', u.hash], ['Origin', u.origin]]);
        const ps = [...u.searchParams];
        U.q('#qs').innerHTML = ps.length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>Schlüssel</th><th>Wert (dekodiert)</th></tr>${ps.map(([k, v]) => `<tr><td class="mono">${U.esc(k)}</td><td class="mono">${U.esc(v)}</td></tr>`).join('')}</table></div>` : '<span class="muted">Keine Parameter</span>';
      };
      U.q('#in').oninput = run; run();
    },
  });

  register({
    id: 'dns', name: 'DNS Lookup', glyph: 'DNS', cat: 'network',
    desc: 'DNS-Einträge (A, AAAA, MX, TXT, NS, CNAME, SOA, CAA) via DNS-over-HTTPS abfragen.', keywords: 'dns nslookup dig mx txt spf dmarc record',
    render(root, U) {
      const TYPES = { A: 1, AAAA: 28, CNAME: 5, MX: 15, NS: 2, TXT: 16, SOA: 6, CAA: 257, SRV: 33, PTR: 12 };
      root.innerHTML = `<div class="panel"><div class="row"><input id="dom" class="mono grow" value="swissnand.ch" placeholder="domain.ch" style="font-size:15px"/>
        <select id="type" style="width:auto">${['ALLE', ...Object.keys(TYPES)].map((t) => `<option>${t}</option>`).join('')}</select><button class="btn btn-primary" id="go">Abfragen</button></div>
        <div class="row small muted" style="margin-top:8px">Schnell: <button class="btn btn-sm btn-ghost" data-q="_dmarc">DMARC</button><button class="btn btn-sm btn-ghost" data-q="spf">SPF</button><button class="btn btn-sm btn-ghost" data-q="www">www</button> · Resolver: Cloudflare 1.1.1.1 (DoH)</div></div>
        <div class="panel"><div id="res"><span class="muted">Domain eingeben und abfragen.</span></div></div>`;
      const q1 = async (name, t) => {
        const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${t}`, { headers: { accept: 'application/dns-json' } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      };
      const go = async (special) => {
        let name = U.q('#dom').value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        let type = U.q('#type').value;
        if (special === '_dmarc') { name = '_dmarc.' + name; type = 'TXT'; }
        if (special === 'www') { name = 'www.' + name; type = 'ALLE'; }
        if (special === 'spf') type = 'TXT';
        if (!name) return;
        if (type === 'PTR' && /^\d+\.\d+\.\d+\.\d+$/.test(name)) name = name.split('.').reverse().join('.') + '.in-addr.arpa';
        U.q('#res').innerHTML = '<span class="muted">Frage ab …</span>';
        const types = type === 'ALLE' ? ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA'] : [type];
        try {
          const all = await Promise.all(types.map((t) => q1(name, t).then((j) => [t, j])));
          const rows = [];
          let status = 0;
          for (const [, j] of all) {
            status = Math.max(status, j.Status);
            for (const a of j.Answer || []) {
              const tn = Object.keys(TYPES).find((k) => TYPES[k] === a.type) || a.type;
              if (special === 'spf' && !String(a.data).includes('v=spf1')) continue;
              rows.push(`<tr><td><span class="badge">${tn}</span></td><td class="mono">${U.esc(a.name)}</td><td class="mono">${U.esc(String(a.data).replace(/^"|"$/g, '').replace(/" "/g, ''))}</td><td class="mono muted">${a.TTL}s</td></tr>`);
            }
          }
          const uniq = [...new Set(rows)];
          U.q('#res').innerHTML = uniq.length ? `<div class="small muted" style="margin-bottom:8px">${U.esc(name)} · ${uniq.length} Einträge</div><div class="tbl-wrap"><table class="tbl"><tr><th>Typ</th><th>Name</th><th>Wert</th><th>TTL</th></tr>${uniq.join('')}</table></div>`
            : `<div class="msg err">Keine Einträge gefunden${status === 3 ? ' – Domain existiert nicht (NXDOMAIN)' : ''}</div>`;
        } catch (e) { U.q('#res').innerHTML = `<div class="msg err">Abfrage fehlgeschlagen: ${U.esc(e.message)} – Internetverbindung prüfen.</div>`; }
      };
      U.q('#go').onclick = () => go();
      U.q('#dom').onkeydown = (e) => { if (e.key === 'Enter') go(); };
      U.qa('[data-q]').forEach((b) => { b.onclick = () => go(b.dataset.q); });
    },
  });

  register({
    id: 'my-ip', name: 'Meine IP-Adresse', glyph: 'WAN', cat: 'network',
    desc: 'Öffentliche IPv4/IPv6-Adresse, Provider und Standort anzeigen.', keywords: 'public ip wan external isp what is my ip',
    render(root, U) {
      root.innerHTML = `<div class="cols"><div class="panel"><h3>IPv4</h3><div class="row"><div class="big grow" id="v4">…</div><button class="copy-btn" data-copy="#v4">${U.icon('copy')}</button></div></div>
        <div class="panel"><h3>IPv6</h3><div class="row"><div class="big grow" id="v6" style="font-size:17px">…</div><button class="copy-btn" data-copy="#v6">${U.icon('copy')}</button></div></div></div>
        <div class="panel"><h3>Details</h3><div id="info" class="muted">Lade …</div></div><div class="row"><button class="btn" id="re">${U.icon('refresh')}Aktualisieren</button></div>`;
      const load = async () => {
        U.q('#v4').textContent = '…'; U.q('#v6').textContent = '…';
        fetch('https://api.ipify.org?format=json').then((r) => r.json()).then((j) => { U.q('#v4').textContent = j.ip; }).catch(() => { U.q('#v4').textContent = 'nicht verfügbar'; });
        fetch('https://api64.ipify.org?format=json').then((r) => r.json()).then((j) => { U.q('#v6').textContent = j.ip.includes(':') ? j.ip : 'keine IPv6'; }).catch(() => { U.q('#v6').textContent = 'nicht verfügbar'; });
        try {
          const j = await (await fetch('https://ipapi.co/json/')).json();
          if (j.error) throw new Error(j.reason);
          U.q('#info').innerHTML = U.kv([['Provider', j.org], ['ASN', j.asn], ['Ort', [j.postal, j.city].filter(Boolean).join(' ')], ['Region', j.region], ['Land', j.country_name], ['Zeitzone', j.timezone]]);
        } catch { U.q('#info').innerHTML = '<span class="muted">Details nicht verfügbar (Rate-Limit oder offline).</span>'; }
      };
      U.q('#re').onclick = load; load();
    },
  });

  register({
    id: 'user-agent', name: 'User-Agent Parser', glyph: 'UA', cat: 'network',
    desc: 'User-Agent-Strings analysieren: Browser, Engine, Betriebssystem, Gerät.', keywords: 'browser useragent os device',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="field"><div class="label">User-Agent <span class="hint"><button class="btn btn-sm btn-ghost" id="mine">Eigenen verwenden</button></span></div><textarea id="in" style="min-height:80px"></textarea></div></div><div class="panel"><div id="res"></div></div>`;
      const parse = (ua) => {
        const m = (re) => (ua.match(re) || [])[1];
        let browser = 'Unbekannt', ver = '';
        const tests = [['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/], ['Opera', /OPR\/([\d.]+)/], ['Brave', /Brave\/([\d.]+)/], ['Vivaldi', /Vivaldi\/([\d.]+)/], ['Electron', /Electron\/([\d.]+)/], ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/], ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/], ['Safari', /Version\/([\d.]+).*Safari/], ['curl', /curl\/([\d.]+)/], ['Googlebot', /Googlebot\/([\d.]+)/]];
        for (const [n, re] of tests) { const v = m(re); if (v) { browser = n; ver = v; break; } }
        let os = 'Unbekannt';
        if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS ' + (m(/OS (\d+[_\d]*)/) || '').replace(/_/g, '.');
        else if (/Mac OS X/.test(ua)) os = 'macOS ' + (m(/Mac OS X (\d+[_.\d]*)/) || '').replace(/_/g, '.');
        else if (/Android/.test(ua)) os = 'Android ' + (m(/Android ([\d.]+)/) || '');
        else if (/Windows NT/.test(ua)) { const v = m(/Windows NT ([\d.]+)/); os = 'Windows ' + ({ '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }[v] || v); }
        else if (/CrOS/.test(ua)) os = 'ChromeOS';
        else if (/Linux/.test(ua)) os = 'Linux';
        const engine = /Gecko\/\d/.test(ua) && /Firefox/.test(ua) ? 'Gecko' : /AppleWebKit/.test(ua) ? (/Chrome|CriOS/.test(ua) ? 'Blink' : 'WebKit') : '—';
        const device = /iPad|Tablet/.test(ua) ? 'Tablet' : /Mobile|iPhone|Android/.test(ua) ? 'Smartphone' : /bot|crawl|spider/i.test(ua) ? 'Bot' : 'Desktop';
        return [['Browser', `${browser} ${ver}`.trim()], ['Engine', engine], ['Betriebssystem', os.trim()], ['Gerät', device], ['Länge', ua.length + ' Zeichen']];
      };
      const run = () => { U.q('#res').innerHTML = U.kv(parse(U.q('#in').value)); };
      U.q('#mine').onclick = () => { U.q('#in').value = navigator.userAgent; run(); };
      U.q('#in').oninput = run;
      U.q('#in').value = navigator.userAgent; run();
    },
  });

  register({
    id: 'wol', name: 'Wake-on-LAN Paket', glyph: 'WOL', cat: 'network',
    desc: 'Magic Packet für Wake-on-LAN erzeugen inkl. Terminal-Befehle.', keywords: 'wake on lan magic packet wol',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="cols"><div class="field"><div class="label">MAC-Adresse des Zielgeräts</div><input id="mac" class="mono" value="AA:BB:CC:DD:EE:FF"/></div>
        <div class="field"><div class="label">Broadcast-Adresse</div><input id="bc" class="mono" value="192.168.1.255"/></div></div><div id="msg"></div></div>
        <div class="panel"><h3>Magic Packet (102 Bytes, Hex)</h3><div class="out" id="pk"></div><h3 style="margin-top:18px">Senden vom Mac</h3><div id="cmd"></div></div>`;
      const run = () => {
        const h = U.q('#mac').value.replace(/[^0-9a-f]/gi, '').toLowerCase(); U.q('#msg').innerHTML = '';
        if (h.length !== 12) { U.q('#msg').innerHTML = '<div class="msg err">Ungültige MAC-Adresse</div>'; return; }
        const pk = 'ff'.repeat(6) + h.repeat(16);
        U.q('#pk').textContent = pk.match(/.{1,32}/g).join('\n');
        const mac = h.match(/../g).join(':'), bc = U.q('#bc').value.trim();
        U.q('#cmd').innerHTML = U.kv([['Homebrew', `brew install wakeonlan && wakeonlan -i ${bc} ${mac}`], ['Python', `python3 -c "import socket;s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.setsockopt(socket.SOL_SOCKET,socket.SO_BROADCAST,1);s.sendto(bytes.fromhex('${pk}'),('${bc}',9))"`]]);
      };
      U.q('#mac').oninput = run; U.q('#bc').oninput = run; run();
    },
  });
})();
