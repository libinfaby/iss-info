// --- MAP ---
const IssMap = (() => {
    const map = L.map('map', { zoomControl: true });

    const jawgUrl = 'https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=SzrSvA5Rb0Pewv0YPkhpOftwqAJZTFJApRlriSuJRXroUWg0uD3nhJxtNvc1ahWF';
    const jawgAttribution = '<a href="https://www.jawg.io" target="_blank">&copy; Jawg</a> &mdash; <a href="https://www.openstreetmap.org" target="_blank">&copy; OpenStreetMap</a>';
    const darkLayer = L.tileLayer(jawgUrl, { attribution: jawgAttribution, minZoom: 2, maxZoom: 22 }).addTo(map);
    const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Imagery &copy; <a href="https://www.esri.com" target="_blank">Esri</a>', minZoom: 2, maxZoom: 18 }
    );

    const terminator = L.terminator({ fillOpacity: 0.25 });
    terminator.addTo(map);
    setInterval(() => terminator.setTime(), 10000);

    function dotIcon(size, style) {
        return L.divIcon({
            html: `<div style="width:${size}px; height:${size}px; border-radius:50%; ${style}"></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            className: ''
        });
    }
    const issIcon = dotIcon(12, 'background:#00d4ff; box-shadow:0 0 8px #00d4ff, 0 0 16px rgba(0,212,255,0.5);');
    const ghostIcon = dotIcon(14, 'border:2px solid #00d4ff; background:rgba(0,212,255,0.15);');
    const sunIcon = dotIcon(14, 'background:#ffd166; box-shadow:0 0 10px #ffd166, 0 0 24px rgba(255,209,102,0.6);');
    const observerIcon = dotIcon(10, 'border:2px solid #e8f4f8; background:#050d14;');
    const tiangongIcon = dotIcon(10, 'background:#c084fc; box-shadow:0 0 8px #c084fc;');

    const trackLayer = L.layerGroup().addTo(map);
    const footprint = L.polygon([], {
        color: '#00d4ff', weight: 1, opacity: 0.6, fillColor: '#00d4ff', fillOpacity: 0.06, interactive: false
    }).addTo(map);
    const sunMarker = L.marker([0, 0], { icon: sunIcon, interactive: false, keyboard: false }).addTo(map);
    const tiangongLayer = L.layerGroup();
    const tiangongTrack = L.layerGroup().addTo(tiangongLayer);
    const tiangongMarker = L.marker([0, 0], { icon: tiangongIcon }).bindTooltip('Tiangong').addTo(tiangongLayer);
    const marker = L.marker([0, 0], { icon: issIcon, zIndexOffset: 1000 }).bindTooltip('ISS').addTo(map);
    const ghostMarker = L.marker([0, 0], { icon: ghostIcon, interactive: false, keyboard: false });
    let observerMarker = null;

    L.control.layers(
        { 'Dark': darkLayer, 'Satellite': satelliteLayer },
        {
            'Day / night': terminator,
            'Ground track': trackLayer,
            'Visibility area': footprint,
            'Sun': sunMarker,
            'Tiangong': tiangongLayer
        },
        { collapsed: true }
    ).addTo(map);

    // --- GROUND TRACK ---
    const SUNLIT_COLOR = '#ff6b35';
    const SHADOW_COLOR = '#4a7fb5';

    // Split a run of points into lines that never jump across the map's left and right edges
    function splitAtEdges(points) {
        const lines = [[]];
        points.forEach((p, i) => {
            const prev = points[i - 1];
            if (prev && Math.abs(p.lon - prev.lon) > 180) {
                const edge = prev.lon > 0 ? 180 : -180;
                const gap = (p.lon + 2 * edge) - prev.lon;
                const edgeLat = prev.lat + (p.lat - prev.lat) * (edge - prev.lon) / gap;
                lines[lines.length - 1].push([edgeLat, edge]);
                lines.push([[edgeLat, -edge]]);
            }
            lines[lines.length - 1].push([p.lat, p.lon]);
        });
        return lines;
    }

    function drawTrack(layer, points, now, colorFor) {
        layer.clearLayers();
        let run = [];
        const flush = () => {
            if (run.length < 2) return;
            const past = run[0].t <= now;
            L.polyline(splitAtEdges(run), {
                color: colorFor(run[0]),
                weight: 2,
                opacity: past ? 0.45 : 0.9,
                dashArray: past ? '4 6' : null,
                interactive: false
            }).addTo(layer);
        };
        points.forEach(p => {
            const last = run[run.length - 1];
            if (last && (p.sunlit !== last.sunlit || (p.t > now) !== (last.t > now))) {
                run.push(p);
                flush();
                run = [];
            }
            run.push(p);
        });
        flush();
    }

    let lastTrackDraw = 0;
    function updateTracks(now) {
        if (now - lastTrackDraw < 60000) return;
        lastTrackDraw = now;
        const period = Orbit.period();
        drawTrack(trackLayer, Orbit.track('iss', now - period, now + period, 30000), now,
            p => p.sunlit ? SUNLIT_COLOR : SHADOW_COLOR);
        if (Orbit.has('tiangong')) {
            drawTrack(tiangongTrack, Orbit.track('tiangong', now, now + Orbit.period('tiangong'), 30000), now, () => '#c084fc');
        }
    }

    map.on('overlayadd', async e => {
        if (e.layer !== tiangongLayer || Orbit.has('tiangong')) return;
        try {
            await Orbit.load('tiangong');
            lastTrackDraw = 0;
        } catch (err) {
            console.warn('Tiangong orbit data unavailable:', err);
        }
    });

    // --- FOLLOW ---
    const centerButton = document.getElementById('center-map');
    let following = true;
    let hasView = false;
    let lastState = null;

    function setFollowing(on) {
        following = on;
        centerButton.textContent = on ? '⊕ Following ISS' : '⊕ Re-center map to ISS';
        centerButton.classList.toggle('active', on);
    }
    map.on('dragstart', () => setFollowing(false));
    centerButton.addEventListener('click', () => {
        setFollowing(true);
        if (lastState) map.setView([lastState.lat, lastState.lon], map.getZoom());
    });
    setFollowing(true);

    // --- FULLSCREEN ---
    const section = document.getElementById('section-map');
    const fullscreenButton = document.getElementById('fullscreen-map');
    if (!section.requestFullscreen) fullscreenButton.hidden = true;
    fullscreenButton.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else section.requestFullscreen();
    });
    document.addEventListener('fullscreenchange', () => {
        fullscreenButton.textContent = document.fullscreenElement ? '⤡ Exit fullscreen' : '⤢ Fullscreen';
        map.invalidateSize();
    });

    // --- TIME SLIDER ---
    const slider = document.getElementById('time-slider');
    const sliderLabel = document.getElementById('time-slider-label');
    const liveButton = document.getElementById('time-live');

    function updateGhost(now) {
        const offset = Number(slider.value);
        liveButton.classList.toggle('active', offset === 0);
        if (offset === 0) {
            ghostMarker.remove();
            sliderLabel.textContent = 'Drag to see where the ISS was or will be';
            return;
        }
        const when = new Date(now + offset * 60000);
        const st = Orbit.stateAt(when);
        if (!st) return;
        ghostMarker.setLatLng([st.lat, st.lon]).addTo(map);
        const clock = when.toISOString().slice(11, 16);
        sliderLabel.textContent = `${offset > 0 ? '+' : '−'}${Math.abs(offset)} min · ${clock} UTC · ${st.lat.toFixed(1)}°, ${st.lon.toFixed(1)}°`;
    }
    slider.addEventListener('input', () => updateGhost(Date.now()));
    liveButton.addEventListener('click', () => {
        slider.value = 0;
        updateGhost(Date.now());
    });

    // --- OBSERVER ---
    function showObserver(observer) {
        if (!observer) return;
        if (!observerMarker) observerMarker = L.marker([0, 0], { icon: observerIcon }).addTo(map);
        const label = document.createElement('span');
        label.textContent = observer.name;
        observerMarker.setLatLng([observer.lat, observer.lon]).bindTooltip(label);
    }
    Observer.onChange(showObserver);
    showObserver(Observer.get());

    function update(state, date) {
        const now = date.getTime();
        lastState = state;
        marker.setLatLng([state.lat, state.lon]);
        footprint.setLatLngs(Orbit.footprint(state.lat, state.lon, state.alt));

        if (!hasView) {
            map.setView([state.lat, state.lon], 3);
            hasView = true;
        } else if (following) {
            map.panTo([state.lat, state.lon], { animate: false });
        }

        const sun = Orbit.subsolarPoint(date);
        sunMarker.setLatLng([sun.lat, sun.lon]);

        if (Orbit.has('tiangong')) {
            const st = Orbit.stateAt(date, 'tiangong');
            if (st) tiangongMarker.setLatLng([st.lat, st.lon]);
        }

        updateTracks(now);
        updateGhost(now);
    }

    return { update };
})();
