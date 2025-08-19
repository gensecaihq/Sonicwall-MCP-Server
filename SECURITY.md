# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of SonicWall MCP Server seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

1. **GitHub Security Advisory** (Preferred)
   - Go to the repository's Security tab
   - Click "Report a vulnerability"
   - Fill out the security advisory form

2. **Email** (Alternative)
   - Send an email with details to: [Your security email]
   - Use subject line: `[SECURITY] SonicWall MCP Server - [Brief Description]`

### What to Include

Please include the following information in your report:

- **Description**: A clear description of the vulnerability
- **Impact**: What an attacker could do with this vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Environment**: Version, OS, deployment method, etc.
- **Proof of Concept**: If available (please be responsible)

### What to Expect

- **Acknowledgment**: We'll acknowledge receipt within 48 hours
- **Initial Assessment**: We'll provide an initial assessment within 5 business days
- **Regular Updates**: We'll keep you informed of our progress
- **Resolution**: We aim to resolve critical issues within 90 days

### Security Considerations for Users

#### Deployment Security

1. **Network Security**
   - Deploy behind a firewall
   - Use VPN or secure networks for SonicWall API access
   - Limit network access to MCP server port (default: 3000)

2. **Authentication**
   - Use strong passwords for SonicWall admin accounts
   - Configure `MCP_BEARER_TOKEN` for additional server security
   - Regularly rotate credentials

3. **Environment Variables**
   - Never commit `.env` files to version control
   - Use secure secret management in production
   - Regularly audit environment configurations

#### SonicWall API Security

1. **API Access**
   - Enable API access only when needed
   - Use least-privilege access principles
   - Monitor API access logs regularly

2. **Network Isolation**
   - Isolate SonicWall management interfaces
   - Use dedicated management networks
   - Implement proper network segmentation

#### Container Security

1. **Docker Security**
   - Use official base images only
   - Keep Docker and images updated
   - Run containers with minimal privileges
   - Scan images for vulnerabilities

2. **Production Deployment**
   - Use container orchestration security features
   - Implement resource limits
   - Monitor container activity

### Known Security Limitations

1. **Development Status**: This project is in active development and community testing phase
2. **Logging**: Error logs may contain sensitive information - secure log storage is essential
3. **Network Traffic**: API communications contain firewall data - ensure secure transport
4. **Dependencies**: Regularly update dependencies to address security vulnerabilities

### Security Best Practices

#### For Contributors

- Follow secure coding practices
- Never include credentials or secrets in code
- Validate all inputs and sanitize outputs
- Use parameterized queries and safe APIs
- Write security-focused tests

#### For Users

- Keep the server updated to the latest version
- Monitor logs for unusual activity
- Use secure deployment practices
- Regular security assessments
- Follow principle of least privilege

### Disclosure Timeline

- **Day 0**: Vulnerability reported
- **Day 2**: Acknowledgment sent
- **Day 5**: Initial assessment and severity classification
- **Day 30**: Progress update and expected timeline
- **Day 90**: Target resolution (may vary based on severity)
- **Post-fix**: Public disclosure after fix is available

### Attribution

We believe in giving credit where credit is due. Security researchers who report vulnerabilities will be acknowledged in our security advisory and release notes (unless they prefer to remain anonymous).

---

**Thank you for helping keep SonicWall MCP Server and our users safe!**