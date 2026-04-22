# Doom Lite — PC Builder Edition

This game is a modified version of [doom-lite](https://github.com/benc-uk/doom-lite) by Ben Coleman.

**Original License:** MIT  
**Modifications:** Added FPS throttling, render scaling, and draw distance control via URL parameters for PC Builder PH integration.

## URL Parameters

| Param   | Type   | Default | Description                          |
|---------|--------|---------|--------------------------------------|
| `fps`   | int    | 0       | Target FPS cap (0 = unlimited/vsync) |
| `scale` | float  | 1.0     | Render resolution scale (0.25–1.0)  |
| `drawdist` | int | 140     | Max draw distance in map units      |
| `label` | string | ""      | Performance label shown in game      |
| `tier`  | int    | 4       | Quality tier 0–4 (label color)      |

## Examples

- Full performance: `index.html` (no params)
- Budget build: `index.html?fps=15&scale=0.35&drawdist=6&label=Choppy&tier=0`
- Mid-range: `index.html?fps=30&scale=0.5&drawdist=12&label=Playable&tier=2`
- High-end: `index.html?fps=60&scale=1.0&drawdist=20&label=Smooth&tier=4`