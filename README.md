# Xbox Controller Advanced Test

A TypeScript + React + Tailwind CSS web application for advanced Xbox controller validation in the browser.

## Features

- Real-time button matrix for all standard Xbox controls
- Analog value visualization for buttons and triggers
- Stick axis tracking with dead-zone tuning and drift detection
- Per-session test coverage checklist (which buttons were successfully pressed)
- Weak/strong motor vibration checks and an advanced vibration routine
- Multi-controller detection and active-controller selection

## Requirements

- Modern Chromium-based browser (or another browser with Gamepad API + haptics support)
- Wired or Bluetooth Xbox controller

## Getting started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, connect your controller, and press buttons to begin testing.

## Scripts

- `npm run dev` - start development server
- `npm run lint` - run ESLint
- `npm run build` - type-check and produce a production build
