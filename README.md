# Kamlesh Shrestha — 3D Portfolio

Interactive Three.js portfolio: fly through seven stations (Home, About, Experience, Projects, Skills, Education, Contact).

## Run
ES modules need a local server (double-clicking index.html won't work):

    cd personal-website && python3 -m http.server 8000   # then open http://localhost:8000

Three.js is vendored in `vendor/`, so no install/build step. Deploy the folder as-is to Netlify, Vercel, GitHub Pages, etc.

## Files
- `index.html` / `style.css` — UI overlay (panels, drawer, HUD)
- `main.js` — the 3D world, camera flight, interaction, audio
- `data.js` — CV content for the detail drawers + skills (edit text here)

## Controls
Scroll / swipe / ← → / 1-7 to fly · click planets, towers, project objects · drag the skill sphere · click the portrait and photo · catch the ◆ shards · Esc closes drawers
