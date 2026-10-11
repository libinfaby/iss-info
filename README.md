# 🛰️ ISS Info

**Real-time tracking of the International Space Station - live position, telemetry, and crew manifest.**

🔗 **[Live Site → iss-info.libinfaby.dev](https://iss-info.libinfaby.dev/)**

---

## Overview

ISS Tracker is a live web dashboard that monitors the International Space Station in real time. It displays the current orbital position and ground track on an interactive map, updates telemetry every second, predicts when the station will pass over you, and shows the full crew manifest of ISS and TIANGONG with biographical details.

## Features

- 🗺️ **Live orbital map** - ISS position updated every second, with the previous and next orbit drawn as a ground track coloured by sunlight and shadow, the area that can currently see the station, the Sun's position, a day/night overlay, a dark or satellite base map, follow mode, fullscreen, and a ±90 minute time slider
- 📡 **Real-time telemetry** - latitude, longitude, altitude, velocity, sunlight status with a countdown to the next orbital sunrise or sunset, orbits and sunrises today, distance travelled, and distance from you, in km or miles
- 🔭 **Pass predictions** - visible passes for your location over the next 10 days, a countdown to the next one, a sky view of each pass, and a banner when the ISS is above you
- 🎥 **Live video** - NASA's live stream from the station, loaded on request
- 🧩 **Station explorer** - clickable module diagram, size and speed comparisons, a timeline, and a countdown to the planned 2031 deorbit
- 🌍 **Location detection** - reverse geocoding to show which country or ocean the ISS is currently passing over
- 👨‍🚀 **Crew manifest** - full list of astronauts currently aboard, including spacecraft, agency, role, and Wikipedia links
- 🌐 **All-stations view** - shows all humans currently in space, with Tiangong crew clearly distinguished from ISS crew

## Tech Stack

| Category | Technology |
|---|---|
| Map | [Leaflet.js](https://leafletjs.com/) + [Jawg Dark tiles](https://www.jawg.io/) |
| Day/Night overlay | [Leaflet.Terminator](https://joergdietrich.github.io/Leaflet.Terminator/) |
| Orbit calculation | [satellite.js](https://github.com/shashwatak/satellite-js) (SGP4), run in the browser |
| Orbital elements (TLE) | [CelesTrak](https://celestrak.org/), with [WhereTheISS.at](https://wheretheiss.at/) as fallback |
| Satellite imagery | [Esri World Imagery](https://www.esri.com/) |
| Geocoding | [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/) |
| Crew data | [corquaid ISS API](https://corquaid.github.io/international-space-station-APIs/) |
| Astronaut bios | [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page) |
| Country flags | [flagcdn.com](https://flagcdn.com/) |
| Fonts | [Space Mono + Bricolage Grotesque](https://fonts.google.com/) via Google Fonts |

## Running Locally

No build tools or dependencies required. Clone the repo and open `index.html` directly in your browser:

```bash
git clone https://github.com/libinfaby/iss-info.git
cd iss-info
open index.html
```

## API Notes

- ISS position, ground track and pass times are calculated in the browser from the station's orbital elements; no position API is polled
- Orbital elements are fetched from CelesTrak and cached in the browser for **6 hours**
- Your location is used only in your browser for pass predictions and is saved in local storage; a place search sends only the text you type to Nominatim
- The live video ID is set in `js/content.js` (`LIVE_VIDEO_ID`) and needs updating when NASA restarts its stream
- Reverse geocoding is throttled to once every **30 seconds** to stay within Nominatim's usage policy
- Crew data is fetched once on page load from the corquaid GitHub Pages API

## Credits

- [Leaflet.js](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/about)
- [Jawg Maps](https://www.jawg.io/)
- [Leaflet.Terminator](https://joergdietrich.github.io/Leaflet.Terminator/)
- [CelesTrak](https://celestrak.org/)
- [satellite.js](https://github.com/shashwatak/satellite-js)
- [WhereTheISS.at](https://wheretheiss.at/)
- [Esri](https://www.esri.com/)
- [corquaid ISS API](https://corquaid.github.io/international-space-station-APIs/)
- [Nominatim](https://nominatim.openstreetmap.org/)
- [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page)

---

© 2022 [Libin Faby](https://github.com/libinfaby)
