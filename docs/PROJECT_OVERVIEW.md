# WATAM AI — Project Overview

## What is This?

WATAM AI is a production-ready, socially intelligent AI agent designed to:
1. Join and engage on Moltbook (an API-first social network for AI agents)
2. Promote WeAreTheArtMakers (WATAM) in a non-spammy, value-first way
3. Support the modX token community with strict non-financial-advice guardrails
4. Build genuine connections through empathy and high-signal content

## Architecture

```
watamai/
├── .kiro/                      # Kiro custom agent configuration
│   ├── agents/                 # Agent definitions
│   ├── prompts/                # System prompts
│   └── skills/                 # Progressive disclosure skills
│       ├── moltbook/           # Moltbook API integration
│       ├── watam-brand/        # WATAM messaging guidelines
│       └── modx-community/     # modX support guardrails
├── openclaw/                   # OpenClaw integration files
│   ├── SOUL.md                 # Agent personality (Turkish)
│   ├── AGENTS.md               # Role definitions
│   └── USER.md                 # User context
├── src/                        # TypeScript source code
│   ├── moltbook/               # Moltbook client & skill parsing
│   ├── persona/                # Empathy & style modules
│   ├── content/                # Post/comment templates
│   ├── utils/                  # Rate limiter, logger, confirmation
│   ├── config.ts               # Configuration management
│   ├── types.ts                # TypeScript types & Zod schemas
│   ├── cli.ts                  # CLI interface
│   └── index.ts                # Public API exports
├── tests/                      # Vitest unit tests
├── docs/                       # Documentation
│   ├── references.md           # Official links (source of truth)
│   ├── OPENCLAW_SETUP.md       # OpenClaw integration guide
│   └── PROJECT_OVERVIEW.md     # This file
└── scripts/                    # Setup & test scripts
```

## Key Components

### 1. Moltbook Integration (`src/moltbook/`)

- **skillDoc.ts**: Fetches and parses `https://moltbook.com/skill.md` for API endpoints
- **client.ts**: HTTP client with retries, rate limiting, and Zod validation

### 2. Persona System (`src/persona/`)

- **empathy.ts**: Emotion detection, mirroring, de-escalation
- **style.ts**: Tone rules, reply modes (short/medium/long), formatting

### 3. Content Engine (`src/content/`)

- **templates.ts**: Post/comment templates, WATAM CTAs, modX educational content
- Ensures 80/20 rule (80% helpful, 20% promotional)
- Always includes "This is not financial advice" for modX

### 4. Safety Systems (`src/utils/`)

- **rateLimiter.ts**: Enforces post/comment intervals with jitter
- **confirmation.ts**: Interactive confirmation for public actions
- **logger.ts**: Structured logging with Pino

### 5. CLI Interface (`src/cli.ts`)

Commands:
- `fetch-skill` — Get Moltbook API documentation
- `fetch-feed` — Read posts from Moltbook
- `draft-post` — Create post draft (dry run)
- `publish-post` — Publish post (requires confirmation)
- `draft-comment` — Create comment draft
- `publish-comment` — Publish comment (requires confirmation)
- `stats` — Show rate limiter statistics

### 6. Kiro Custom Agent (`.kiro/`)

- **agents/modx-moltbook-agent.json**: Agent configuration
- **prompts/modx-moltbook-agent.md**: System prompt (empathy, safety, behavior)
- **skills/**: Progressive disclosure documentation for specific domains

### 7. OpenClaw Integration (`openclaw/`)

- **SOUL.md**: Agent personality in Turkish (for OpenClaw multi-agent system)
- **AGENTS.md**: Role definitions (Community Engager, Content Creator, modX Educator, Moderator)
- **USER.md**: User context and preferences

## Safety Model

### Non-Negotiable Rules

1. **No financial advice**: Always include "This is not financial advice" for modX
2. **No spam**: 80/20 rule, rate limits, max 1 CTA per post
3. **Confirmation required**: All public actions need explicit human approval
4. **Rate limiting**: 
   - Posts: 1 per 10-20 minutes (with jitter)
   - Comments: 1 per 1-2 minutes (with jitter)
   - Max 3 posts/hour, 20 comments/hour

### Default Behavior

- **Dry-run mode**: Enabled by default (`DRY_RUN_MODE=true`)
- **Confirmation**: Always asks before posting/commenting
- **Graceful degradation**: Falls back to stub data if skill.md unavailable

## Workflow

### Typical Usage Flow

1. **Setup**: Install dependencies, configure `.env` with auth token
2. **Fetch skill.md**: Get latest Moltbook API documentation
3. **Read feed**: Understand community conversations
4. **Draft content**: Create posts/comments locally
5. **Review**: Human reviews draft
6. **Confirm**: Human explicitly approves
7. **Publish**: Action executes with rate limiting

### OpenClaw Integration Flow

1. **Install OpenClaw**: `npm install -g openclaw@latest`
2. **Onboard**: `openclaw onboard --install-daemon`
3. **Create agent**: `openclaw agents add watam-moltbook`
4. **Copy SOUL.md**: To agent workspace
5. **Test**: `openclaw agent --message "..."`
6. **Deploy**: Run agent with Moltbook integration

## Technology Stack

- **Runtime**: Node.js ≥ 22.0.0
- **Language**: TypeScript (strict mode)
- **HTTP Client**: undici (fast, modern)
- **Validation**: Zod (runtime type safety)
- **Testing**: Vitest (fast, modern)
- **Logging**: Pino (structured, fast)
- **CLI**: Commander (robust argument parsing)

## Design Principles

### 1. Safety First
- Dry-run by default
- Confirmation for public actions
- Rate limiting with jitter
- No financial advice

### 2. Empathy-Driven
- Detect emotions
- Mirror responses
- Provide actionable help
- De-escalate conflicts

### 3. Community Over Promotion
- 80% helpful content
- 20% promotional (max)
- Contextual CTAs only
- No spam, no hype

### 4. Transparency
- Clear about capabilities
- Honest about limitations
- Cite sources
- Admit when unsure

### 5. Modularity
- Separate concerns (client, persona, content)
- Testable components
- Configurable behavior
- Extensible architecture

## Configuration

### Environment Variables (`.env`)

```bash
# Moltbook
MOLTBOOK_BASE_URL=https://www.moltbook.com
MOLTBOOK_AUTH_TOKEN=your_token_here
MOLTBOOK_AGENT_NAME=watam-agent

# Rate Limiting
POST_INTERVAL_MIN=10
POST_INTERVAL_MAX=20
COMMENT_INTERVAL_MIN=1
COMMENT_INTERVAL_MAX=2
MAX_POSTS_PER_HOUR=3
MAX_COMMENTS_PER_HOUR=20

# Safety
DRY_RUN_MODE=true
REQUIRE_CONFIRMATION=true

# Logging
LOG_LEVEL=info

# Brand URLs
WATAM_URL=https://wearetheartmakers.com
MODX_URL=https://modfxmarket.com/index.html
```

## Testing

### Unit Tests (`tests/`)

- **rateLimiter.test.ts**: Rate limiting logic
- **templates.test.ts**: Content generation
- **empathy.test.ts**: Emotion detection

Run tests:
```bash
npm test                # Run once
npm run test:watch      # Watch mode
npm test -- --coverage  # With coverage
```

### Integration Testing

```bash
# Test skill.md fetch
npm run cli fetch-skill

# Test feed reading
npm run cli fetch-feed

# Test draft creation
npm run cli draft-post --submolt art --topic "Test"

# Test stats
npm run cli stats
```

## Deployment

### Local Development

```bash
npm install
npm run build
npm run cli -- <command>
```

### Production (with OpenClaw)

```bash
# Install OpenClaw
npm install -g openclaw@latest

# Onboard
openclaw onboard --install-daemon

# Create agent
openclaw agents add watam-moltbook

# Copy configuration
cd ~/.openclaw/workspace-watam-moltbook
cp /path/to/watamai/openclaw/SOUL.md .

# Run
openclaw agent --message "..."
```

### Automated (Cron/Systemd)

See `docs/OPENCLAW_SETUP.md` for cron job and systemd service examples.

## Roadmap

### Phase 1: Core Functionality ✅
- Moltbook integration
- Empathy system
- Content templates
- Rate limiting
- CLI interface

### Phase 2: Enhanced Intelligence (In Progress)
- Better emotion detection
- Context-aware responses
- Learning from feedback
- Advanced content generation

### Phase 3: Multi-Platform (Future)
- Discord integration
- Twitter/X integration
- Telegram support
- Web dashboard

### Phase 4: Analytics & Optimization (Future)
- Engagement metrics
- A/B testing for content
- Community sentiment analysis
- Performance optimization

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

Key areas for contribution:
- Improved emotion detection
- Better skill.md parsing
- Enhanced content templates
- More comprehensive tests
- Additional language support

## Resources

### Official Links
- **Moltbook**: https://www.moltbook.com/
- **OpenClaw**: https://github.com/openclaw/openclaw
- **WATAM**: https://wearetheartmakers.com/
- **modX**: https://modfxmarket.com/index.html

### Documentation
- **README**: [README.md](../README.md)
- **Turkish README**: [README.tr.md](../README.tr.md)
- **OpenClaw Setup**: [OPENCLAW_SETUP.md](OPENCLAW_SETUP.md)
- **References**: [references.md](references.md)

### Community
- **GitHub**: https://github.com/WeAreTheArtMakers/watamai
- **WATAM Community**: https://wearetheartmakers.com/

## License

MIT License - see [LICENSE](../LICENSE) for details.

---

**Built with ❤️ by WeAreTheArtMakers**
