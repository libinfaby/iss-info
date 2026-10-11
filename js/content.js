// --- CREW MANIFEST ---
const CREW_API = 'https://corquaid.github.io/international-space-station-APIs/JSON/people-in-space.json';
const CREW_TONES = ['yellow', 'green', 'blue', 'pink'];

// Crew photos are full-size Wikimedia originals (several megabytes each), so ask for a
// 500px thumbnail and only fall back to the original, then to initials, if that fails
function crewPhotoUrl(url) {
    const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(\w\/\w\w\/([^/]+\.(?:jpe?g|png)))$/i);
    return m ? `${m[1]}/thumb/${m[2]}/500px-${m[3]}` : url;
}

function crewPhotoFailed(img) {
    if (img.dataset.retried || img.src === img.dataset.full) { img.remove(); return; }
    img.dataset.retried = '1';
    img.src = img.dataset.full;
}

async function getISSOnboard() {
    const container = document.getElementById('onboard-people');
    const note = document.getElementById('crew-note');
    try {
        const res = await fetch(CREW_API);
        const data = await res.json();

        const issCrew = data.people.filter(p => p.iss === true);
        document.getElementById('onboard-number').textContent = data.people.length;
        note.textContent = `${issCrew.length} aboard the ISS · ${data.people.length - issCrew.length} aboard Tiangong`;
        container.innerHTML = '';

        data.people.forEach((person, i) => {
            const card = document.createElement('div');
            card.className = `crew-card ${CREW_TONES[i % 4]}`;

            const isISS = person.iss === true;
            const flagUrl = person.flag_code
                ? `https://flagcdn.com/w20/${person.flag_code}.png`
                : null;
            const initials = (person.name || '').split(' ').map(w => w[0]).slice(0, 2).join('');

            card.innerHTML = `
                <div class="crew-photo">
                    ${initials}
                    ${person.image ? `<img src="${crewPhotoUrl(person.image)}" data-full="${person.image}" alt="" onerror="crewPhotoFailed(this)">` : ''}
                    <span class="crew-tag ${isISS ? 'pink' : 'blue'}">${isISS ? 'ISS' : 'Tiangong'}</span>
                </div>
                <div class="crew-name">
                    ${flagUrl ? `<img src="${flagUrl}" alt="${person.country}" title="${person.country}"
                        onerror="this.style.display='none'">` : ''}${person.name}
                </div>
                <div class="crew-craft">${person.spacecraft || 'ISS'} · ${person.agency || ''}</div>
                <div class="crew-bio">${person.position || ''}</div>
                <a class="crew-link" href="${person.url || '#'}" target="_blank" rel="noreferrer">Wikipedia →</a>
            `;
            container.appendChild(card);
        });
    } catch(e) {
        note.textContent = 'Crew data temporarily unavailable.';
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
// Schematic only: positions are simplified and not to scale. box is [x, y, width, height].
const MODULES = [
    { name: 'Zarya', box: [250, 130, 80, 40], tag: 'Russia · 1998',
      desc: 'The very first piece. It supplied early power, storage and propulsion, and is now mostly used as a big cupboard.',
      facts: [['Launched', '20 Nov 1998'], ['Carried by', 'Proton rocket'], ['Length', '12.6 m']],
      more: 'Its name means "sunrise" in Russian, marking the dawn of the project. It was built in Moscow but paid for by the United States, and it flew alone for two weeks before Unity arrived to join it.' },
    { name: 'Unity', box: [205, 135, 45, 30], tag: 'USA · 1998',
      desc: 'A connecting node with six docking ports, linking the American and Russian sides of the station.',
      facts: [['Launched', '4 Dec 1998'], ['Carried by', 'Shuttle Endeavour'], ['Length', '5.5 m']],
      more: 'Astronauts joined Unity to Zarya by hand during three spacewalks, the first assembly job of the station. Small as it is, it holds more than 50,000 mechanical parts and over 200 pipes carrying air, water and coolant.' },
    { name: 'Zvezda', box: [330, 130, 90, 40], tag: 'Russia · 2000',
      desc: 'The early heart of the station: living quarters, life support and the engines used to boost the orbit.',
      facts: [['Launched', '12 Jul 2000'], ['Carried by', 'Proton rocket'], ['Length', '13.1 m']],
      more: 'Its name means "star". The design comes from the core of the Mir space station, and its arrival made it possible for the first crew to move in a few months later. It has two sleeping cabins, a galley and a toilet.' },
    { name: 'Destiny', box: [120, 132, 85, 36], tag: 'USA · 2001',
      desc: 'NASA\'s main science laboratory, packed with experiment racks for research in microgravity.',
      facts: [['Launched', '7 Feb 2001'], ['Carried by', 'Shuttle Atlantis'], ['Length', '8.5 m']],
      more: 'It has a 51 cm window of optical-quality glass in the floor, used for photographing Earth. The station\'s main truss, which carries the solar arrays, is bolted to its roof.' },
    { name: 'Harmony', box: [40, 135, 80, 30], tag: 'USA · 2007',
      desc: 'A hub that joins the European and Japanese labs and holds crew sleeping quarters.',
      facts: [['Launched', '23 Oct 2007'], ['Carried by', 'Shuttle Discovery'], ['Length', '7.2 m']],
      more: 'Built in Italy and named by American schoolchildren in a competition. Four crew members sleep here in cabins the size of a phone booth, and visiting crew and cargo spacecraft dock at its front and top ports.' },
    { name: 'Columbus', box: [50, 70, 60, 65], tag: 'Europe · 2008',
      desc: 'ESA\'s laboratory for physics, materials science and life-science experiments.',
      facts: [['Launched', '7 Feb 2008'], ['Carried by', 'Shuttle Atlantis'], ['Length', '6.9 m']],
      more: 'Europe\'s largest single contribution to the station. It holds ten racks of experiments and is run from a control centre near Munich in Germany, with more experiments mounted outside in open space.' },
    { name: 'Kibo', box: [45, 165, 70, 85], tag: 'Japan · 2008',
      desc: 'The largest single module, with its own robotic arm and an exposed porch for experiments outside.',
      facts: [['Launched', '31 May 2008'], ['Carried by', 'Shuttle Discovery'], ['Length', '11.2 m']],
      more: 'Its name means "hope". It was too big for one flight and went up in three. A small airlock lets the crew pass experiments outside without a spacewalk, and it is also used to release tiny satellites into orbit.' },
    { name: 'Tranquility', label: 'Tranq.', box: [207, 165, 41, 60], tag: 'USA · 2010',
      desc: 'Home to the exercise equipment, the toilet and much of the life-support hardware.',
      facts: [['Launched', '8 Feb 2010'], ['Carried by', 'Shuttle Endeavour'], ['Length', '6.7 m']],
      more: 'Named after the Sea of Tranquility, where Apollo 11 landed on the Moon. Its machines recycle the crew\'s breath, sweat and urine back into clean air and drinking water. Crew members exercise here for about two hours a day.' },
    { name: 'Cupola', labelBelow: true, box: [212, 225, 31, 28], tag: 'Europe · 2010',
      desc: 'A seven-window observation dome - the best seat in the house for watching Earth roll by.',
      facts: [['Launched', '8 Feb 2010'], ['Carried by', 'Shuttle Endeavour'], ['Width', '3 m']],
      more: 'Its round centre window is 80 cm across, the largest ever flown in space when it launched. The crew use it to steer the robotic arm when catching cargo ships, and shutters close over the glass to protect it from tiny meteoroids.' },
    { name: 'Nauka', box: [345, 170, 60, 60], tag: 'Russia · 2021',
      desc: 'A multipurpose lab that added research space, a European robotic arm and more living room.',
      facts: [['Launched', '21 Jul 2021'], ['Carried by', 'Proton rocket'], ['Length', '13 m']],
      more: 'Its name means "science". It reached orbit about 14 years later than first planned. A few hours after docking, its thrusters fired by mistake and slowly spun the whole station around one and a half times before control was regained.' }
];

(function buildModuleExplorer() {
    const svg = document.getElementById('module-svg');
    const buttons = document.getElementById('module-buttons');
    const info = document.getElementById('module-info');
    const ns = 'http://www.w3.org/2000/svg';

    svg.innerHTML = `
        <rect class="truss" x="146" y="8" width="8" height="284" rx="3"/>
        <rect class="array" x="96" y="8" width="44" height="34" rx="4"/>
        <rect class="array" x="160" y="8" width="44" height="34" rx="4"/>
        <rect class="array" x="96" y="258" width="44" height="34" rx="4"/>
        <rect class="array" x="160" y="258" width="44" height="34" rx="4"/>
        <text class="note" x="214" y="30">Truss + solar arrays</text>
        <text class="note" x="8" y="18">← Forward</text>
        <text class="note" x="420" y="18">Aft →</text>`;

    const groups = [];
    const chips = [];

    function select(index) {
        const module = MODULES[index];
        groups.forEach((g, i) => g.classList.toggle('selected', i === index));
        chips.forEach((c, i) => c.classList.toggle('selected', i === index));
        info.innerHTML = `
            <div class="eyebrow">${module.tag}</div>
            <div class="module-name">${module.name}</div>
            <p>${module.desc}</p>
            <div class="module-facts">
                ${module.facts.map(([label, value]) => `<div><span class="eyebrow">${label}</span><b>${value}</b></div>`).join('')}
            </div>
            <div class="eyebrow">Good to know</div>
            <p>${module.more}</p>`;
    }

    MODULES.forEach((module, i) => {
        const [x, y, w, h] = module.box;
        const group = document.createElementNS(ns, 'g');
        group.setAttribute('class', 'module');
        group.setAttribute('tabindex', '0');
        group.setAttribute('role', 'button');
        group.setAttribute('aria-label', module.name);

        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', x); rect.setAttribute('y', y);
        rect.setAttribute('width', w); rect.setAttribute('height', h);
        rect.setAttribute('rx', module.name === 'Cupola' ? 14 : 6);
        group.appendChild(rect);

        const text = document.createElementNS(ns, 'text');
        text.setAttribute('x', x + w / 2);
        text.setAttribute('y', module.labelBelow ? y + h + 15 : y + h / 2 + 4);
        if (!module.labelBelow) text.setAttribute('class', 'inside');
        if (w < 65) text.setAttribute('font-size', 10);
        text.textContent = module.label || module.name;
        group.appendChild(text);

        group.addEventListener('click', () => select(i));
        group.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
        });
        svg.appendChild(group);
        groups.push(group);

        const chip = document.createElement('button');
        chip.textContent = module.name;
        chip.addEventListener('click', () => select(i));
        buttons.appendChild(chip);
        chips.push(chip);
    });

    select(MODULES.findIndex(m => m.name === 'Cupola'));
})();

// --- DEORBIT COUNTDOWN ---
// NASA plans to bring the station down in early 2031; the exact date is not set
const DEORBIT_TARGET = Date.UTC(2031, 0, 1);

function updateDeorbitCountdown() {
    const left = Math.max(0, DEORBIT_TARGET - Date.now());
    const days = left / 86400000;
    const years = Math.floor(days / 365.25);
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('deorbit-years').textContent = years;
    document.getElementById('deorbit-days').textContent = Math.floor(days - years * 365.25);
    document.getElementById('deorbit-hours').textContent = pad(Math.floor(left / 3600000) % 24);
    document.getElementById('deorbit-minutes').textContent = pad(Math.floor(left / 60000) % 60);
}
updateDeorbitCountdown();
setInterval(updateDeorbitCountdown, 30000);

// --- FAQ ---
const FAQ = [
    { q: 'Can I see the ISS without a telescope?', a: 'Yes. It is one of the brightest objects in the night sky - a steady white light gliding across the sky in a few minutes. It doesn\'t blink and makes no sound.' },
    { q: 'Why can\'t I see it every night?', a: 'It has to pass over you while your sky is dark and the station is still lit by the Sun. That happens shortly after sunset or before sunrise. Daylight and shadow passes are listed under All passes but can\'t be seen.' },
    { q: 'How often does it go around Earth?', a: 'About once every 93 minutes, which is 15 to 16 times a day. The crew see a sunrise and sunset on almost every orbit.' },
    { q: 'Why does the track look like a wave?', a: 'The orbit is a circle tilted 51.6° to the equator. On a flat map it becomes a wave, and because Earth turns underneath, each orbit crosses the ground a little further west.' },
    { q: 'How accurate are the positions?', a: 'Positions are calculated in your browser from published orbital elements refreshed several times a day - normally within a few kilometres, and pass times within seconds. Accuracy dips briefly after the station fires its engines.' }
];

(function buildFaq() {
    const list = document.getElementById('faq');
    const items = FAQ.map((entry, i) => {
        const item = document.createElement('div');
        item.className = 'faq-item';
        const button = document.createElement('button');
        const question = document.createElement('span');
        const icon = document.createElement('i');
        const answer = document.createElement('p');
        question.textContent = entry.q;
        answer.textContent = entry.a;
        button.append(question, icon);
        item.append(button, answer);
        button.addEventListener('click', () => open(item.classList.contains('open') ? -1 : i));
        list.appendChild(item);
        return { item, button, icon };
    });

    // Only one answer is open at a time
    function open(index) {
        items.forEach(({ item, button, icon }, i) => {
            item.classList.toggle('open', i === index);
            button.setAttribute('aria-expanded', i === index);
            icon.textContent = i === index ? '-' : '+';
        });
    }
    open(0);
})();

// --- SHARE ---
const shareButton = document.getElementById('share-btn');
shareButton.addEventListener('click', async () => {
    const page = { title: document.title, text: 'Track the International Space Station live', url: location.href };
    try {
        if (navigator.share) {
            await navigator.share(page);
        } else {
            await navigator.clipboard.writeText(page.url);
            shareButton.textContent = '✓ Link copied!';
            setTimeout(() => { shareButton.textContent = 'Share this page ↗'; }, 1500);
        }
    } catch (e) { /* share sheet closed */ }
});
