// --- TELEMETRY ---
const Telemetry = (() => {
    const KM_TO_MI = 0.621371;
    const $ = id => document.getElementById(id);

    let useMiles = false;
    try { useMiles = localStorage.getItem('units') === 'mi'; } catch (e) { /* storage blocked */ }

    const distance = km => useMiles ? km * KM_TO_MI : km;
    const distanceUnit = () => useMiles ? 'mi' : 'km';
    const group = n => Math.round(n).toLocaleString('en-US');

    function countdown(ms) {
        const total = Math.max(0, Math.round(ms / 1000));
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    // --- UNITS ---
    const unitsButton = $('units-toggle');
    function showUnits() {
        unitsButton.textContent = `Units: ${distanceUnit()} ⇄`;
        $('altitude-unit').textContent = ' ' + distanceUnit();
        $('velocity-unit').textContent = useMiles ? ' mph' : ' km/h';
    }
    unitsButton.addEventListener('click', () => {
        useMiles = !useMiles;
        try { localStorage.setItem('units', useMiles ? 'mi' : 'km'); } catch (e) { /* storage blocked */ }
        showUnits();
        if (lastState) update(lastState, new Date());
    });
    showUnits();

    // --- COPY POSITION ---
    const copyButton = $('copy-position');
    copyButton.addEventListener('click', async () => {
        if (!lastState) return;
        const text = `ISS position ${new Date().toISOString().slice(0, 19)}Z: ${lastState.lat.toFixed(4)}°, ${lastState.lon.toFixed(4)}°, altitude ${lastState.alt.toFixed(1)} km`;
        try {
            await navigator.clipboard.writeText(text);
            copyButton.textContent = '✓ Copied!';
        } catch (e) {
            copyButton.textContent = 'Copy failed';
        }
        setTimeout(() => { copyButton.textContent = 'Copy position'; }, 1500);
    });

    // --- REVERSE GEOCODING ---
    // Throttled to once every 30 seconds to stay within Nominatim's usage policy
    let lastGeocode = 0;
    let lastKnownLocation = '…';

    // Nominatim has no answer over open water, so name the ocean from a coarse lookup
    function oceanName(lat, lon) {
        const half = lat >= 0 ? 'North' : 'South';
        if (lat < -60) return 'Southern Ocean';
        if (lat > 30 && lat < 46 && lon > -6 && lon < 36) return 'Mediterranean Sea';
        if (lon >= -70 && lon < 20) return `${half} Atlantic Ocean`;
        if (lat > 18 && lon >= -98 && lon < -70) return 'North Atlantic Ocean';
        if (lat > 8 && lon >= -84 && lon < -70) return 'Caribbean Sea';
        if (lon >= 20 && lon < 120 && lat < 30) return 'Indian Ocean';
        if (lat < 0 && lon >= 120 && lon < 147) return 'Indian Ocean';
        return `${half} Pacific Ocean`;
    }

    function getCountryData(lat, lon) {
        const now = Date.now();
        $('above').textContent = lastKnownLocation;
        if (now - lastGeocode < 30000) return;
        lastGeocode = now;

        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&format=json&zoom=3`;

        fetch(url, { headers: { 'Accept-Language': 'en' } })
            .then(r => r.json())
            .then(data => {
                const loc = data.address?.country || oceanName(lat, lon);
                lastKnownLocation = loc;
                $('above').textContent = loc;
            })
            .catch(e => console.warn('Geocode error:', e));
    }

    // --- ORBIT STATS ---
    // These change slowly, so they are recalculated every 20 seconds rather than every tick
    let stats = null;
    let lastStats = 0;

    function refreshStats(date) {
        const now = date.getTime();
        if (stats && now - lastStats < 20000 && !(stats.transition && now > stats.transition.time)) return;
        lastStats = now;
        const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        stats = {
            midnight,
            period: Orbit.period(),
            sunrises: Orbit.sunrisesBetween(midnight, now),
            transition: Orbit.nextSunTransition(date)
        };
    }

    let lastState = null;

    function update(state, date) {
        const now = date.getTime();
        lastState = state;
        refreshStats(date);

        const latText = Math.abs(state.lat).toFixed(2) + '°' + (state.lat >= 0 ? 'N' : 'S');
        const lonText = Math.abs(state.lon).toFixed(2) + '°' + (state.lon >= 0 ? 'E' : 'W');
        $('latitude').textContent = latText;
        $('longitude').textContent = lonText;
        $('altitude').textContent = group(distance(state.alt));
        $('velocity').textContent = group(distance(state.speed));
        $('map-position').textContent = `${latText}, ${lonText} · ${group(distance(state.alt))} ${distanceUnit()} up`;

        const sunlit = Orbit.isSunlit(date);
        $('visibility').textContent = sunlit ? '☀️ Daylight' : '🌙 In shadow';
        $('sun-countdown').textContent = stats.transition
            ? `${stats.transition.sunlit ? 'Sunrise' : 'Sunset'} in ${countdown(stats.transition.time - now)}`
            : 'Full sunlight this orbit';

        const sinceMidnight = now - stats.midnight;
        $('orbits-today').textContent = (sinceMidnight / stats.period).toFixed(1);
        $('sunrises-today').textContent = stats.sunrises;
        $('distance-today').textContent = group(distance(state.speed * sinceMidnight / 3600000));
        $('distance-today-unit').textContent = `${distanceUnit()} since 00:00 UTC`;
        $('utc-clock').textContent = date.toISOString().slice(11, 19);

        const observer = Observer.get();
        const look = observer && Orbit.lookAngles(date, observer);
        $('observer-distance').textContent = look ? `${group(distance(look.range))} ${distanceUnit()}` : '—';
        $('observer-distance-unit').textContent = look ? 'Straight-line distance' : 'Set a location below';

        getCountryData(state.lat, state.lon);
    }

    return { update };
})();
