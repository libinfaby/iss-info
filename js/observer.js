// --- OBSERVER ---
// The visitor's own location, used for pass predictions. It is kept in this browser only.
const Observer = (() => {
    const STORE_KEY = 'observer';
    const listeners = [];
    let current = null;
    try { current = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* storage blocked */ }

    function set(observer) {
        current = observer;
        try { localStorage.setItem(STORE_KEY, JSON.stringify(observer)); } catch (e) { /* storage blocked */ }
        listeners.forEach(cb => cb(current));
    }

    function locate() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('Location is not available in this browser.'));
            navigator.geolocation.getCurrentPosition(
                pos => {
                    set({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'My location' });
                    resolve(current);
                },
                () => reject(new Error('Location permission was not given. Search for a place instead.')),
                { timeout: 10000 }
            );
        });
    }

    async function search(query) {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const results = await (await fetch(url, { headers: { 'Accept-Language': 'en' } })).json();
        if (!results.length) throw new Error(`No place found for "${query}".`);
        const place = results[0];
        set({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), name: place.display_name.split(',').slice(0, 2).join(',') });
        return current;
    }

    return {
        get: () => current,
        onChange: cb => listeners.push(cb),
        locate, search
    };
})();
