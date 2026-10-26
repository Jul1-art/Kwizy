# Kwizy

Kwizy is a modern, web-based interactive classroom and quiz platform designed for teachers and students. It offers real-time quiz monitoring, anti-cheating mechanisms, AI-assisted quiz generation and analysis, as well as an intuitive student experience.

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
- **Responsive & Modern UI**: Built with a sleek dark/light theme using modern CSS and Tailwind styling.

---

## 📁 Project Structure

```text
Kwizy/
├── public/                 # Static web root (front-facing)
│   ├── index.html          # Main portal
│   ├── eleves/             # Student interface (classroom & quiz runner)
│   ├── professeurs/        # Teacher portal, dashboard & live monitoring
│   └── assets/             # CSS stylesheets and icons
├── api/                    # PHP REST API backend
│   ├── router.php          # Central API router
│   └── v1/                 # API endpoints (auth, quiz, session, monitoring, AI)
├── models/                 # PHP Data models (User, Quiz, Session, Result)
├── config/                 # Application configuration (DB, environment, logger)
├── logs/                   # System and event logs
└── LICENSE                 # Apache 2.0 License
```

---

## 🛠️ Getting Started

### Prerequisites

- **PHP 8.0+** with `pdo_mysql` and `curl` extensions enabled
- **MySQL / MariaDB** database
- **Web server**: Apache (with `mod_rewrite` enabled) or Nginx

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/Kwizy.git
   cd Kwizy
   ```

2. **Database Configuration**:
   - Create a MySQL database and import the initial schema.
   - Configure your database credentials in `config/db.php`:
     ```php
     $host = getenv('DB_HOST') ?: 'localhost';
     $dbname = getenv('DB_NAME') ?: 'kwizy_db';
     $username = getenv('DB_USER') ?: 'root';
     $password = getenv('DB_PASS') ?: '';
     ```

3. **AI Integration**:
   - Configure your Mistral API key using environment variables or in `api/v1/ai.php`.

4. **Web Server Setup**:
   - Set the document root or alias pointing to the project root or `/public`.
   - Ensure the `.htaccess` rewrite rules are enabled for routing requests through `api/router.php`.

---

## 🔒 Security Best Practices

- **Never commit production credentials**: Always keep your real database passwords and AI API keys outside version control (use environment variables or an ignored local configuration file).
- Keep the `logs/` directory protected and excluded from public access.

---

## 📄 License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.
