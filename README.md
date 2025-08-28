# Work Time Tracker

Work Time Tracker is a minimal web application for tracking work hours with daily timestamps and progress visualization. The project is implemented with plain HTML, CSS, and JavaScript, and uses Bootstrap 5 for the user interface. All logic runs client-side, with no backend.

[![Pages deployment](https://github.com/passerim/work-time-tracker/actions/workflows/pages.yml/badge.svg)](https://github.com/passerim/work-time-tracker/actions/workflows/pages.yml)
[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## Features
- Add, view, and reset daily work timestamps (in/out)
- Visual progress bar for tracked work time
- Responsive and accessible UI using Bootstrap 5
- Data persistence via browser localStorage (no server required)
- Automated build with linting and minification (JS/CSS)
- Bilingual support (English/Italian)
- No backend, only static files

## Architecture
- The app is a single-page application (SPA) with all logic in `script.js`.
- User interactions (form submit, reset, reload) are handled via event listeners in `script.js`.
- Timestamps and state are stored in `localStorage` for persistence across reloads.
- The progress bar and table are dynamically updated based on user input.
- No server communication or API integration.

## Project Structure

```
work-time-tracker/
├── src/                 # Source files
│   ├── index.html       # Main HTML file
│   ├── style.css        # Custom styles
│   ├── script.js        # Application logic
│   ├── favicon.svg      # App icon
│   └── 404.html         # 404 error page
├── dist/                # Build output (minified files for deploy)
├── .github/
│   └── workflows/
│       └── pages.yml    # CI/CD for GitHub Pages
├── package.json         # Build/lint/minify scripts
├── eslint.config.mjs    # ESLint flat configuration
├── .prettierrc          # Prettier formatting rules
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

The automated build copies and minifies files from `src/` to `dist/` and publishes only the optimized files to GitHub Pages.

## Usage

### Development (No Build Required)
1. Clone or download the repository.
2. Open `src/index.html` directly in a modern browser.
3. The app runs entirely client-side with no dependencies.

### Production Build
1. Clone or download the repository.
2. Run `npm install` to install lint/minification tools.
3. Edit files in `src/`.
4. Run `npm run build` to generate the `dist/` folder with optimized files.
5. Deploy the contents of `dist/` to your web server or GitHub Pages.

👉 [Try the app on GitHub Pages](https://passerim.github.io/work-time-tracker/)

## Supported Browsers
All modern browsers (Chrome, Firefox, Edge, Safari) with JavaScript enabled.

## License
This project is licensed under the GPL-3.0-or-later License - see the [LICENSE](LICENSE) file for details.
