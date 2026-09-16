# git-repo-template

GitHub repo template setup for all git-repos

## Octane + shadcn / Tailwind setup

This repo includes an Octane app that mixes Octane and React components. For the shadcn + Tailwind flow to work reliably, keep the project on Tailwind v4 and use the Vite integration (`@tailwindcss/vite`) plus the PostCSS plugin (`@tailwindcss/postcss`). The stylesheet entry should use `@import "tailwindcss"`, and per-file JSX pragmas should remain explicit so Octane files and React files do not share the same global JSX runtime.

For Vite 8 projects, use `@vitejs/plugin-react-oxc` instead of the older Babel-based React plugin. React TSX files need the TypeScript compiler setting `"jsx": "react-jsx"`, while Octane’s `.tsrx` files keep file-level pragma directives such as `/** @jsxImportSource octane */` and `/** @jsxImportSource react */` so each runtime can opt into its own JSX transform explicitly.

## Included CI Checks

The default GitHub Actions workflow in `.github/workflows/ci.yml` runs:

- YAML validation for `.yml` and `.yaml` files (via PyYAML)
- Basic secret-pattern scanning across YAML/JSON sources while excluding common generated/vendor paths

## What are Agent Skills?

Agent Skills are a lightweight, open format for extending AI agent capabilities with specialized knowledge and workflows.

At its core, a skill is a folder containing a `SKILL.md` file. This file includes metadata (`name` and `description`, at minimum) and instructions that tell an agent how to perform a specific task. Skills can also bundle scripts, reference materials, templates, and other resources.

```text
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

## Why Agent Skills?

Agents are increasingly capable, but often don't have the context they need to do real work reliably. Skills solve this by packaging procedural knowledge and company-, team-, and user-specific context into portable, version-controlled folders that agents load on demand. This gives agents:

* **Domain expertise**: Capture specialized knowledge — from legal review processes to data analysis pipelines to presentation formatting — as reusable instructions and resources.
* **Repeatable workflows**: Turn multi-step tasks into consistent, auditable procedures.
* **Cross-product reuse**: Build a skill once and use it across any skills-compatible agent.

## How do Agent Skills work?

Agents load skills through **progressive disclosure**, in three stages:

1. **Discovery**: At startup, agents load only the name and description of each available skill, just enough to know when it might be relevant.

2. **Activation**: When a task matches a skill's description, the agent reads the full `SKILL.md` instructions into context.

3. **Execution**: The agent follows the instructions, optionally executing bundled code or loading referenced files as needed.

Full instructions load only when a task calls for them, so agents can keep many skills on hand with only a small context footprint.

## Modifying Template Repo

The standard approach for template repos is a GitHub Actions setup workflow that triggers on the first push to the default branch, skips if running in the template repo itself, performs the substitutions, commits the result, then deletes itself.

The flow:

1. New repo created from template → GitHub creates an initial commit
2. The bundled [setup.yml](.github/workflows/setup.yml) workflow fires on that push
3. It detects it's not the template repo (via github.repository check)
   1. Trigger: `push` to `main` — GitHub fires this automatically when the new repo receives its first commit after being created from the template.
   2. Guard (`if: github.repository != 'jasonkolodziej/git-repo-template'`): prevents the workflow from running inside the template repo itself on every push.
4. Replaces the `# git-repo-template` header (and any other placeholders) with the actual repo name
5. Commits back and self-deletes so it never runs again.
   1. **Self-deletion:** after committing the substitutions, the workflow git rms itself and pushes — so it never runs again in the child repo. The child repo's CI (ci.yml) takes over from that point.
   2. **Extending it:** add more `sed` / `find` lines in the Replace template placeholders step for any other tokens you want to swap out (e.g., owner name, year, license holder).
