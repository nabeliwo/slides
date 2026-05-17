# slides

Presentation slides by nabeliwo.

Built with [Slidev](https://github.com/slidevjs/slidev).

https://nabeliwo.github.io/slides/

## Setup

```bash
pnpm install
```

## Development

Start a specific talk's dev server:

```bash
cd talks/<talk-name>
pnpm run dev
```

Or start all talks in parallel:

```bash
pnpm run dev
```

## Build

Build all talks for GitHub Pages:

```bash
pnpm run build
```

The output is generated in `dist/` with each talk at `dist/talks/<talk-name>/`.

## Adding a new talk

1. Create a directory under `talks/` (e.g. `talks/20260601_event-name_talk-title/`)
2. Add `package.json`, `slides.md`, and `README.md`
3. Run `pnpm install` from the root
4. Push to `main` to auto-deploy
