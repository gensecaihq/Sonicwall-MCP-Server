# Contributing to SonicWall MCP Server

Thank you for your interest in contributing to the SonicWall MCP Server! This guide will help you get started with contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome people of all backgrounds and experience levels
- **Be collaborative**: Work together constructively and give helpful feedback
- **Be professional**: Maintain professional standards in all interactions
- **Focus on security**: Prioritize security in all contributions

## Getting Started

### Ways to Contribute

- 🐛 **Bug Reports**: Report issues or unexpected behavior
- 💡 **Feature Requests**: Suggest new features or improvements
- 📝 **Documentation**: Improve documentation and examples
- 🧪 **Testing**: Add tests or improve test coverage
- 🔧 **Code**: Fix bugs or implement new features
- 🎨 **UI/UX**: Improve user experience and interface design

### Before You Start

1. Check existing [issues](https://github.com/your-org/sonicwall-mcp-server/issues) and [pull requests](https://github.com/your-org/sonicwall-mcp-server/pulls)
2. Read our [documentation](docs/) to understand the project
3. Set up your development environment
4. Consider opening an issue to discuss major changes before implementing

## Development Setup

### Prerequisites

- **Node.js** 20.x or higher
- **Docker** and **Docker Compose**
- **Git** for version control
- **SonicWall Device** or test environment (for integration testing)

### Local Development

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/sonicwall-mcp-server.git
   cd sonicwall-mcp-server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your SonicWall test credentials
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   npm run test:integration
   ```

### Docker Development

```bash
# Development with hot reload
docker compose -f docker compose.yml -f docker compose.dev.yml up

# Run tests in container
docker compose exec sonicwall-mcp npm test
```

## Contributing Process

### 1. Issue First (Recommended)

For significant changes, please open an issue first to discuss:

- **Bug Reports**: Include reproduction steps, expected behavior, and system information
- **Feature Requests**: Describe the use case, proposed solution, and alternatives considered
- **Security Issues**: Email security@yourorganization.com instead of opening public issues

### 2. Branch Naming

Use descriptive branch names:

```bash
# Feature branches
feature/natural-language-queries
feature/sonicwall-8x-support

# Bug fixes
fix/authentication-retry-logic
fix/memory-leak-in-cache

# Documentation
docs/api-reference-update
docs/troubleshooting-guide

# Maintenance
chore/dependency-updates
refactor/log-parser-optimization
```

### 3. Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes with frequent commits
git add .
git commit -m "Add initial implementation of feature"

# 3. Keep branch updated
git fetch origin
git rebase origin/main

# 4. Run tests and linting
npm test
npm run lint
npm run typecheck

# 5. Push branch
git push origin feature/your-feature-name

# 6. Open Pull Request
```

### 4. Pull Request Guidelines

**PR Title Format:**
- `feat: add natural language query processing`
- `fix: resolve authentication retry logic issue`
- `docs: update API documentation for new tools`
- `refactor: optimize log parsing performance`
- `test: add integration tests for SonicOS 8.x`

**PR Description Should Include:**
- **Summary**: Brief description of changes
- **Motivation**: Why this change is needed
- **Changes**: List of specific changes made
- **Testing**: How the changes were tested
- **Breaking Changes**: Any backwards compatibility concerns
- **Screenshots**: For UI changes (if applicable)

**PR Checklist:**
- [ ] Code follows project coding standards
- [ ] Tests added/updated and passing
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or properly documented)
- [ ] Security considerations reviewed
- [ ] Performance impact assessed

## Coding Standards

### TypeScript Standards

```typescript
// Use strict TypeScript configuration
// Follow existing patterns and naming conventions

// ✅ Good
interface LogAnalysisRequest {
  query: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  filters?: LogFilters;
}

// ❌ Avoid
interface logRequest {
  q: string;
  time: any;
  f: any;
}
```

### Code Style

- **Formatting**: Use Prettier for consistent formatting
- **Linting**: Follow ESLint configuration
- **Naming**: Use descriptive names for variables, functions, and classes
- **Comments**: Add JSDoc comments for public APIs
- **Error Handling**: Always handle errors appropriately
- **Security**: Follow security best practices

### File Organization

```
src/
├── server.ts              # Main server entry point
├── tools/                 # MCP tool implementations
│   ├── analyze.ts
│   ├── threats.ts
│   └── ...
├── sonicwall/             # SonicWall API integration
│   ├── api-client.ts
│   ├── log-parser.ts
│   └── types.ts
├── utils/                 # Utility functions
│   ├── cache.ts
│   └── config.ts
└── __tests__/             # Test files
    ├── unit/
    └── integration/
```

### Commit Message Format

Follow [Conventional Commits](https://conventionalcommits.org/):

```
type(scope): brief description

More detailed explanation (if needed)

- List specific changes
- Include breaking changes
- Reference issues: Closes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(tools): add natural language query processing for log analysis

fix(auth): resolve token refresh issue causing API failures
- Add retry logic for token refresh
- Improve error handling for authentication failures
- Closes #45

docs(api): update tool specifications with new parameters
- Add examples for all MCP tools
- Document SonicOS 8.x specific features
- Include troubleshooting section
```

## Testing Guidelines

### Test Categories

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test component interactions
3. **API Tests**: Test MCP tool functionality
4. **Performance Tests**: Test response times and resource usage
5. **Security Tests**: Test authentication and authorization

### Testing Requirements

- **Coverage**: Maintain >80% code coverage
- **Performance**: Ensure tests run quickly (<30 seconds total)
- **Reliability**: Tests should be deterministic and reliable
- **Independence**: Tests should not depend on each other

### Example Test Structure

```typescript
// __tests__/unit/tools/analyze.test.ts
describe('analyzeLogs', () => {
  let mockClient: jest.Mocked<SonicWallApiClient>;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe('natural language processing', () => {
    it('should identify blocked connections query', async () => {
      // Arrange
      const query = 'show blocked connections from last hour';
      const expectedLogs = [mockLogEntry()];
      mockClient.getLogs.mockResolvedValue(expectedLogs);

      // Act
      const result = await analyzeLogs(mockClient, { query, hoursBack: 1 });

      // Assert
      expect(result.summary).toContain('blocked connections');
      expect(result.matchedLogs).toHaveLength(1);
      expect(mockClient.getLogs).toHaveBeenCalledWith({
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        logType: undefined
      });
    });
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test file
npm test -- analyze.test.ts
```

## Documentation

### Documentation Standards

- **Clarity**: Write clear, concise documentation
- **Examples**: Include practical examples
- **Completeness**: Document all public APIs
- **Accuracy**: Keep documentation up-to-date with code changes

### Documentation Types

1. **API Documentation** (`docs/API.md`): Complete tool specifications
2. **User Guide** (`docs/USAGE.md`): How to use the server
3. **Configuration** (`docs/CONFIGURATION.md`): Setup and configuration
4. **Troubleshooting** (`docs/TROUBLESHOOTING.md`): Common issues and solutions
5. **Code Comments**: JSDoc for functions and classes

### JSDoc Standards

```typescript
/**
 * Analyzes SonicWall logs using natural language queries
 * 
 * @param client - SonicWall API client instance
 * @param input - Analysis parameters including query and filters
 * @returns Promise resolving to analysis results with insights and recommendations
 * 
 * @example
 * ```typescript
 * const result = await analyzeLogs(client, {
 *   query: "show blocked connections from last hour",
 *   hoursBack: 1
 * });
 * ```
 */
export async function analyzeLogs(
  client: SonicWallApiClient,
  input: AnalyzeLogsInput
): Promise<AnalyzeLogsOutput> {
  // Implementation
}
```

## Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (1.1.0): New features, backwards compatible
- **PATCH** (1.1.1): Bug fixes, backwards compatible

### Release Checklist

1. **Pre-release**:
   - [ ] All tests passing
   - [ ] Documentation updated
   - [ ] CHANGELOG updated
   - [ ] Version bumped in package.json
   - [ ] Security review completed

2. **Release**:
   - [ ] Create release branch
   - [ ] Tag release: `git tag v1.1.0`
   - [ ] Build Docker image
   - [ ] Update documentation
   - [ ] Create GitHub release

3. **Post-release**:
   - [ ] Monitor for issues
   - [ ] Update project dependencies
   - [ ] Plan next release

## Security Considerations

### Security Review Process

All contributions undergo security review:

1. **Automated Scanning**: Dependencies scanned for vulnerabilities
2. **Code Review**: Manual review for security issues
3. **Testing**: Security-focused testing
4. **Documentation**: Security implications documented

### Security Guidelines

- **Input Validation**: Always validate and sanitize inputs
- **Authentication**: Secure credential handling
- **Authorization**: Proper access controls
- **Logging**: No sensitive data in logs
- **Dependencies**: Keep dependencies updated
- **Secrets**: Use environment variables for secrets

## Recognition

Contributors will be recognized in:

- **README.md**: Contributors section
- **CHANGELOG.md**: Release notes
- **GitHub**: Contributor statistics
- **Documentation**: Author attribution where appropriate

## Questions and Support

- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-org/sonicwall-mcp-server/discussions)
- 📧 **Email**: maintainers@yourorganization.com
- 📚 **Documentation**: [Project Wiki](https://github.com/your-org/sonicwall-mcp-server/wiki)

---

**Thank you for contributing to the SonicWall MCP Server project! 🚀**