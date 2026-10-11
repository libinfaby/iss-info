// --- ORBIT ENGINE ---
// Positions are computed in the browser from orbital elements (TLE) with satellite.js,
// so the page needs one small download every few hours instead of one request a second.
const Orbit = (() => {
    const R_EARTH = 6371;
    const RAD = Math.PI / 180;
    const TLE_MAX_AGE = 6 * 3600 * 1000;
    const SOURCES = {
        iss: { catnr: 25544, fallback: 'https://api.wheretheiss.at/v1/satellites/25544/tles' },
        tiangong: { catnr: 48274 }
    };

    const satrecs = {};
    let stale = false;

    async function fetchTLE(key) {
        const src = SOURCES[key];
        try {
            const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${src.catnr}&FORMAT=TLE`);
            if (!res.ok) throw new Error('CelesTrak ' + res.status);
            const lines = (await res.text()).split('\n').map(l => l.trim());
            const line1 = lines.find(l => l.startsWith('1 '));
            const line2 = lines.find(l => l.startsWith('2 '));
            if (!line1 || !line2) throw new Error('CelesTrak returned no TLE');
            return [line1, line2];
        } catch (e) {
            if (!src.fallback) throw e;
            const data = await (await fetch(src.fallback)).json();
            if (!data.line1 || !data.line2) throw new Error('Fallback returned no TLE');
            return [data.line1, data.line2];
        }
    }

    async function load(key = 'iss') {
        const storeKey = 'tle-' + key;
        let cached = null;
        try { cached = JSON.parse(localStorage.getItem(storeKey)); } catch (e) { /* storage blocked */ }

        let lines = cached && Date.now() - cached.t < TLE_MAX_AGE ? cached.lines : null;
        if (!lines) {
            try {
                lines = await fetchTLE(key);
                if (key === 'iss') stale = false;
                try { localStorage.setItem(storeKey, JSON.stringify({ t: Date.now(), lines })); } catch (e) { /* storage blocked */ }
            } catch (e) {
                if (!cached) throw e;
                console.warn('TLE fetch failed, using saved copy:', e);
                lines = cached.lines;
                if (key === 'iss') stale = true;
            }
        }
        satrecs[key] = satellite.twoline2satrec(lines[0], lines[1]);
    }

    function stateAt(date, key = 'iss') {
        const pv = satellite.propagate(satrecs[key], date);
        if (!pv.position) return null;
        const gmst = satellite.gstime(date);
        const geo = satellite.eciToGeodetic(pv.position, gmst);
        const v = pv.velocity;
        return {
            lat: satellite.degreesLat(geo.latitude),
            lon: satellite.degreesLong(geo.longitude),
            alt: geo.height,
            speed: Math.hypot(v.x, v.y, v.z) * 3600,
            eci: pv.position,
            gmst
        };
    }

    // Unit vector from Earth to the Sun in the same inertial frame as the satellite
    // (low-precision formula from the Astronomical Almanac, good to about 0.01°)
    function sunVector(date) {
        const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
        const L = (280.460 + 0.9856474 * n) % 360;
        const g = ((357.528 + 0.9856003 * n) % 360) * RAD;
        const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
        const eps = (23.439 - 0.0000004 * n) * RAD;
        return {
            x: Math.cos(lambda),
            y: Math.cos(eps) * Math.sin(lambda),
            z: Math.sin(eps) * Math.sin(lambda)
        };
    }

    function subsolarPoint(date) {
        const s = sunVector(date);
        let lon = (Math.atan2(s.y, s.x) - satellite.gstime(date)) / RAD;
        lon = ((lon + 180) % 360 + 360) % 360 - 180;
        return { lat: Math.asin(s.z) / RAD, lon };
    }

    // The station is in shadow when it is behind Earth and inside Earth's shadow cylinder
    function sunlitEci(r, s) {
        const along = r.x * s.x + r.y * s.y + r.z * s.z;
        if (along > 0) return true;
        const r2 = r.x * r.x + r.y * r.y + r.z * r.z;
        return r2 - along * along > R_EARTH * R_EARTH;
    }

    function isSunlit(date, key = 'iss') {
        const pv = satellite.propagate(satrecs[key], date);
        return pv.position ? sunlitEci(pv.position, sunVector(date)) : true;
    }

    // Where the station is in the sky for an observer {lat, lon}: azimuth and elevation in degrees, range in km
    function lookAngles(date, observer, key = 'iss') {
        const pv = satellite.propagate(satrecs[key], date);
        if (!pv.position) return null;
        const gmst = satellite.gstime(date);
        const look = satellite.ecfToLookAngles(
            { latitude: observer.lat * RAD, longitude: observer.lon * RAD, height: 0 },
            satellite.eciToEcf(pv.position, gmst)
        );
        return { az: look.azimuth / RAD, el: look.elevation / RAD, range: look.rangeSat, eci: pv.position, gmst };
    }

    function observerZenith(observer, gmst) {
        const lat = observer.lat * RAD;
        const theta = gmst + observer.lon * RAD;
        return { x: Math.cos(lat) * Math.cos(theta), y: Math.cos(lat) * Math.sin(theta), z: Math.sin(lat) };
    }

    function sunElevation(date, observer) {
        const z = observerZenith(observer, satellite.gstime(date));
        const s = sunVector(date);
        return Math.asin(z.x * s.x + z.y * s.y + z.z * s.z) / RAD;
    }

    // Rough visual magnitude from distance and how much of the lit side faces the observer
    function magnitude(look, observer, s) {
        const z = observerZenith(observer, look.gmst);
        const toObs = { x: z.x * R_EARTH - look.eci.x, y: z.y * R_EARTH - look.eci.y, z: z.z * R_EARTH - look.eci.z };
        const cosPhase = (toObs.x * s.x + toObs.y * s.y + toObs.z * s.z) / Math.hypot(toObs.x, toObs.y, toObs.z);
        const phase = Math.acos(Math.max(-1, Math.min(1, cosPhase)));
        const lit = Math.sin(phase) + (Math.PI - phase) * Math.cos(phase);
        return -1.8 - 15 + 5 * Math.log10(look.range) - 2.5 * Math.log10(Math.max(lit, 0.01));
    }

    // Narrow down the moment a yes/no condition flips between two times (ms)
    function bisect(a, b, test) {
        const atStart = test(a);
        for (let i = 0; i < 12; i++) {
            const mid = (a + b) / 2;
            if (test(mid) === atStart) a = mid; else b = mid;
        }
        return b;
    }

    function describePass(startMs, endMs, observer) {
        const pass = { start: startMs, end: endMs, maxEl: -90, path: [], mag: null };
        let litAbove10 = false;
        const step = Math.max(2000, (endMs - startMs) / 80);
        for (let t = startMs; t <= endMs; t += step) {
            const date = new Date(t);
            const look = lookAngles(date, observer);
            if (!look) continue;
            const s = sunVector(date);
            const sunlit = sunlitEci(look.eci, s);
            pass.path.push({ az: look.az, el: Math.max(look.el, 0), sunlit });
            if (look.el > pass.maxEl) { pass.maxEl = look.el; pass.maxTime = t; pass.maxAz = look.az; }
            if (sunlit && look.el >= 10) {
                litAbove10 = true;
                const mag = magnitude(look, observer, s);
                if (pass.mag === null || mag < pass.mag) pass.mag = mag;
            }
        }
        if (!pass.path.length) return null;
        pass.startAz = pass.path[0].az;
        pass.endAz = pass.path[pass.path.length - 1].az;
        pass.visible = litAbove10 && sunElevation(new Date(pass.maxTime), observer) < -6;
        return pass;
    }

    // Every pass that climbs at least 10° above the observer's horizon in the coming days
    function findPasses(observer, start, days) {
        const passes = [];
        const step = 20000;
        const endMs = start.getTime() + days * 86400000;
        const up = t => { const look = lookAngles(new Date(t), observer); return !!look && look.el > 0; };

        let t = start.getTime();
        let wasUp = up(t);
        let riseMs = wasUp ? t : null;
        for (t += step; t <= endMs; t += step) {
            const isUp = up(t);
            if (isUp && !wasUp) riseMs = bisect(t - step, t, up);
            if (!isUp && wasUp && riseMs !== null) {
                const pass = describePass(riseMs, bisect(t - step, t, up), observer);
                if (pass && pass.maxEl >= 10) passes.push(pass);
                riseMs = null;
            }
            wasUp = isUp;
        }
        return passes;
    }

    function period(key = 'iss') {
        return 2 * Math.PI / satrecs[key].no * 60000;
    }

    // Start of the current orbit: the last time the station crossed the equator heading north
    function lastAscendingNode(date) {
        const north = t => { const st = stateAt(new Date(t)); return !!st && st.lat >= 0; };
        const step = 30000;
        let t = date.getTime();
        let isNorth = north(t);
        for (let i = 0; i < 240; i++) {
            const before = north(t - step);
            if (isNorth && !before) return bisect(t - step, t, north);
            isNorth = before;
            t -= step;
        }
        return null;
    }

    // Next orbital sunrise or sunset; null when the orbit is in full sunlight for a while
    function nextSunTransition(date) {
        const lit = t => isSunlit(new Date(t));
        const step = 10000;
        const now = date.getTime();
        const state = lit(now);
        for (let t = now + step; t <= now + 100 * 60000; t += step) {
            if (lit(t) !== state) return { time: bisect(t - step, t, lit), sunlit: !state };
        }
        return null;
    }

    function sunrisesBetween(startMs, endMs) {
        let count = 0;
        let prev = isSunlit(new Date(startMs));
        for (let t = startMs + 30000; t <= endMs; t += 30000) {
            const cur = isSunlit(new Date(t));
            if (cur && !prev) count++;
            prev = cur;
        }
        return count;
    }

    function track(key, fromMs, toMs, stepMs) {
        const points = [];
        for (let t = fromMs; t <= toMs; t += stepMs) {
            const date = new Date(t);
            const st = stateAt(date, key);
            if (st) points.push({ t, lat: st.lat, lon: st.lon, sunlit: sunlitEci(st.eci, sunVector(date)) });
        }
        return points;
    }

    // Outline of the area that can see the station above its horizon right now
    function footprint(lat, lon, alt) {
        const d = Math.acos(R_EARTH / (R_EARTH + alt));
        const lat1 = lat * RAD;
        const ring = [];
        for (let bearing = 0; bearing < 360; bearing += 5) {
            const b = bearing * RAD;
            const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
            const dLon = Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
            ring.push([lat2 / RAD, lon + dLon / RAD]);
        }
        return ring;
    }

    return {
        load, stateAt, isSunlit, subsolarPoint, lookAngles, sunElevation, findPasses,
        period, lastAscendingNode, nextSunTransition, sunrisesBetween, track, footprint,
        isStale: () => stale,
        has: key => !!satrecs[key]
    };
})();
