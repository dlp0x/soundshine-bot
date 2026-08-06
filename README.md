# soundSHINE Discord Bot v3

Discord bot powering the soundSHINE radio community.

This project is a complete rewrite focused on a cleaner architecture, better maintainability, and easier feature development.

## 🚀 Project Goals

The goal of v3 is to provide a reliable Discord integration for soundSHINE Radio, including:

* Discord community features
* Radio-related commands and information
* Playlist and broadcast integrations
* Future automation features

The project is currently under active development.

---

## 🏗️ Branch Strategy

This repository follows a simple Git workflow.

### Protected branches

* `main`

  * Production-ready code only
  * Locked branch
  * Changes must come through Pull Requests

* `dev`

  * Main development branch
  * Integration point for new features and fixes

### Development branches

Create your work branch from `dev`:

```bash
git checkout dev
git pull

git checkout -b feature/my-new-feature
```

Branch naming conventions:

| Type         | Usage                                      | Example                      |
| ------------ | ------------------------------------------ | ---------------------------- |
| `feature/*`  | New functionality                          | `feature/add-radio-command`  |
| `fix/*`      | Bug fixes                                  | `fix/handle-invalid-command` |
| `refactor/*` | Code improvements without behavior changes | `refactor/cleanup-services`  |
| `docs/*`     | Documentation changes                      | `docs/update-readme`         |
| `chore/*`    | Maintenance tasks                          | `chore/update-dependencies`  |

---

## 🔄 Contribution Workflow

1. Create a branch from `dev`

```bash
git checkout dev
git pull
git checkout -b feature/my-change
```

2. Make your changes

3. Commit using clear messages

Example:

```bash
git commit -m "feat: add playlist update handler"
```

4. Push your branch

```bash
git push origin feature/my-change
```

5. Open a Pull Request targeting `dev`

---

## 🛠️ Development Setup

### Requirements

* Node.js (version TBD)
* npm
* Discord application credentials

### Installation

Clone the repository:

```bash
git clone https://github.com/dlp0x/soundshine-discord-bot-v3.git

cd soundshine-discord-bot-v3
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Configure your variables before starting the bot.

---

## ▶️ Running the Bot

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

---

The goal is to keep business logic separated from external services and Discord-specific code.

---

## 🧪 Testing

Tests and validation commands will be documented as the project evolves.

---

## 📝 Code Guidelines

* Keep changes focused on one objective
* Prefer small Pull Requests
* Avoid mixing refactoring with feature changes
* Follow existing project patterns
* Update documentation when behavior changes

---

## 📌 Project Status

soundSHINE Discord Bot v3 is currently in active development.

The architecture is being rebuilt to provide a cleaner foundation for future features.

---

## 📄 License

License information will be added when defined.
