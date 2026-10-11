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
                    ${isISS ? '<span style="margin-left:8px;font-size:0.55rem;color:#ff44aa;border:1px solid #ff994466;padding:1px 6px;border-radius:10px;">ISS</span>' : '<span style="margin-left:8px;font-size:0.55rem;color:#ff9944;border:1px solid #ff994466;padding:1px 6px;border-radius:10px;">Tiangong</span>'}
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

// --- LIVE VIDEO ---
// Loaded only on click, so YouTube is not contacted until the visitor asks for the stream.
// NASA starts a new stream (with a new ID) from time to time; the current one is listed at
// https://www.youtube.com/@NASA/streams
const LIVE_VIDEO_ID = 'awQzjn72bI0';

document.getElementById('load-video').addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${LIVE_VIDEO_ID}?autoplay=1&mute=1`;
    frame.title = 'NASA live video from the International Space Station';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    document.getElementById('video-frame').replaceChildren(frame);
});

// --- MODULE EXPLORER ---
// Schematic only: positions are simplified and not to scale
const SEGMENTS = {
    us: { label: 'United States', color: '#00d4ff' },
    ru: { label: 'Russia', color: '#ff6b35' },
    esa: { label: 'Europe (ESA)', color: '#ffd166' },
    jaxa: { label: 'Japan (JAXA)', color: '#c084fc' },
    shared: { label: 'Truss and power', color: '#5a7a8a' }
};

const MODULES = [
    { name: 'Integrated Truss', seg: 'shared', year: '2000–2009', box: [398, 34, 14, 352],
      desc: 'The 109 m backbone of the station. It carries the solar arrays, radiators and the rails for the Canadarm2 robotic arm.' },
    { name: 'Solar Arrays', seg: 'shared', year: '2000–2009', box: [318, 40, 74, 22],
      extra: [[418, 40, 74, 22], [318, 68, 74, 22], [418, 68, 74, 22], [318, 330, 74, 22], [418, 330, 74, 22], [318, 358, 74, 22], [418, 358, 74, 22]],
      desc: 'Eight array wings that turn to follow the Sun and supply the station with electrical power, charging batteries for the shadow half of each orbit.' },
    { name: 'Zvezda', seg: 'ru', year: '2000', box: [60, 192, 110, 36], label: true,
      desc: 'Service module. Living quarters and life support for the Russian segment, and the engines used to raise the station\'s orbit.' },
    { name: 'Zarya', seg: 'ru', year: '1998', box: [175, 192, 110, 36], label: true,
      desc: 'The first module launched, on 20 November 1998. It gave early power and propulsion and is now mostly used for storage.' },
    { name: 'Unity', seg: 'us', year: '1998', box: [290, 192, 60, 36], label: true,
      desc: 'Node 1. The first US module, linking the Russian and US segments, with six ports for other modules.' },
    { name: 'Destiny', seg: 'us', year: '2001', box: [355, 192, 100, 36], label: true,
      desc: 'The US laboratory and the main research facility for American experiments. The truss is mounted on top of it.' },
    { name: 'Harmony', seg: 'us', year: '2007', box: [460, 192, 70, 36], label: true,
      desc: 'Node 2. The hub for the European and Japanese labs and the docking point for visiting crew and cargo spacecraft.' },
    { name: 'Columbus', seg: 'esa', year: '2008', box: [475, 136, 40, 54],
      desc: 'The European laboratory, used for research in materials, fluid physics and life sciences.' },
    { name: 'Kibo', seg: 'jaxa', year: '2008', box: [468, 230, 54, 72],
      desc: 'The Japanese laboratory and the largest single module, with its own airlock, robotic arm and an outside platform for experiments exposed to space.' },
    { name: 'Quest', seg: 'us', year: '2001', box: [302, 140, 36, 50],
      desc: 'The airlock used for spacewalks in US spacesuits.' },
    { name: 'Tranquility', seg: 'us', year: '2010', box: [302, 230, 36, 60],
      desc: 'Node 3. Holds life-support equipment, exercise machines and a toilet.' },
    { name: 'Cupola', seg: 'esa', year: '2010', circle: [320, 304, 11],
      desc: 'A seven-window observation dome built in Europe. It is where the crew watch Earth and operate the robotic arm.' },
    { name: 'Leonardo', seg: 'us', year: '2011', box: [342, 250, 46, 24],
      desc: 'Permanent Multipurpose Module, used for storage. It was built in Italy and first flew as a cargo carrier.' },
    { name: 'BEAM', seg: 'us', year: '2016', box: [262, 250, 36, 24],
      desc: 'Bigelow Expandable Activity Module. An inflatable module added as a technology test and kept on as storage.' },
    { name: 'Poisk', seg: 'ru', year: '2009', box: [100, 148, 30, 42],
      desc: 'A docking port for Soyuz and Progress spacecraft and an airlock for Russian spacewalks.' },
    { name: 'Nauka', seg: 'ru', year: '2021', box: [92, 230, 46, 66],
      desc: 'The Russian multipurpose laboratory, with crew quarters and a mounting point for the European Robotic Arm.' },
    { name: 'Prichal', seg: 'ru', year: '2021', circle: [115, 310, 12],
      desc: 'A ball-shaped node attached to Nauka that adds docking ports to the Russian segment.' },
    { name: 'Rassvet', seg: 'ru', year: '2010', box: [215, 230, 30, 48],
      desc: 'A small research module that also serves as a docking port and storage space.' }
];

(function buildModuleExplorer() {
    const svg = document.getElementById('module-svg');
    const info = document.getElementById('module-info');
    const ns = 'http://www.w3.org/2000/svg';

    function show(module, group) {
        svg.querySelectorAll('.module.selected').forEach(el => el.classList.remove('selected'));
        group.classList.add('selected');
        info.innerHTML = `
            <div class="crew-index">${SEGMENTS[module.seg].label} · ${module.year}</div>
            <div class="crew-name">${module.name}</div>
            <div class="crew-bio">${module.desc}</div>`;
    }

    MODULES.forEach(module => {
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('class', 'module');
        group.setAttribute('tabindex', '0');
        group.setAttribute('role', 'button');
        group.setAttribute('aria-label', module.name);
        group.style.setProperty('--seg', SEGMENTS[module.seg].color);

        const boxes = module.box ? [module.box, ...(module.extra || [])] : [];
        boxes.forEach(([x, y, w, h]) => {
            const rect = document.createElementNS(ns, 'rect');
            rect.setAttribute('x', x); rect.setAttribute('y', y);
            rect.setAttribute('width', w); rect.setAttribute('height', h);
            rect.setAttribute('rx', 4);
            group.appendChild(rect);
        });
        if (module.circle) {
            const circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', module.circle[0]); circle.setAttribute('cy', module.circle[1]);
            circle.setAttribute('r', module.circle[2]);
            group.appendChild(circle);
        }
        if (module.label) {
            const [x, y, w, h] = module.box;
            const text = document.createElementNS(ns, 'text');
            text.setAttribute('x', x + w / 2); text.setAttribute('y', y + h / 2 + 4);
            text.textContent = module.name;
            group.appendChild(text);
        }

        group.addEventListener('click', () => show(module, group));
        group.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(module, group); }
        });
        svg.appendChild(group);
    });

    document.getElementById('module-legend').innerHTML = Object.values(SEGMENTS)
        .map(seg => `<span><i style="background:${seg.color}"></i>${seg.label}</span>`).join('');
})();

// --- DEORBIT COUNTDOWN ---
// NASA plans to bring the station down in early 2031; the exact date is not set
const DEORBIT_TARGET = Date.UTC(2031, 0, 1);

function updateDeorbitCountdown() {
    const left = Math.max(0, DEORBIT_TARGET - Date.now());
    const days = Math.floor(left / 86400000);
    document.getElementById('deorbit-years').textContent = Math.floor(days / 365);
    document.getElementById('deorbit-days').textContent = days % 365;
    document.getElementById('deorbit-hours').textContent = Math.floor(left % 86400000 / 3600000);
    document.getElementById('deorbit-minutes').textContent = Math.floor(left % 3600000 / 60000);
}
updateDeorbitCountdown();
setInterval(updateDeorbitCountdown, 30000);

// --- SHARE ---
const shareButton = document.getElementById('share-btn');
shareButton.addEventListener('click', async () => {
    const page = { title: document.title, text: 'Track the International Space Station live', url: location.href };
    try {
        if (navigator.share) {
            await navigator.share(page);
        } else {
            await navigator.clipboard.writeText(page.url);
            shareButton.textContent = 'Link copied';
            setTimeout(() => { shareButton.textContent = 'Share this page'; }, 1500);
        }
    } catch (e) { /* share sheet closed */ }
});
