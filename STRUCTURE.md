# Project Structure

Complete file tree of the WATAM AI project.

```
watamai/
│
├── 📁 .github/
│   └── workflows/
│       └── ci.yml                      # GitHub Actions CI/CD pipeline
│
├── 📁 .kiro/                           # Kiro Custom Agent Configuration
│   ├── agents/
│   │   └── modx-moltbook-agent.json    # Agent definition
│   ├── prompts/
│   │   └── modx-moltbook-agent.md      # System prompt (empathy, safety, behavior)
│   └── skills/                         # Progressive disclosure skills
│       ├── moltbook/
│       │   └── SKILL.md                # Moltbook API integration guide
│       ├── watam-brand/
│       │   └── SKILL.md                # WATAM messaging & CTA guidelines
│       └── modx-community/
│           └── SKILL.md                # modX support with guardrails
│
├── 📁 openclaw/                        # OpenClaw Integration Files
│   ├── SOUL.md                         # Agent personality (Turkish)
│   ├── AGENTS.md                       # Role definitions (multi-agent)
│   └── USER.md                         # User context & preferences
│
├── 📁 src/                             # TypeScript Source Code
│   ├── moltbook/
│   │   ├── client.ts                   # HTTP client with retries & validation
│   │   └── skillDoc.ts                 # Fetch & parse skill.md
│   ├── persona/
│   │   ├── empathy.ts                  # Emotion detection & mirroring
│   │   └── style.ts                    # Tone rules & formatting
│   ├── content/
│   │   └── templates.ts                # Post/comment templates & CTAs
│   ├── utils/
│   │   ├── logger.ts                   # Structured logging (Pino)
│   │   ├── confirmation.ts             # Interactive confirmation
│   │   └── rateLimiter.ts              # Rate limiting with jitter
│   ├── cli.ts                          # CLI interface (Commander)
│   ├── config.ts                       # Configuration management
│   ├── types.ts                        # TypeScript types & Zod schemas
│   └── index.ts                        # Public API exports
│
├── 📁 tests/                           # Vitest Unit Tests
│   ├── rateLimiter.test.ts            # Rate limiter tests
│   ├── templates.test.ts              # Content template tests
│   └── empathy.test.ts                # Empathy module tests
│
├── 📁 docs/                            # Documentation
│   ├── references.md                   # Official links (source of truth)
│   ├── OPENCLAW_SETUP.md              # OpenClaw integration guide
│   ├── PROJECT_OVERVIEW.md            # Architecture & design principles
│   └── EXAMPLES.md                    # Usage examples (CLI, programmatic)
│
├── 📁 scripts/                         # Setup & Test Scripts
│   ├── init.sh                        # Interactive setup wizard
│   ├── setup.sh                       # Automated setup
│   └── quick-test.sh                  # Quick verification tests
│
├── 📄 .env.example                     # Environment variables template
├── 📄 .eslintrc.json                   # ESLint configuration
├── 📄 .gitignore                       # Git ignore rules
├── 📄 .prettierrc.json                 # Prettier configuration
├── 📄 tsconfig.json                    # TypeScript configuration
├── 📄 vitest.config.ts                 # Vitest configuration
├── 📄 package.json                     # Dependencies & scripts
│
├── 📄 README.md                        # English documentation (comprehensive)
├── 📄 README.tr.md                     # Turkish documentation (comprehensive)
├── 📄 QUICKSTART.md                    # 5-minute setup guide
├── 📄 CONTRIBUTING.md                  # Contribution guidelines
├── 📄 LICENSE                          # MIT License
├── 📄 PROJECT_SUMMARY.md               # Complete project summary
└── 📄 STRUCTURE.md                     # This file
```

## File Descriptions

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Environment variables template (auth tokens, rate limits, safety flags) |
| `tsconfig.json` | TypeScript compiler configuration (strict mode, ES2022) |
| `vitest.config.ts` | Vitest test runner configuration |
| `.eslintrc.json` | ESLint linting rules |
| `.prettierrc.json` | Prettier code formatting rules |
| `package.json` | Dependencies, scripts, project metadata |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main documentation (English) - setup, usage, features |
| `README.tr.md` | Main documentation (Turkish) - setup, usage, features |
| `QUICKSTART.md` | 5-minute setup guide for new users |
| `CONTRIBUTING.md` | Guidelines for contributing to the project |
| `PROJECT_SUMMARY.md` | Complete project summary and deliverables |
| `STRUCTURE.md` | This file - project structure visualization |
| `LICENSE` | MIT License |

### Source Code Files

| File | Purpose |
|------|---------|
| `src/cli.ts` | CLI interface with Commander (fetch-feed, draft-post, publish-post, etc.) |
| `src/config.ts` | Configuration management (loads .env, exports config object) |
| `src/types.ts` | TypeScript types and Zod schemas for validation |
| `src/index.ts` | Public API exports for programmatic usage |
| `src/moltbook/client.ts` | HTTP client for Moltbook API (retries, rate limiting, validation) |
| `src/moltbook/skillDoc.ts` | Fetches and parses skill.md for API documentation |
| `src/persona/empathy.ts` | Emotion detection, mirroring, de-escalation |
| `src/persona/style.ts` | Tone rules, reply modes, formatting |
| `src/content/templates.ts` | Post/comment templates, WATAM CTAs, modX educational content |
| `src/utils/logger.ts` | Structured logging with Pino |
| `src/utils/confirmation.ts` | Interactive confirmation for public actions |
| `src/utils/rateLimiter.ts` | Rate limiting with random jitter |

### Test Files

| File | Purpose |
|------|---------|
| `tests/rateLimiter.test.ts` | Tests for rate limiting logic |
| `tests/templates.test.ts` | Tests for content generation |
| `tests/empathy.test.ts` | Tests for emotion detection |

### Kiro Agent Files

| File | Purpose |
|------|---------|
| `.kiro/agents/modx-moltbook-agent.json` | Agent configuration (prompt, resources, tools) |
| `.kiro/prompts/modx-moltbook-agent.md` | System prompt (empathy, safety, behavior rules) |
| `.kiro/skills/moltbook/SKILL.md` | Moltbook API integration guide |
| `.kiro/skills/watam-brand/SKILL.md` | WATAM messaging & CTA guidelines |
| `.kiro/skills/modx-community/SKILL.md` | modX support with non-financial-advice guardrails |

### OpenClaw Files

| File | Purpose |
|------|---------|
| `openclaw/SOUL.md` | Agent personality in Turkish (vibe, rules, behavior) |
| `openclaw/AGENTS.md` | Role definitions (Community Engager, Content Creator, etc.) |
| `openclaw/USER.md` | User context and preferences |

### Documentation Files (docs/)

| File | Purpose |
|------|---------|
| `docs/references.md` | Official links (Moltbook, OpenClaw, WATAM, modX) |
| `docs/OPENCLAW_SETUP.md` | Step-by-step OpenClaw integration guide |
| `docs/PROJECT_OVERVIEW.md` | Architecture, design principles, components |
| `docs/EXAMPLES.md` | Usage examples (CLI, programmatic, OpenClaw) |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/init.sh` | Interactive setup wizard (guides through configuration) |
| `scripts/setup.sh` | Automated setup (install, build, test) |
| `scripts/quick-test.sh` | Quick verification tests |

### CI/CD

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | GitHub Actions pipeline (test, lint, build, security audit) |

## Key Directories

### `.kiro/` — Kiro Custom Agent
Complete Kiro agent configuration with system prompt, skills, and resources. Load with:
```bash
kiro agent load .kiro/agents/modx-moltbook-agent.json
```

### `openclaw/` — OpenClaw Integration
Files for OpenClaw multi-agent system. Copy to agent workspace:
```bash
cp openclaw/SOUL.md ~/.openclaw/workspace-watam-moltbook/
```

### `src/` — Source Code
TypeScript source code organized by domain:
- `moltbook/` — API client
- `persona/` — Empathy & style
- `content/` — Templates & CTAs
- `utils/` — Shared utilities

### `tests/` — Unit Tests
Vitest tests for core functionality. Run with:
```bash
npm test
```

### `docs/` — Documentation
Comprehensive documentation for users and developers.

### `scripts/` — Automation
Setup and test scripts for easy onboarding.

## File Count

- **Total files**: 50+
- **TypeScript files**: 12
- **Test files**: 3
- **Documentation files**: 15+
- **Configuration files**: 7
- **Scripts**: 3

## Lines of Code (Approximate)

- **TypeScript**: ~2,500 lines
- **Tests**: ~300 lines
- **Documentation**: ~5,000 lines
- **Configuration**: ~200 lines
- **Total**: ~8,000 lines

## Dependencies

### Production
- `undici` — Fast HTTP client
- `zod` — Runtime validation
- `dotenv` — Environment variables
- `pino` — Structured logging
- `commander` — CLI framework

### Development
- `typescript` — Type safety
- `vitest` — Testing
- `eslint` — Linting
- `prettier` — Formatting
- `tsx` — TypeScript execution

## Getting Started

1. **Clone**: `git clone https://github.com/WeAreTheArtMakers/watamai.git`
2. **Setup**: `./scripts/init.sh` (interactive) or `./scripts/setup.sh` (automated)
3. **Configure**: Add `MOLTBOOK_AUTH_TOKEN` to `.env`
4. **Test**: `npm run cli fetch-feed`
5. **Use**: See `QUICKSTART.md` or `docs/EXAMPLES.md`

---

**Complete, documented, production-ready.** 🎨🤖
