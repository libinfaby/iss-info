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

// --- MAP ---
const map = L.map('map', { zoomControl: true });
const tileUrl = 'https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=SzrSvA5Rb0Pewv0YPkhpOftwqAJZTFJApRlriSuJRXroUWg0uD3nhJxtNvc1ahWF';
const attribution = '<a href="https://www.jawg.io" target="_blank">&copy; Jawg</a> &mdash; <a href="https://www.openstreetmap.org" target="_blank">&copy; OpenStreetMap</a>';
L.tileLayer(tileUrl, { attribution, minZoom: 2, maxZoom: 22 }).addTo(map);

const terminator = L.terminator({ fillOpacity: 0.25 });
terminator.addTo(map);
setInterval(() => terminator.setTime(), 10000);

const issIcon = L.divIcon({
    html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4" fill="#00d4ff" opacity="0.9"/>
        <circle cx="12" cy="12" r="8" stroke="#00d4ff" stroke-width="1" opacity="0.4"/>
        <line x1="0" y1="12" x2="24" y2="12" stroke="#00d4ff" stroke-width="1.5" opacity="0.7"/>
        <line x1="12" y1="0" x2="12" y2="24" stroke="#00d4ff" stroke-width="1.5" opacity="0.7"/>
    </svg>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: ''
});
const marker = L.marker([0, 0], { icon: issIcon }).addTo(map);

let firstTime = true;

function flashValue(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('updating');
        setTimeout(() => el.classList.remove('updating'), 300);
    }
}

// --- ISS LOCATION ---
async function getISSData() {
    try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const data = await res.json();

        // Guard against bad API responses
        if (data.latitude == null || data.longitude == null) {
            console.warn('ISS API bad response:', data);
            return;
        }

        const { latitude, longitude, altitude, velocity, visibility } = data;

        marker.setLatLng([latitude, longitude]);
        if (firstTime) {
            map.setView([latitude, longitude], 3);
            firstTime = false;
        }

        ['latitude','longitude','altitude','velocity','visibility'].forEach(flashValue);
        document.getElementById('latitude').textContent = latitude.toFixed(4) + '°';
        document.getElementById('longitude').textContent = longitude.toFixed(4) + '°';
        document.getElementById('altitude').textContent = altitude.toFixed(2);
        document.getElementById('velocity').textContent = velocity.toFixed(0);
        document.getElementById('visibility').textContent = visibility;

        getCountryData(latitude, longitude);
    } catch(e) {
        console.warn('ISS location fetch failed, retrying...', e);
    }
}

getISSData();
setInterval(getISSData, 1000);

document.getElementById('center-map').addEventListener('click', () => {
    firstTime = true;
    getISSData();
});

// --- REVERSE GEOCODING ---
// Throttled — only call every 5 seconds, not every 1s (saves API quota)
let lastGeocode = 0;
function getCountryData(lat, lon) {
    const now = Date.now();
    if (now - lastGeocode < 5000) return;
    lastGeocode = now;

    const api_key = 'd1016dcd31d240f1bd9bbd31009e8b14';
    const url = `https://api.opencagedata.com/geocode/v1/json?key=${api_key}&q=${encodeURIComponent(lat+','+lon)}&pretty=1&no_annotations=1`;
    fetch(url)
        .then(r => r.json())
        .then(data => {
            let loc = 'Over Ocean';
            if (data.results?.[0]?.components?.country) loc = data.results[0].components.country;
            flashValue('above');
            document.getElementById('above').textContent = loc;
        })
        .catch(e => console.warn('Geocode error:', e));
}

// --- CREW MANIFEST ---
const CREW_API = 'https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json';

async function getISSOnboard() {
    const container = document.getElementById('onboard-people');
    try {
        const res = await fetch(CREW_API);
        const data = await res.json();

        const issCrew = data.people.filter(p => p.iss === true);
        document.getElementById('onboard-number').textContent =
            `${issCrew.length} aboard ISS · ${data.people.length} total in space`;
        container.innerHTML = '';

        data.people.forEach((person, i) => {
            const card = document.createElement('div');
            card.className = 'crew-card';

            const isISS = person.iss === true;
            const flagUrl = person.flag_code
                ? `https://flagcdn.com/w20/${person.flag_code}.png`
                : null;

            card.innerHTML = `
                <div class="crew-index">CREW — ${String(i+1).padStart(2,'0')}</div>
                <div class="crew-name">
                    ${flagUrl ? `<img src="${flagUrl}" alt="${person.country}" title="${person.country}"
                        style="height:12px; border-radius:2px; margin-right:8px; vertical-align:middle; opacity:0.9;"
                        onerror="this.style.display='none'">` : ''}
                    ${person.name}
                </div>
                <div class="crew-craft">
                    ${person.spacecraft || 'ISS'} · ${person.agency || ''}
                    ${isISS ? '' : '<span style="margin-left:8px;font-size:0.55rem;color:#ff9944;border:1px solid #ff994466;padding:1px 6px;border-radius:10px;">Tiangong</span>'}
                </div>
                <div class="crew-bio">${person.position || ''}</div>
                <a class="crew-link" href="${person.url || '#'}" target="_blank" rel="noreferrer">Wikipedia →</a>
            `;
            container.appendChild(card);
        });
    } catch(e) {
        container.innerHTML = `<div class="loading-state">Crew data temporarily unavailable.</div>`;
        console.error('Crew fetch error:', e);
    }
}

getISSOnboard();