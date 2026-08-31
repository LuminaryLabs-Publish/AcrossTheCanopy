# Across the Canopy

An infinite procedural archipelago forest built with Three.js.

## Features

- 2,300 visible instanced trees across 25 recycled terrain chunks
- Procedural islands, water, rocks, atmospheric fog, and lighting
- Continuous world recycling around the camera
- Adjustable 60°–120° field of view
- Mouse-look and keyboard flight controls

## Controls

- `WASD` or arrow keys — move
- Drag — look around
- `Shift` — accelerate
- `Q` / `E` — descend / ascend

## Local development

```bash
cd source
npm install
npm run dev
```

## Production build

```bash
cd source
npm run build
```

The repository root contains the production-ready static site for GitHub Pages. The editable Vite project lives in `source/`.
