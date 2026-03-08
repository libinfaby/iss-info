# 🛰️ ISS Info

**Real-time tracking of the International Space Station - live position, telemetry, and crew manifest.**

🔗 **[Live Site → libinfaby.github.io/iss-info](https://libinfaby.github.io/iss-info/)**

---

## Overview

ISS Tracker is a live web dashboard that monitors the International Space Station in real time. It displays the current orbital position on an interactive map, streams telemetry data every second, and shows the full crew manifest of ISS and TIANGONG with biographical details.

## Features

- 🗺️ **Live orbital map** - ISS position updated every second on a dark interactive map with day/night terminator overlay
- 📡 **Real-time telemetry** - latitude, longitude, altitude, velocity, and visibility status
- 🌍 **Location detection** - reverse geocoding to show which country or ocean the ISS is currently passing over
- 👨‍🚀 **Crew manifest** - full list of astronauts currently aboard, including spacecraft, agency, role, and Wikipedia links
- 🌐 **All-stations view** - shows all humans currently in space, with Tiangong crew clearly distinguished from ISS crew

## Tech Stack

| Category | Technology |
|---|---|
| Map | [Leaflet.js](https://leafletjs.com/) + [Jawg Dark tiles](https://www.jawg.io/) |
| Day/Night overlay | [Leaflet.Terminator](https://joergdietrich.github.io/Leaflet.Terminator/) |
| ISS position | [WhereTheISS.at API](https://wheretheiss.at/) |
| Reverse geocoding | [Nominatim / OpenStreetMap](https://nominatim.openstreetmap.org/) |
| Crew data | [corquaid ISS API](https://corquaid.github.io/international-space-station-APIs/) |
| Astronaut bios | [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page) |
| Country flags | [flagcdn.com](https://flagcdn.com/) |
| Fonts | [Space Mono + Syne](https://fonts.google.com/) via Google Fonts |

## Running Locally

No build tools or dependencies required. Clone the repo and open `index.html` directly in your browser:

```bash
git clone https://github.com/libinfaby/iss-info.git
cd iss-info
open index.html
```

## API Notes

- ISS position is fetched every **1 second** from WhereTheISS.at
- Reverse geocoding is throttled to once every **30 seconds** to stay within Nominatim's usage policy
- Crew data is fetched once on page load from the corquaid GitHub Pages API

## Credits

- [Leaflet.js](https://leafletjs.com/)
- [OpenStreetMap](https://www.openstreetmap.org/about)
- [Jawg Maps](https://www.jawg.io/)
- [Leaflet.Terminator](https://joergdietrich.github.io/Leaflet.Terminator/)
- [WhereTheISS.at](https://wheretheiss.at/)
- [corquaid ISS API](https://corquaid.github.io/international-space-station-APIs/)
- [Nominatim](https://nominatim.openstreetmap.org/)
- [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page)

---

© 2022 [Libin Faby](https://github.com/libinfaby)
