# SonicWall MCP Server - Query Examples

This document provides examples of how to use the SonicWall MCP Server tools effectively.

## analyze_logs Examples

### Basic Log Analysis
```json
{
  "query": "show blocked connections from last hour",
  "hoursBack": 1,
  "logType": "firewall"
}
```

### Security Threat Analysis
```json
{
  "query": "find critical security threats",
  "hoursBack": 24,
  "logType": "all"
}
```

### VPN Connection Issues
```json
{
  "query": "show VPN connection failures",
  "hoursBack": 6,
  "logType": "vpn"
}
```

### Port-Specific Analysis
```json
{
  "query": "analyze connections to port 22 and 3389",
  "hoursBack": 12,
  "logType": "firewall"
}
```

### IP-Based Investigation
```json
{
  "query": "investigate traffic from 192.168.1.100",
  "hoursBack": 24,
  "logType": "all"
}
```

## get_threats Examples

### Critical Threats Only
```json
{
  "severity": "critical",
  "limit": 20
}
```

### All High-Priority Threats
```json
{
  "severity": "high",
  "limit": 50
}
```

### Recent Threat Overview
```json
{
  "severity": "all",
  "limit": 100
}
```

## search_connections Examples

### Search by Source IP
```json
{
  "sourceIp": "192.168.1.100",
  "hoursBack": 24,
  "limit": 100
}
```

### Search by Destination IP
```json
{
  "destIp": "8.8.8.8",
  "action": "deny",
  "hoursBack": 12
}
```

### Port-Based Search
```json
{
  "port": 443,
  "action": "all",
  "hoursBack": 6,
  "limit": 200
}
```

### Blocked Connections Analysis
```json
{
  "action": "deny",
  "hoursBack": 24,
  "limit": 500
}
```

### Comprehensive IP Investigation
```json
{
  "sourceIp": "203.0.113.10",
  "action": "all",
  "hoursBack": 48,
  "limit": 1000
}
```

## get_stats Examples

### Top Blocked IPs
```json
{
  "metric": "top_blocked_ips",
  "limit": 20
}
```

### Most Active Allowed IPs
```json
{
  "metric": "top_allowed_ips",
  "limit": 15
}
```

### Port Usage Summary
```json
{
  "metric": "port_summary",
  "limit": 25
}
```

### Threat Type Breakdown
```json
{
  "metric": "threat_summary",
  "limit": 10
}
```

## export_logs Examples

### Basic CSV Export
```json
{
  "format": "csv",
  "filters": {
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-02T00:00:00Z"
  },
  "limit": 5000
}
```

### High-Severity JSON Export
```json
{
  "format": "json",
  "filters": {
    "severity": ["critical", "high"],
    "logType": "firewall",
    "startTime": "2024-01-01T00:00:00Z"
  },
  "limit": 1000
}
```

### Blocked Connections Export
```json
{
  "format": "csv",
  "filters": {
    "action": "deny",
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-01T23:59:59Z"
  }
}
```

### IP-Specific Export
```json
{
  "format": "json",
  "filters": {
    "sourceIp": "192.168.1.100",
    "startTime": "2024-01-01T00:00:00Z"
  },
  "limit": 10000
}
```

### VPN Logs Export
```json
{
  "format": "csv",
  "filters": {
    "logType": "vpn",
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-07T23:59:59Z"
  }
}
```

## Advanced Use Cases

### Security Incident Response
1. **Initial Analysis:**
   ```json
   {
     "query": "show critical and high severity events from last 24 hours",
     "hoursBack": 24,
     "logType": "all"
   }
   ```

2. **Threat Investigation:**
   ```json
   {
     "severity": "critical",
     "limit": 100
   }
   ```

3. **Connection Analysis:**
   ```json
   {
     "sourceIp": "SUSPICIOUS_IP",
     "action": "all",
     "hoursBack": 72
   }
   ```

4. **Evidence Export:**
   ```json
   {
     "format": "json",
     "filters": {
       "sourceIp": "SUSPICIOUS_IP",
       "severity": ["critical", "high", "medium"],
       "startTime": "2024-01-01T00:00:00Z"
     }
   }
   ```

### Network Performance Analysis
1. **Top Traffic Sources:**
   ```json
   {
     "metric": "top_allowed_ips",
     "limit": 50
   }
   ```

2. **Port Usage:**
   ```json
   {
     "metric": "port_summary",
     "limit": 100
   }
   ```

3. **Connection Patterns:**
   ```json
   {
     "query": "analyze connection patterns for high-traffic ports",
     "hoursBack": 24,
     "logType": "firewall"
   }
   ```

### Compliance Reporting
1. **Access Attempts:**
   ```json
   {
     "query": "show all access attempts to administrative ports",
     "hoursBack": 168,
     "logType": "firewall"
   }
   ```

2. **Failed Connections:**
   ```json
   {
     "action": "deny",
     "hoursBack": 168,
     "limit": 10000
   }
   ```

3. **Full Export:**
   ```json
   {
     "format": "csv",
     "filters": {
       "startTime": "2024-01-01T00:00:00Z",
       "endTime": "2024-01-31T23:59:59Z"
     },
     "limit": 50000
   }
   ```

## Natural Language Query Tips

### Effective Query Patterns
- **Time-based**: "last hour", "today", "past 24 hours"
- **Severity-based**: "critical", "high priority", "severe threats"
- **Action-based**: "blocked", "denied", "allowed"
- **Network-based**: "from IP", "to port", "SSH connections"
- **Service-based**: "VPN", "web traffic", "database connections"

### Example Natural Language Queries
- "Show me blocked connections from external IPs in the last 2 hours"
- "Find high-severity IPS alerts from today"
- "Analyze VPN authentication failures this week" 
- "Show connections to administrative ports (22, 3389, 5900)"
- "Find potential brute force attacks from the last 6 hours"
- "Show malware detections and their sources"
- "Analyze traffic patterns for suspicious internal hosts"

## Best Practices

### Query Optimization
- Use specific time ranges to reduce processing load
- Apply filters to focus on relevant data
- Use appropriate limits for large datasets
- Cache frequently used queries

### Security Considerations
- Regularly review blocked IP statistics
- Monitor for new threat types
- Investigate unusual port activity
- Track VPN connection patterns

### Performance Tips
- Start with smaller time ranges for exploratory analysis
- Use the most specific tool for your needs
- Export large datasets during off-peak hours
- Monitor cache hit rates for optimization