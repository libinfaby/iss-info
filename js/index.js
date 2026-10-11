// --- STARFIELD ---
const starfield = document.getElementById('starfield');
const STAR_HUES = [90, 10, 165, 235];
for (let i = 0; i < 110; i++) {
    const s = document.createElement('span');
    s.className = 'star';
    const size = Math.random() < 0.85 ? 2 : 4;
    s.style.cssText = `
        width:${size}px; height:${size}px;
        top:${Math.random()*100}%; left:${Math.random()*100}%;
        background:${size > 2 ? `oklch(0.86 0.14 ${STAR_HUES[i % 4]})` : 'oklch(0.97 0.015 85)'};
        --dur:${2 + Math.random()*4}s;
        animation-delay:${Math.random()*4}s;
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
