// --- STARFIELD ---
const starfield = document.getElementById('starfield');
for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2 + 0.5;
    s.style.cssText = `
        width:${size}px; height:${size}px;
        top:${Math.random()*100}%; left:${Math.random()*100}%;
        --dur:${2 + Math.random()*4}s;
        animation-delay:${Math.random()*5}s;
    `;
    starfield.appendChild(s);
}

// --- LIVE LOOP ---
// One tick a second drives the map, the telemetry tiles and the pass countdown
function tick() {
    const now = new Date();
    const state = Orbit.stateAt(now);
    if (!state) return;
    IssMap.update(state, now);
    Telemetry.update(state, now);
    Passes.tick(now);
}

function showDataNote() {
    document.getElementById('data-note').textContent = Orbit.isStale()
        ? 'Orbit data could not be refreshed; positions may drift.'
        : '';
}

async function start() {
    try {
        await Orbit.load('iss');
    } catch (e) {
        console.warn('Orbit data fetch failed, retrying...', e);
        document.getElementById('data-note').textContent = 'Orbit data unavailable, retrying...';
        setTimeout(start, 30000);
        return;
    }
    showDataNote();
    Passes.compute();
    tick();
    setInterval(tick, 1000);
    // Orbital elements go out of date, so pick up a fresh set through the day
    setInterval(() => Orbit.load('iss').then(showDataNote).catch(() => {}), 3600 * 1000);
}

start();
