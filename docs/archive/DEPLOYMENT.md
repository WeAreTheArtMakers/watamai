# Deployment Checklist

Complete checklist for deploying WATAM AI to production.

## Pre-Deployment

### 1. Environment Setup

- [ ] Node.js ≥ 22.0.0 installed
- [ ] npm or pnpm installed
- [ ] Git installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Project built successfully (`npm run build`)
- [ ] All tests passing (`npm test`)

### 2. Moltbook Account

- [ ] Moltbook account created at https://www.moltbook.com/
- [ ] Read join instructions at https://moltbook.com/skill.md
- [ ] Claim link obtained
- [ ] Tweet verification completed (human must do this)
- [ ] Auth token received
- [ ] Auth token added to `.env` file

### 3. Configuration

- [ ] `.env` file created from `.env.example`
- [ ] `MOLTBOOK_AUTH_TOKEN` set
- [ ] `MOLTBOOK_AGENT_NAME` set (e.g., "watam-agent")
- [ ] Rate limits configured appropriately
- [ ] `DRY_RUN_MODE` set to `true` for initial testing
- [ ] `REQUIRE_CONFIRMATION` set to `true`
- [ ] `LOG_LEVEL` set appropriately (info for production)

### 4. Testing

- [ ] Unit tests pass: `npm test`
- [ ] Skill.md fetch works: `npm run cli fetch-skill`
- [ ] Feed fetch works: `npm run cli fetch-feed`
- [ ] Draft post works: `npm run cli draft-post --submolt test --topic "Test"`
- [ ] Stats command works: `npm run cli stats`
- [ ] Dry-run mode prevents publishing
- [ ] Confirmation prompt appears when publishing

## Initial Deployment

### 5. First Run (Dry-Run Mode)

- [ ] `DRY_RUN_MODE=true` in `.env`
- [ ] Draft several posts: `npm run cli draft-post ...`
- [ ] Review drafts for quality
- [ ] Check empathy responses
- [ ] Verify WATAM CTAs are contextual
- [ ] Verify modX content includes disclaimers
- [ ] Test rate limiter: `npm run cli stats`

### 6. Controlled Publishing

- [ ] Set `DRY_RUN_MODE=false` in `.env`
- [ ] Keep `REQUIRE_CONFIRMATION=true`
- [ ] Publish 1-2 test posts to low-traffic submolt
- [ ] Monitor community response
- [ ] Check for any errors or issues
- [ ] Verify rate limiting works
- [ ] Verify posts appear correctly on Moltbook

### 7. Monitoring

- [ ] Set up logging (check `LOG_LEVEL` in `.env`)
- [ ] Monitor rate limiter stats regularly
- [ ] Track community engagement (upvotes, comments)
- [ ] Watch for any negative feedback
- [ ] Check for spam complaints
- [ ] Monitor auth token validity

## Production Deployment

### 8. OpenClaw Integration (Optional)

- [ ] OpenClaw installed: `npm install -g openclaw@latest`
- [ ] Onboarding completed: `openclaw onboard --install-daemon`
- [ ] Gateway running: `openclaw gateway status`
- [ ] Agent created: `openclaw agents add watam-moltbook`
- [ ] SOUL.md copied to workspace
- [ ] Agent tested: `openclaw agent --message "..."`

### 9. Kiro Integration (Optional)

- [ ] Kiro installed
- [ ] Agent loaded: `kiro agent load .kiro/agents/modx-moltbook-agent.json`
- [ ] Agent tested: `kiro agent chat "..."`
- [ ] Skills accessible

### 10. Automation (Optional)

#### Cron Job
- [ ] Crontab configured for periodic runs
- [ ] Logs redirected to file
- [ ] Error handling in place
- [ ] Rate limits respected

#### Systemd Service (Linux)
- [ ] Service file created
- [ ] Service enabled: `sudo systemctl enable watamai`
- [ ] Service started: `sudo systemctl start watamai`
- [ ] Service status checked: `sudo systemctl status watamai`
- [ ] Logs monitored: `journalctl -u watamai -f`

## Post-Deployment

### 11. Monitoring & Maintenance

- [ ] Daily log review
- [ ] Weekly engagement metrics review
- [ ] Rate limiter stats checked regularly
- [ ] Community feedback monitored
- [ ] Auth token validity checked
- [ ] Dependencies updated monthly
- [ ] Security audits run: `npm audit`

### 12. Performance Optimization

- [ ] Response times acceptable
- [ ] Rate limits optimized for community
- [ ] Content quality maintained
- [ ] Empathy responses effective
- [ ] WATAM promotion balanced (80/20 rule)
- [ ] modX disclaimers always present

### 13. Community Engagement

- [ ] Positive community feedback
- [ ] No spam complaints
- [ ] Upvotes on posts/comments
- [ ] Meaningful conversations started
- [ ] WATAM interest generated organically
- [ ] modX questions answered safely

## Safety Checklist

### 14. Safety Verification

- [ ] No financial advice given (modX)
- [ ] All modX content includes disclaimer
- [ ] Rate limits enforced (3 posts/hour, 20 comments/hour)
- [ ] Confirmation required for public actions
- [ ] 80/20 rule maintained (80% helpful, 20% promo)
- [ ] Max 1 CTA per post/comment
- [ ] No spam or aggressive promotion
- [ ] Empathy-first responses
- [ ] De-escalation working for conflicts
- [ ] No personal data shared
- [ ] No harassment or toxicity

### 15. Security Verification

- [ ] Auth tokens not in logs
- [ ] `.env` file not committed to git
- [ ] Only official repos used (Moltbook, OpenClaw)
- [ ] No unofficial extensions installed
- [ ] All external links verified
- [ ] No untrusted code executed
- [ ] Dependencies up to date
- [ ] Security audit passed: `npm audit`

## Rollback Plan

### 16. Emergency Procedures

- [ ] Backup of working configuration
- [ ] Rollback procedure documented
- [ ] Emergency stop command ready: `Ctrl+C` or `systemctl stop watamai`
- [ ] Contact information for support
- [ ] Incident response plan in place

### If Issues Occur:

1. **Stop the agent immediately**
   ```bash
   # If running manually
   Ctrl+C
   
   # If running as service
   sudo systemctl stop watamai
   
   # If using OpenClaw
   openclaw gateway stop
   ```

2. **Enable dry-run mode**
   ```bash
   # Edit .env
   DRY_RUN_MODE=true
   ```

3. **Review logs**
   ```bash
   # Check recent logs
   tail -n 100 /var/log/watamai.log
   
   # Or systemd logs
   journalctl -u watamai -n 100
   ```

4. **Identify issue**
   - Rate limit exceeded?
   - Auth token expired?
   - Content quality issue?
   - Community complaint?

5. **Fix and test**
   - Address root cause
   - Test in dry-run mode
   - Verify fix works

6. **Gradual restart**
   - Start with dry-run mode
   - Publish 1-2 test posts
   - Monitor closely
   - Scale up gradually

## Success Metrics

### 17. KPIs to Track

- [ ] Posts per day (target: 3-6)
- [ ] Comments per day (target: 10-20)
- [ ] Average upvotes per post (target: >5)
- [ ] Response rate to comments (target: >50%)
- [ ] WATAM mentions (target: <20% of content)
- [ ] modX questions answered (track count)
- [ ] Spam complaints (target: 0)
- [ ] Community sentiment (positive/neutral/negative)

### 18. Quality Metrics

- [ ] Empathy responses appropriate
- [ ] Content helpful and valuable
- [ ] WATAM promotion contextual
- [ ] modX disclaimers always present
- [ ] Rate limits respected
- [ ] No safety violations
- [ ] No security incidents

## Documentation

### 19. Deployment Documentation

- [ ] Deployment date recorded
- [ ] Configuration documented
- [ ] Customizations noted
- [ ] Issues and resolutions logged
- [ ] Contact information updated
- [ ] Runbook created for operators

### 20. Handoff (if applicable)

- [ ] Operator trained
- [ ] Documentation reviewed
- [ ] Access credentials shared securely
- [ ] Monitoring setup explained
- [ ] Emergency procedures reviewed
- [ ] Support channels established

## Final Checks

### 21. Pre-Launch Verification

- [ ] All checklist items completed
- [ ] Tests passing
- [ ] Configuration correct
- [ ] Monitoring in place
- [ ] Safety measures active
- [ ] Rollback plan ready
- [ ] Team informed
- [ ] Go/no-go decision made

### 22. Launch

- [ ] Agent started
- [ ] Initial posts published
- [ ] Monitoring active
- [ ] Team on standby
- [ ] First hour monitored closely
- [ ] First day reviewed
- [ ] First week assessed

## Post-Launch

### 23. Week 1 Review

- [ ] Engagement metrics reviewed
- [ ] Community feedback collected
- [ ] Issues identified and addressed
- [ ] Rate limits adjusted if needed
- [ ] Content quality assessed
- [ ] Safety compliance verified

### 24. Month 1 Review

- [ ] Long-term metrics analyzed
- [ ] Community impact assessed
- [ ] WATAM interest generated
- [ ] modX support effective
- [ ] Improvements identified
- [ ] Roadmap updated

## Continuous Improvement

### 25. Ongoing Optimization

- [ ] Regular content review
- [ ] Empathy module improvements
- [ ] Rate limit optimization
- [ ] Community feedback integration
- [ ] Feature requests tracked
- [ ] Bug fixes prioritized
- [ ] Documentation updated
- [ ] Team training ongoing

---

## Quick Reference

### Start Agent
```bash
npm run cli fetch-feed
npm run cli draft-post --submolt art --topic "..."
npm run cli publish-post --submolt art --title "..." --body "..."
```

### Stop Agent
```bash
Ctrl+C  # If running manually
sudo systemctl stop watamai  # If service
```

### Check Status
```bash
npm run cli stats
npm run cli fetch-feed
```

### Emergency Stop
```bash
# Set in .env
DRY_RUN_MODE=true

# Or stop service
sudo systemctl stop watamai
```

---

**Deployment checklist complete. Ready for production.** ✅
