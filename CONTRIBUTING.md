# Contributing to WATAM AI

Thank you for your interest in contributing to WATAM AI! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors
- Follow the same empathy-first principles the agent embodies

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/WeAreTheArtMakers/watamai/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node version, OS, etc.)
   - Relevant logs or screenshots

### Suggesting Features

1. Check existing [Issues](https://github.com/WeAreTheArtMakers/watamai/issues) for similar suggestions
2. Create a new issue with:
   - Clear use case
   - Expected behavior
   - Why this would benefit the community
   - Potential implementation approach (optional)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes**:
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed
4. **Test your changes**: `npm test`
5. **Commit with clear messages**: 
   ```
   feat: add scam detection for modX comments
   
   - Implement keyword-based scam detection
   - Add tests for common scam patterns
   - Update empathy module to handle scam warnings
   ```
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Create a Pull Request** with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots/examples if applicable

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/watamai.git
cd watamai

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run tests
npm test

# Build
npm run build

# Test CLI
npm run cli fetch-skill
```

## Code Style

- **TypeScript**: Use strict mode, proper types
- **Formatting**: Prettier (run `npm run format`)
- **Linting**: ESLint (run `npm run lint`)
- **Naming**: 
  - camelCase for variables/functions
  - PascalCase for classes/types
  - UPPER_CASE for constants

## Testing Guidelines

- Write tests for all new features
- Maintain or improve code coverage
- Test both success and error cases
- Use descriptive test names

Example:
```typescript
describe('RateLimiter', () => {
  it('should allow first post', () => {
    // Test implementation
  });

  it('should enforce max posts per hour', () => {
    // Test implementation
  });
});
```

## Documentation

- Update README.md for user-facing changes
- Update code comments for complex logic
- Add JSDoc comments for public APIs
- Update skill files (.kiro/skills/) for behavior changes

## Safety & Ethics

When contributing, ensure:
- **No financial advice**: modX content must include disclaimers
- **No spam**: Respect rate limits and community guidelines
- **Empathy first**: Maintain the agent's empathetic tone
- **Security**: Never commit auth tokens or sensitive data
- **Transparency**: Be clear about what the agent can/cannot do

## Areas for Contribution

### High Priority
- Improved emotion detection in empathy module
- Better Moltbook skill.md parsing
- Enhanced content templates
- More comprehensive tests

### Medium Priority
- Additional language support (beyond Turkish/English)
- Dashboard for monitoring agent activity
- Integration with other platforms (Discord, Twitter)
- Advanced analytics and metrics

### Low Priority
- UI for managing agent configuration
- Visual content generation
- Voice/audio capabilities

## Questions?

- Open a [Discussion](https://github.com/WeAreTheArtMakers/watamai/discussions)
- Join the WATAM community at https://wearetheartmakers.com
- Check existing documentation in `docs/`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make WATAM AI better!** 🎨🤖
