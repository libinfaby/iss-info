// --- PASS PREDICTIONS ---
const Passes = (() => {
    const DAYS = 10;
    const $ = id => document.getElementById(id);
    const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const compass = az => COMPASS[Math.round(az / 22.5) % 16];

    const time = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = ms => new Date(ms).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

    let passes = [];
    let visibleOnly = true;
    let selected = null;
    let computedAt = 0;

    // --- LOCATION ---
    const status = $('location-status');

    function showLocation(observer) {
        status.textContent = observer
            ? `📍 ${observer.name} (${observer.lat.toFixed(2)}°, ${observer.lon.toFixed(2)}°)`
            : 'No location set';
    }

    $('locate-me').addEventListener('click', async () => {
        status.textContent = 'Finding you…';
        try { await Observer.locate(); } catch (e) { status.textContent = e.message; }
    });

    $('location-form').addEventListener('submit', async e => {
        e.preventDefault();
        const query = $('location-input').value.trim();
        if (!query) return;
        status.textContent = 'Searching…';
        try { await Observer.search(query); } catch (err) { status.textContent = err.message; }
    });

    // --- SKY VIEW ---
    // Compass view of the sky: the centre is straight overhead and the outer ring is the horizon
    const SKY_R = 100;
    function skyPoint(az, el) {
        const r = SKY_R * (90 - el) / 90;
        const a = az * Math.PI / 180;
        return [120 + r * Math.sin(a), 120 - r * Math.cos(a)];
    }

    function drawSky(pass, live) {
        let arcs = '';
        if (pass) {
            let run = [];
            const flush = () => {
                if (run.length < 2) return;
                const points = run.map(p => skyPoint(p.az, p.el).map(n => n.toFixed(1)).join(',')).join(' ');
                arcs += `<polyline points="${points}" class="sky-arc${run[0].sunlit ? '' : ' shadow'}"/>`;
            };
            pass.path.forEach(p => {
                const last = run[run.length - 1];
                if (last && last.sunlit !== p.sunlit) { run.push(p); flush(); run = []; }
                run.push(p);
            });
            flush();
            const [sx, sy] = skyPoint(pass.startAz, 0);
            const [mx, my] = skyPoint(pass.maxAz, pass.maxEl);
            arcs += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4" class="sky-start"/>`;
            arcs += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3" class="sky-max"/>`;
        }
        let dot = '';
        if (live && live.el > 0) {
            const [x, y] = skyPoint(live.az, live.el);
            dot = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" class="sky-live"/>`;
        }
        $('sky-view').innerHTML = `
            <circle cx="120" cy="120" r="100" class="sky-horizon"/>
            <circle cx="120" cy="120" r="66.7" class="sky-ring"/>
            <circle cx="120" cy="120" r="33.3" class="sky-ring"/>
            <circle cx="120" cy="120" r="4" class="sky-zenith"/>
            <text x="120" y="12" class="sky-label">N</text>
            <text x="233" y="125" class="sky-label">E</text>
            <text x="120" y="238" class="sky-label">S</text>
            <text x="7" y="125" class="sky-label">W</text>
            <text x="125" y="84" class="sky-tick">60°</text>
            <text x="125" y="50" class="sky-tick">30°</text>
            ${arcs}${dot}`;
    }

    function selectPass(pass) {
        selected = pass;
        $('sky-caption').textContent = pass
            ? `${day(pass.start)}, ${time(pass.start)}: rises ${compass(pass.startAz)}, peaks ${Math.round(pass.maxEl)}° up in the ${compass(pass.maxAz)}, sets ${compass(pass.endAz)}. Dotted means it is in Earth's shadow.`
            : '';
        document.querySelectorAll('#pass-rows tr').forEach(row => {
            row.classList.toggle('selected', !!pass && Number(row.dataset.start) === pass.start);
        });
        drawSky(pass, null);
    }

    // --- TABLE ---
    // Brightness as one to four bars; magnitudes are estimates, lower is brighter
    function brightness(pass) {
        if (pass.mag === null) return '<span class="pass-dim">Not lit</span>';
        const bars = pass.mag < -3 ? 4 : pass.mag < -2 ? 3 : pass.mag < -1 ? 2 : 1;
        return `<span class="bars" title="About magnitude ${pass.mag.toFixed(1)}">${'<i class="on"></i>'.repeat(bars)}${'<i></i>'.repeat(4 - bars)}</span>`;
    }

    function renderTable() {
        const rows = $('pass-rows');
        const shown = passes.filter(p => !visibleOnly || p.visible);
        $('filter-visible').classList.toggle('active', visibleOnly);
        $('filter-all').classList.toggle('active', !visibleOnly);

        if (!Observer.get()) {
            rows.innerHTML = '<tr><td colspan="7" class="pass-empty">🔭 No location yet - tell us where you are and the passes land here.</td></tr>';
            return;
        }
        if (!shown.length) {
            rows.innerHTML = `<tr><td colspan="7" class="pass-empty">${visibleOnly
                ? `No visible passes in the next ${DAYS} days. Switch to All passes to see daytime and shadow passes.`
                : `No passes in the next ${DAYS} days from this location.`}</td></tr>`;
            return;
        }
        rows.innerHTML = '';
        shown.forEach(pass => {
            const row = document.createElement('tr');
            row.dataset.start = pass.start;
            row.tabIndex = 0;
            if (!pass.visible) row.classList.add('not-visible');
            row.innerHTML = `
                <td>${day(pass.start)}</td>
                <td>${time(pass.start)}</td>
                <td>${time(pass.maxTime)}</td>
                <td>${time(pass.end)}</td>
                <td>${compass(pass.startAz)} → ${compass(pass.endAz)}</td>
                <td>${Math.round(pass.maxEl)}°</td>
                <td>${pass.visible ? brightness(pass) : '<span class="pass-dim">Not visible</span>'}</td>`;
            row.addEventListener('click', () => selectPass(pass));
            row.addEventListener('keydown', e => { if (e.key === 'Enter') selectPass(pass); });
            rows.appendChild(row);
        });
    }

    $('filter-visible').addEventListener('click', () => { visibleOnly = true; renderTable(); selectPass(selected); });
    $('filter-all').addEventListener('click', () => { visibleOnly = false; renderTable(); selectPass(selected); });

    // --- COMPUTE ---
    function compute() {
        const observer = Observer.get();
        showLocation(observer);
        if (!observer || !Orbit.has('iss')) { renderTable(); return; }
        computedAt = Date.now();
        passes = Orbit.findPasses(observer, new Date(), DAYS);
        renderTable();
        selectPass(passes.find(p => p.visible) || null);
    }
    Observer.onChange(compute);

    function countdown(ms) {
        const total = Math.max(0, Math.round(ms / 1000));
        const d = Math.floor(total / 86400);
        const h = Math.floor(total % 86400 / 3600);
        const m = Math.floor(total % 3600 / 60);
        const s = total % 60;
        const clock = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return d ? `${d}d ${clock}` : clock;
    }

    function tick(date) {
        const observer = Observer.get();
        const banner = $('overhead-banner');
        if (!observer) { banner.hidden = true; return; }

        const now = date.getTime();
        if (now - computedAt > 30 * 60000) compute();

        // Next visible pass card
        const next = passes.find(p => p.visible && p.end > now);
        if (next) {
            $('next-pass-time').textContent = now >= next.start ? 'Happening now' : countdown(next.start - now);
            $('next-pass-detail').textContent =
                `${day(next.start)} at ${time(next.start)} · ${compass(next.startAz)} → ${compass(next.endAz)} · up to ${Math.round(next.maxEl)}° high · ${Math.round((next.end - next.start) / 60000)} min`;
        } else {
            $('next-pass-time').textContent = '-';
            $('next-pass-detail').textContent = `No visible passes in the next ${DAYS} days from ${observer.name}.`;
        }

        // Above-you banner and live dot on the sky view
        const look = Orbit.lookAngles(date, observer);
        const overhead = !!look && look.el > 10;
        banner.hidden = !overhead;
        if (overhead) {
            const canSee = Orbit.isSunlit(date) && Orbit.sunElevation(date, observer) < -6;
            banner.textContent = `ISS is above ${observer.name} now: look ${compass(look.az)}, ${Math.round(look.el)}° above the horizon`
                + (canSee ? '. It should be visible to the naked eye.' : ' (not visible: daylight or in Earth\'s shadow).');
        }
        if (look && look.el > 0) drawSky(selected, look);
        else if ($('sky-view').querySelector('.sky-live')) drawSky(selected, null);
    }

    showLocation(Observer.get());
    renderTable();
    selectPass(null);

    return { tick, compute };
})();
