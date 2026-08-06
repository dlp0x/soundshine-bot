# Contributing to soundSHINE Discord Bot v3

Thank you for contributing to soundSHINE Discord Bot v3.

This document explains the workflow and expectations when contributing to the project.

---

## 🌿 Git Workflow

The project uses a simple branch-based workflow.

```
main (protected)
   ↑
dev
   ↑
feature/*
fix/*
refactor/*
docs/*
chore/*
```

---

## Branches

### `main`

Production branch.

Rules:

* Direct commits are not allowed
* Changes are merged only from `dev`
* Must contain stable code

---

### `dev`

Development integration branch.

Rules:

* All new work starts from this branch
* Pull Requests should target this branch
* May contain features still being validated

---

## Creating a Branch

Always create your branch from the latest `dev` branch:

```bash
git checkout dev
git pull

git checkout -b feature/my-feature
```

---

## Branch Naming

Use descriptive prefixes:

| Prefix      | Purpose           | Example                     |
| ----------- | ----------------- | --------------------------- |
| `feature/`  | New functionality | `feature/add-radio-status`  |
| `fix/`      | Bug correction    | `fix/command-timeout`       |
| `refactor/` | Code improvement  | `refactor/clean-services`   |
| `docs/`     | Documentation     | `docs/update-contributing`  |
| `chore/`    | Maintenance       | `chore/update-dependencies` |

---

## Commit Messages

Use clear and meaningful commit messages.

Recommended format:

```
type: short description
```

Examples:

```
feat: add playlist update command
fix: handle missing environment variable
refactor: simplify discord service loading
docs: update installation guide
chore: update dependencies
```

---

## Pull Requests

Before opening a Pull Request:

* Make sure your branch is up to date with `dev`
* Keep changes focused on one objective
* Test your changes locally
* Update documentation if required

Pull Requests should:

* Explain what changed
* Reference the related issue
* Describe testing performed

---

## Code Guidelines

When contributing:

* Follow the existing project structure
* Avoid unnecessary complexity
* Prefer small, focused changes
* Do not mix unrelated refactoring with features
* Keep business logic separated from integrations

---

## Review Process

Pull Requests are reviewed before merging.

A PR may require:

* Code adjustments
* Additional tests
* Documentation updates

The goal is to keep the codebase clean and maintainable over time.

---
## AI-Assisted Contributions

AI tools may be used to assist development.

Contributors remain responsible for:
- Understanding the changes being submitted
- Validating generated code
- Running tests before creating a Pull Request
- Ensuring the change follows project architecture

AI-generated code should be reviewed like any other contribution.

## Questions and Discussions

For larger changes or architectural decisions, open an issue before implementation.

This allows discussion before investing time into a solution.
