# SonicWall MCP Server - Complete Usage Guide

This comprehensive guide shows you how to use the SonicWall MCP Server for security analysis, threat detection, and network monitoring.

## 🚀 New in Version 1.0.0

### Enhanced SonicOS Support
- **Accurate API Integration**: Proper endpoint mapping for both SonicOS 7.x and 8.x
- **Version-Aware Features**: Automatic detection and usage of version-specific capabilities
- **SonicOS 8.x Enhancements**: Support for cloud management and Advanced Threat Protection
- **Improved Performance**: Enhanced caching and intelligent request management

### Better Natural Language Processing
- **Smarter Query Understanding**: Improved pattern recognition for complex security questions
- **Enhanced Threat Correlation**: Better identification of related security events
- **Context-Aware Analysis**: More accurate insights based on network topology and patterns

## Table of Contents

- [Getting Started](#getting-started)
- [Natural Language Queries](#natural-language-queries)
- [Tool Reference](#tool-reference)
- [Real-World Use Cases](#real-world-use-cases)
- [Best Practices](#best-practices)
- [Advanced Examples](#advanced-examples)
- [Integration Patterns](#integration-patterns)

## Getting Started

### Prerequisites Check

Before using the SonicWall MCP Server, ensure:

1. **SonicWall API is enabled**:
   - Navigate to: **MANAGE** → **System Setup** → **Appliance** → **Base Settings**
   - Scroll to **SonicOS API** section
   - Select authentication method and enable API access

2. **Required permissions**:
   - Admin access to SonicWall device
   - Network connectivity to SonicWall management interface (typically HTTPS/443)

3. **Server is running**:
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"healthy","sonicosVersion":"7.x",...}
   ```

4. **SonicOS Version Detection**:
   ```bash
   # The server automatically detects your SonicOS version
   # SonicOS 7.x: Uses traditional API endpoints (/api/sonicos/*)
   # SonicOS 8.x: Uses enhanced endpoints with cloud features (/api/sonicos/v8/*)
   ```

### First Steps with Claude

Once connected to Claude, you can immediately start analyzing your SonicWall logs:

> **🔥 Try these first queries:**
> - *"Show me what's happening on my network right now"*
> - *"Are there any security threats I should be worried about?"*
> - *"What IPs are being blocked the most?"*

## Natural Language Queries

The `analyze_logs` tool understands natural language and can answer complex security questions.

### Security Analysis Queries

**Threat Detection:**
```
"Show me critical security threats from today"
"Find malware detections in the last 4 hours"
"Are there any ongoing brute force attacks?"
"Identify suspicious network activity patterns"
```

**Network Investigation:**
```
"What connections are being blocked from external IPs?"
"Show me VPN authentication failures"
"Find connections to high-risk ports like SSH and RDP"
"Analyze traffic patterns for unusual behavior"
```

**Time-based Analysis:**
```
"Show me blocked connections from the last hour"
"What happened between 2 PM and 4 PM today?"
"Analyze network activity from last night"
"Find security events from this morning"
```

**IP and Port Investigation:**
```
"Show me all activity from IP 192.168.1.100"
"What's trying to connect to port 22?"
"Find connections to database ports (1433, 3306, 5432)"
"Analyze traffic to and from our web servers"
```

### Query Tips

**📝 Be specific about time ranges:**
- *"last hour"* ✅ vs *"recently"* ❌
- *"between 9 AM and 5 PM"* ✅ vs *"during business hours"* ❌

**📝 Use specific terms:**
- *"blocked connections"* ✅ vs *"bad traffic"* ❌  
- *"SSH brute force"* ✅ vs *"login attempts"* ❌

**📝 Combine conditions:**
- *"blocked connections from external IPs to port 22 in last 2 hours"*
- *"malware detections from internal hosts today"*

## Tool Reference

### 1. `analyze_logs` - Natural Language Analysis

**Purpose**: Analyze logs using conversational queries with intelligent insights.

**Parameters:**
```json
{
  "query": "Natural language question",
  "hoursBack": 24,     // Optional: 1-168 hours
  "logType": "all"     // Optional: firewall|vpn|ips|antivirus|system|all
}
```

**Example Responses:**
```json
{
  "summary": "Found 45 blocked connections from 12 unique external IPs targeting SSH and RDP ports",
  "totalCount": 1247,
  "matchedLogs": [...],
  "insights": [
    "Peak attack activity at 14:00 (23% of all blocked connections)",
    "Top attacking IP: 203.0.113.50 (15 attempts)",
    "Most targeted ports: 22 (SSH), 3389 (RDP)"
  ],
  "recommendations": [
    "Consider implementing fail2ban for IP 203.0.113.50",
    "Review SSH key-based authentication setup",
    "Monitor for coordinated attack patterns"
  ]
}
```

### 2. `get_threats` - Real-time Threat Monitoring

**Purpose**: Get current security threats with detailed analysis.

**Parameters:**
```json
{
  "severity": "high",        // Optional: critical|high|medium|low|all
  "limit": 50,              // Optional: 1-1000
  "includeBlocked": true    // Optional: include blocked threats
}
```

**Use Cases:**
```javascript
// Critical threats only
{
  "severity": "critical",
  "limit": 20
}

// All recent threats
{
  "severity": "all", 
  "limit": 100
}

// High-priority threats for SOC review
{
  "severity": "high",
  "limit": 50,
  "includeBlocked": false
}
```

### 3. `search_connections` - Connection Investigation

**Purpose**: Deep-dive investigation of network connections.

**Parameters:**
```json
{
  "sourceIp": "192.168.1.100",  // Optional: source IP filter
  "destIp": "8.8.8.8",         // Optional: destination IP filter  
  "port": 443,                 // Optional: port filter
  "action": "deny",            // Optional: allow|deny|drop|reset|all
  "hoursBack": 24,             // Optional: time range
  "limit": 100                 // Optional: result limit
}
```

**Investigation Scenarios:**

**Suspicious IP Investigation:**
```json
{
  "sourceIp": "203.0.113.10",
  "hoursBack": 48,
  "limit": 1000
}
```

**Port Scanning Detection:**
```json
{
  "destIp": "192.168.1.50", 
  "action": "deny",
  "hoursBack": 6,
  "limit": 500
}
```

**Service Analysis:**
```json
{
  "port": 22,
  "action": "all",
  "hoursBack": 24
}
```

### 4. `get_stats` - Network Intelligence

**Purpose**: Get comprehensive statistics and metrics.

**Available Metrics:**
- `top_blocked_ips` - Most blocked source IPs
- `top_allowed_ips` - Most active allowed IPs  
- `port_summary` - Port usage statistics
- `threat_summary` - Threat type breakdown
- `protocol_breakdown` - Traffic by protocol
- `hourly_traffic` - Traffic patterns by hour

**Parameters:**
```json
{
  "metric": "top_blocked_ips",  // Required: metric type
  "limit": 10,                 // Optional: result count
  "hoursBack": 24             // Optional: analysis period
}
```

**Example Usage:**

**Security Dashboard:**
```javascript
// Top threats to investigate
{
  "metric": "top_blocked_ips",
  "limit": 20,
  "hoursBack": 24
}

// Service usage patterns  
{
  "metric": "port_summary",
  "limit": 50,
  "hoursBack": 168  // Last week
}

// Threat landscape
{
  "metric": "threat_summary", 
  "limit": 10
}
```

### 5. `export_logs` - Data Export

**Purpose**: Export filtered logs for analysis, compliance, or archival.

**Parameters:**
```json
{
  "format": "csv",           // Required: json|csv
  "filters": {
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-02T00:00:00Z", 
    "severity": ["critical", "high"],
    "logType": "firewall",
    "sourceIp": "192.168.1.100",
    "action": "deny"
  },
  "limit": 10000            // Optional: max records
}
```

**Export Scenarios:**

**Incident Response Evidence:**
```json
{
  "format": "json",
  "filters": {
    "sourceIp": "203.0.113.10",
    "severity": ["critical", "high", "medium"],
    "startTime": "2024-01-01T08:00:00Z",
    "endTime": "2024-01-01T18:00:00Z"
  },
  "limit": 50000
}
```

**Compliance Reporting:**
```json
{
  "format": "csv",
  "filters": {
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-31T23:59:59Z",
    "logType": "firewall",
    "action": "deny"
  },
  "limit": 100000
}
```

## Real-World Use Cases

### 1. Security Incident Response

**Scenario**: Suspicious activity alert from SIEM system

**Investigation Workflow:**
```javascript
// 1. Get current threat overview
"What are the current critical and high-severity threats?"

// 2. Investigate specific threat
{
  "name": "search_connections",
  "arguments": {
    "sourceIp": "SUSPICIOUS_IP",
    "hoursBack": 24,
    "limit": 1000
  }
}

// 3. Analyze attack patterns
"Show me all blocked connections from external IPs targeting administrative ports in the last 6 hours"

// 4. Export evidence
{
  "name": "export_logs", 
  "arguments": {
    "format": "json",
    "filters": {
      "sourceIp": "SUSPICIOUS_IP",
      "severity": ["critical", "high"],
      "startTime": "INCIDENT_START_TIME"
    }
  }
}
```

### 2. Daily Security Review

**Morning Security Brief:**
```javascript
// Overnight threat summary
"What security threats occurred overnight?"

// Top blocked sources
{
  "name": "get_stats",
  "arguments": {
    "metric": "top_blocked_ips", 
    "limit": 20,
    "hoursBack": 12
  }
}

// VPN access review
"Show me VPN authentication failures from last night"

// Critical events
{
  "name": "get_threats",
  "arguments": {
    "severity": "critical",
    "limit": 10
  }
}
```

### 3. Network Performance Analysis

**Weekly Performance Review:**
```javascript
// Traffic patterns
{
  "name": "get_stats",
  "arguments": {
    "metric": "hourly_traffic",
    "hoursBack": 168  // Last week
  }
}

// Top bandwidth consumers
{
  "name": "get_stats", 
  "arguments": {
    "metric": "top_allowed_ips",
    "limit": 50,
    "hoursBack": 168
  }
}

// Service usage
{
  "name": "get_stats",
  "arguments": {
    "metric": "port_summary",
    "limit": 30
  }
}
```

### 4. Compliance Reporting

**Monthly Security Report:**
```javascript
// Export all security events
{
  "name": "export_logs",
  "arguments": {
    "format": "csv",
    "filters": {
      "startTime": "2024-01-01T00:00:00Z",
      "endTime": "2024-01-31T23:59:59Z",
      "severity": ["critical", "high", "medium"]
    },
    "limit": 100000
  }
}

// Threat summary for the month
{
  "name": "get_stats",
  "arguments": {
    "metric": "threat_summary",
    "hoursBack": 720  // 30 days
  }
}
```

## Best Practices

### 🎯 Query Optimization

**Use specific time ranges:**
```javascript
// ✅ Good - specific timeframe
"Show me blocked connections from 2 PM to 4 PM today"

// ❌ Avoid - vague timeframe  
"Show me recent blocked connections"
```

**Combine filters effectively:**
```javascript
// ✅ Efficient - multiple filters
{
  "sourceIp": "192.168.1.100",
  "action": "deny", 
  "hoursBack": 6
}

// ❌ Inefficient - too broad
{
  "hoursBack": 168,  // Full week without filters
  "limit": 10000
}
```

### 🔒 Security Best Practices

**Regular Monitoring Schedule:**
- **Hourly**: Critical threat checks during business hours
- **Daily**: Comprehensive security review and threat analysis  
- **Weekly**: Network performance and usage patterns
- **Monthly**: Compliance reporting and trend analysis

**Alert Thresholds:**
- **Critical**: Immediate investigation (malware, data exfiltration)
- **High**: Investigation within 1 hour (brute force, port scanning)
- **Medium**: Daily review (policy violations, unusual traffic)

### 📊 Performance Optimization

**Cache-Friendly Queries:**
```javascript
// ✅ Cache-friendly - use standard time ranges
"Show me threats from the last hour"
"Get blocked IPs from last 24 hours"

// ❌ Cache-unfriendly - custom time ranges
"Show me activity from 13:27 to 15:43"
```

**Efficient Data Export:**
```javascript
// ✅ Efficient - filter before export
{
  "format": "csv",
  "filters": {
    "severity": ["critical", "high"],
    "logType": "firewall"
  },
  "limit": 5000
}

// ❌ Inefficient - export then filter
{
  "format": "json",
  "limit": 100000  // Too much data
}
```

## Advanced Examples

### Multi-Stage Investigation

**Advanced Persistent Threat (APT) Analysis:**

```javascript
// Stage 1: Identify suspicious patterns
"Find connections from external IPs that were allowed but later blocked"

// Stage 2: Analyze specific threats
{
  "name": "get_threats",
  "arguments": {
    "severity": "high",
    "limit": 100
  }
}

// Stage 3: Deep dive on specific IPs
{
  "name": "search_connections",
  "arguments": {
    "sourceIp": "IDENTIFIED_IP",
    "hoursBack": 72,
    "limit": 2000
  }
}

// Stage 4: Export comprehensive evidence
{
  "name": "export_logs",
  "arguments": {
    "format": "json", 
    "filters": {
      "sourceIp": "IDENTIFIED_IP",
      "startTime": "INVESTIGATION_START"
    }
  }
}
```

### Behavioral Analysis

**Identify Anomalous Behavior:**

```javascript
// Compare current vs. historical patterns
{
  "name": "get_stats",
  "arguments": {
    "metric": "hourly_traffic",
    "hoursBack": 24  // Today
  }
}

{
  "name": "get_stats", 
  "arguments": {
    "metric": "hourly_traffic",
    "hoursBack": 168  // Last week average
  }
}

// Look for unusual port usage
{
  "name": "get_stats",
  "arguments": {
    "metric": "port_summary",
    "limit": 100
  }
}
```

### Automated Security Checks

**Daily Security Automation:**

```javascript
// Morning security briefing
const morningChecks = [
  "What critical threats occurred overnight?",
  "Are there any new IPs being blocked frequently?", 
  "Show me VPN authentication issues from last night",
  "Find any malware detections from the past 12 hours"
];

// Evening security review
const eveningChecks = [
  "What were today's top security events?",
  "Show me traffic patterns from business hours",
  "Are there any ongoing security incidents?",
  "Export today's critical events for review"
];
```

## Integration Patterns

### SIEM Integration

**Threat Intelligence Enrichment:**
```javascript
// Get current threats for SIEM correlation
{
  "name": "get_threats",
  "arguments": {
    "severity": "all",
    "limit": 500
  }
}

// Export indicators of compromise (IoCs)
{
  "name": "export_logs",
  "arguments": {
    "format": "json",
    "filters": {
      "severity": ["critical", "high"],
      "logType": "ips"
    }
  }
}
```

### SOC Workflow Integration

**Tier 1 Analyst Playbook:**
```javascript
// Initial triage
"Show me the highest priority threats right now"

// Escalation criteria  
{
  "name": "get_threats",
  "arguments": {
    "severity": "critical"
  }
}

// Context gathering
{
  "name": "search_connections", 
  "arguments": {
    "sourceIp": "ALERT_IP",
    "hoursBack": 24
  }
}
```

### Compliance Automation

**Automated Reporting:**
```javascript
// PCI DSS logging requirements
{
  "name": "export_logs",
  "arguments": {
    "format": "csv",
    "filters": {
      "startTime": "MONTH_START",
      "endTime": "MONTH_END",
      "logType": "firewall"
    }
  }
}

// SOX access controls
"Show me all administrative access attempts in the last 30 days"
```

## Troubleshooting Queries

If you experience issues, try these diagnostic queries:

```javascript
// Test basic connectivity
"Show me any recent log entries"

// Check data freshness
"What's the most recent log entry?"

// Verify SonicWall connection
{
  "name": "get_stats",
  "arguments": {
    "metric": "top_blocked_ips",
    "limit": 1
  }
}
```

## Next Steps

- Review the [API Documentation](API.md) for detailed technical specifications
- Check [Troubleshooting Guide](TROUBLESHOOTING.md) if you encounter issues
- See [Security Guide](SECURITY.md) for hardening recommendations
- Explore [Configuration Reference](CONFIGURATION.md) for advanced settings

---

**💡 Pro Tip**: Start with broad queries to understand your security landscape, then drill down with specific tool calls for detailed investigation. The natural language interface is designed to understand security terminology and provide actionable insights.