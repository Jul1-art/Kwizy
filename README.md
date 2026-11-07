# Kwizy

Kwizy is a **100% open source**, **100% free** interactive classroom and quiz platform designed for teachers and students. It offers real-time quiz monitoring, anti-cheating mechanisms, AI-assisted quiz generation and analysis, as well as an intuitive student experience — with **no server required** and **no database**: everything runs locally in the browser.

---

## 🚀 Features

- **Teacher Dashboard**: Create, organize, edit, and duplicate quizzes with folders and custom tags.
- **Student Exam Mode**: Simple PIN/QR-code classroom access, full-screen examination mode, and blur/focus detection for anti-cheating.
- **Live Monitoring**: Real-time tracking of participating students, progress, and submissions.
- **AI Integration (Mistral AI)**:
  - Automatic quiz and question generation from topics or prompts.
  - Comprehensive pedagogical insights and classroom performance analysis.
  - Student-specific error breakdowns and personalized revision suggestions.
  - Interactive pedagogical chat assistant for quiz reports.
- **Local-first & Offline-ready**: Accounts, quizzes and results are stored in the browser (localStorage) — no account leaks, no external server, works even offline thanks to the Service Worker.
- **Responsive & Modern UI**: Built with a sleek dark/light theme using modern CSS and Tailwind styling.
- **Windows Desktop App**: Downloadable portable/installer .exe built with Electron ([download the beta](https://github.com/Jul1-art/Kwizy/releases/download/v1.0.0-beta/Kwizy.exe)).

---

## 🌐 Try it now — No installation

Kwizy is hosted on GitHub Pages and works directly in any modern browser:

> **https://jul1-art.github.io/Kwizy/**

Nothing to configure: teachers create a local account, students join with a quiz access code. The optional AI features use your own Mistral API key, stored **only in your browser**.

---

## 🖥️ Desktop App for Windows (beta)

A native Windows wrapper of the web app (Electron) is available on the [Releases page](https://github.com/Jul1-art/Kwizy/releases) and as a direct download from the [homepage](https://jul1-art.github.io/Kwizy/):

- **`Kwizy.exe`** — one-click installer: installs Kwizy as a real Windows app (Start Menu shortcut + built-in uninstaller, cleanly removed from Windows Settings).

> ℹ️ The desktop app is currently distributed as a **beta** build. Bugs and feedback can be reported in [Issues](https://github.com/Jul1-art/Kwizy/issues).

---

## 📁 Project Structure

```text
Kwizy/
├── public/                 # Static web root (front-facing)
│   ├── index.html          # Main portal
│   ├── eleves/             # Student interface (classroom & quiz runner)
│   ├── professeurs/        # Teacher portal, dashboard & live monitoring
│   ├── quiz/               # Quiz runner & anti-cheating engine
│   ├── landing/            # Project story page
│   ├── AI/                 # Client-side Mistral AI engine (KwizyEngine.js)
│   └── assets/             # CSS, icons, Service Worker & KwizyLocalDB
├── desktop/                # Windows desktop app (Electron wrapper)
├── LICENSE                 # Apache 2.0 License
└── README.md
```

In local-first mode, `public/assets/kwizy-local-db.js` (`KwizyLocalDB`) replaces the former PHP/MySQL backend: it intercepts all API calls and serves them from localStorage.

---

## 🛠️ Development

No build step and no server-side stack is required — Kwizy is a pure static front-end. To hack on it locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Jul1-art/Kwizy.git
   cd Kwizy
   ```

2. **Serve the `public/` folder with any static server**:
   ```bash
   npx serve public
   # or: python -m http.server 8080 -d public
   ```

3. Open `http://localhost:3000` (or the port your server reports).

### Desktop app (Electron)

```bash
cd desktop
npm install
npm start          # run the app in dev mode
npm run dist       # build portable .exe + NSIS installer (Windows)
```

---

## 🔒 Security & Privacy

- **No account data leaves the device**: teacher accounts, quizzes and results live in browser localStorage. Clearing browser data removes them, so export/back up important quizzes.
- **Never commit API keys**: the Mistral AI key is entered per-user and stored locally in the browser; it is never sent to Kwizy's repository or infrastructure.
- **Anti-cheating is enforced client-side** (fullscreen enforcement, tab/focus tracking, keyboard lockdown) and surfaced live to the teacher dashboard.

---

## 🤝 Contributing & Open Source Community

Kwizy is an **open source** initiative under the Apache 2.0 license. Everyone is wholeheartedly welcome and encouraged to:
- **Fork** this repository and build their own custom extensions or adaptations.
- **Modify, tweak, and experiment** with features (UI, anti-cheating, AI models, custom question formats).
- **Submit Pull Requests (PRs)** to suggest improvements, new features, or bug fixes.
- **Open Issues** to report problems or share feature requests and pedagogical ideas.
- **Use it freely** in schools, educational institutions, or private training environments.

### Quick Workflow to Contribute

1. **Fork** the repository to your own GitHub account.
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/my-awesome-improvement
   ```
3. **Commit your changes**:
   ```bash
   git commit -m "feat: add support for new question type"
   ```
4. **Push to your fork**:
   ```bash
   git push origin feature/my-awesome-improvement
   ```
5. **Open a Pull Request** against the main branch.

---

## 👥 Contributors & Core Team

- **Jules Ferrier** ([@Jul1-art](https://github.com/Jul1-art)) - Co-creator & Developer
- **Elior Pons** ([@Elpo55](https://github.com/Elpo55)) - Co-creator & Contributor

We also welcome and deeply appreciate all contributions from the open-source community!

---

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE). You are free to use, modify, distribute, and sublicense this software according to the terms of the Apache 2.0 License.
