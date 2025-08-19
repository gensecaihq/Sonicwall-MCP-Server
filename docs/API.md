# SonicWall MCP Server - API Documentation

This document provides complete technical specifications for all MCP tools available in the SonicWall MCP Server.

## Table of Contents

- [Tool Overview](#tool-overview)
- [Common Parameters](#common-parameters)
- [Tool Specifications](#tool-specifications)
- [Response Formats](#response-formats)
- [Error Handling](#error-handling)
- [Rate Limits & Performance](#rate-limits--performance)

## Tool Overview

The SonicWall MCP Server provides 5 main tools for comprehensive firewall log analysis:

| Tool | Purpose | Input Type | Output Type |
|------|---------|------------|-------------|
| `analyze_logs` | Natural language log analysis | Query + Filters | Analysis + Insights |
| `get_threats` | Current threat monitoring | Filters | Threat List + Summary |
| `search_connections` | Connection investigation | Network Filters | Connection List + Analysis |
| `get_stats` | Network statistics | Metric Type | Statistics + Trends |
| `export_logs` | Log data export | Filters + Format | Raw Data + Metadata |

## Common Parameters

### Time Range Parameters
```typescript
hoursBack?: number;    // 1-168 (1 hour to 7 days), default: 24
startTime?: string;    // ISO 8601 format: "2024-01-01T00:00:00Z"
endTime?: string;      // ISO 8601 format: "2024-01-01T23:59:59Z"
```

### Filter Parameters
```typescript
severity?: string[];      // ["critical", "high", "medium", "low", "info"]
logType?: string;        // "firewall" | "vpn" | "ips" | "antivirus" | "system" | "all"
action?: string;         // "allow" | "deny" | "drop" | "reset" | "all"
sourceIp?: string;       // IPv4 format: "192.168.1.1"
destIp?: string;         // IPv4 format: "10.0.0.1" 
port?: number;          // 1-65535
limit?: number;         // Result limit (varies by tool)
```

## Tool Specifications

### 1. `analyze_logs`

**Purpose**: Analyze SonicWall logs using natural language queries with intelligent pattern matching.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Natural language query to analyze logs",
      "minLength": 3,
      "maxLength": 500,
      "examples": [
        "show blocked connections from last hour",
        "find critical security threats from today",
        "analyze VPN authentication failures"
      ]
    },
    "hoursBack": {
      "type": "number",
      "description": "Number of hours to look back",
      "minimum": 1,
      "maximum": 168,
      "default": 24
    },
    "logType": {
      "type": "string",
      "enum": ["firewall", "vpn", "ips", "antivirus", "system", "all"],
      "description": "Type of logs to analyze",
      "default": "all"
    }
  },
  "required": ["query"],
  "additionalProperties": false
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "summary": {
      "type": "string",
      "description": "Human-readable analysis summary"
    },
    "totalCount": {
      "type": "number", 
      "description": "Total number of log entries analyzed"
    },
    "matchedLogs": {
      "type": "array",
      "description": "Relevant log entries (limited to 50 for readability)",
      "items": {
        "$ref": "#/definitions/LogEntry"
      }
    },
    "insights": {
      "type": "array",
      "description": "Key findings and patterns identified",
      "items": {
        "type": "string"
      }
    },
    "recommendations": {
      "type": "array", 
      "description": "Security recommendations based on analysis",
      "items": {
        "type": "string"
      }
    }
  }
}
```

#### Example Request
```json
{
  "name": "analyze_logs",
  "arguments": {
    "query": "show blocked connections from external IPs to administrative ports in last 4 hours",
    "hoursBack": 4,
    "logType": "firewall"
  }
}
```

#### Example Response
```json
{
  "summary": "Found 23 blocked connections from 8 external IPs targeting SSH (port 22) and RDP (port 3389) in the last 4 hours",
  "totalCount": 1842,
  "matchedLogs": [
    {
      "id": "log_001", 
      "timestamp": "2024-01-01T14:30:15Z",
      "severity": "high",
      "category": "firewall",
      "action": "deny",
      "sourceIp": "203.0.113.45",
      "destIp": "192.168.1.10",
      "destPort": 22,
      "protocol": "TCP",
      "message": "Connection blocked by firewall rule"
    }
  ],
  "insights": [
    "Peak attack activity at 14:00 (35% of blocked attempts)",
    "Most targeted IP: 192.168.1.10 (12 attempts)",
    "Coordinated attack from 203.0.113.0/24 subnet"
  ],
  "recommendations": [
    "Consider blocking entire 203.0.113.0/24 subnet",
    "Implement fail2ban for IP-based blocking",
    "Review SSH key-based authentication setup"
  ]
}
```

### 2. `get_threats`

**Purpose**: Retrieve current security threats with detailed analysis and recommendations.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "severity": {
      "type": "string",
      "enum": ["critical", "high", "medium", "low", "all"],
      "description": "Filter by threat severity level",
      "default": "all"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of threats to return",
      "minimum": 1,
      "maximum": 1000,
      "default": 50
    },
    "includeBlocked": {
      "type": "boolean",
      "description": "Include blocked threats in results",
      "default": true
    }
  },
  "additionalProperties": false
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "threats": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/ThreatInfo"
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "total": {"type": "number"},
        "bySeverity": {
          "type": "object",
          "additionalProperties": {"type": "number"}
        },
        "byType": {
          "type": "object", 
          "additionalProperties": {"type": "number"}
        },
        "blocked": {"type": "number"},
        "allowed": {"type": "number"}
      }
    },
    "recommendations": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
```

#### Example Request
```json
{
  "name": "get_threats",
  "arguments": {
    "severity": "critical",
    "limit": 20
  }
}
```

### 3. `search_connections`

**Purpose**: Search and analyze network connections by IP address, port, or action with security insights.

#### Input Schema  
```json
{
  "type": "object",
  "properties": {
    "sourceIp": {
      "type": "string",
      "description": "Source IP address (IPv4 format)",
      "pattern": "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    },
    "destIp": {
      "type": "string",
      "description": "Destination IP address (IPv4 format)",
      "pattern": "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    },
    "port": {
      "type": "number",
      "description": "Port number",
      "minimum": 1,
      "maximum": 65535
    },
    "action": {
      "type": "string",
      "enum": ["allow", "deny", "drop", "reset", "all"],
      "description": "Filter by connection action",
      "default": "all"
    },
    "hoursBack": {
      "type": "number",
      "description": "Number of hours to look back",
      "minimum": 1,
      "maximum": 168,
      "default": 24
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results",
      "minimum": 1,
      "maximum": 5000,
      "default": 100
    }
  },
  "additionalProperties": false
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "connections": {
      "type": "array",
      "items": {"$ref": "#/definitions/LogEntry"}
    },
    "summary": {
      "type": "object",
      "properties": {
        "total": {"type": "number"},
        "allowed": {"type": "number"},
        "blocked": {"type": "number"},
        "byProtocol": {
          "type": "object",
          "additionalProperties": {"type": "number"}
        },
        "topPorts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "port": {"type": "number"},
              "count": {"type": "number"}
            }
          }
        },
        "timeRange": {
          "type": "object",
          "properties": {
            "start": {"type": "string"},
            "end": {"type": "string"}
          }
        }
      }
    },
    "insights": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
```

### 4. `get_stats`

**Purpose**: Retrieve comprehensive network statistics and security metrics.

#### Input Schema
```json
{
  "type": "object", 
  "properties": {
    "metric": {
      "type": "string",
      "enum": [
        "top_blocked_ips",
        "top_allowed_ips", 
        "port_summary",
        "threat_summary",
        "protocol_breakdown",
        "hourly_traffic"
      ],
      "description": "Type of statistics to retrieve"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results",
      "minimum": 1,
      "maximum": 100,
      "default": 10
    },
    "hoursBack": {
      "type": "number",
      "description": "Number of hours to analyze",
      "minimum": 1,
      "maximum": 168,
      "default": 24
    }
  },
  "required": ["metric"],
  "additionalProperties": false
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "metric": {"type": "string"},
    "data": {
      "type": "array",
      "items": {"type": "object"}
    },
    "summary": {"type": "string"},
    "period": {"type": "string"},
    "recommendations": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
```

#### Available Metrics

**top_blocked_ips**: Most frequently blocked source IPs
```json
{
  "data": [
    {
      "ip": "203.0.113.10",
      "count": 145,
      "percentage": 23,
      "lastSeen": "2024-01-01T15:30:00Z"
    }
  ]
}
```

**top_allowed_ips**: Most active allowed source IPs  
```json
{
  "data": [
    {
      "ip": "192.168.1.100", 
      "count": 2341,
      "dataTransferred": 1048576,
      "percentage": 15,
      "lastSeen": "2024-01-01T15:45:00Z"
    }
  ]
}
```

**port_summary**: Port usage and security analysis
```json
{
  "data": [
    {
      "port": 443,
      "protocol": "TCP",
      "count": 5678,
      "allowed": 5432,
      "blocked": 246,
      "service": "HTTPS",
      "riskLevel": "low",
      "blockRate": 4
    }
  ]
}
```

**threat_summary**: Threat types and statistics
```json
{
  "data": [
    {
      "type": "malware",
      "count": 23,
      "blocked": 21,
      "critical": 3,
      "high": 8,
      "medium": 12,
      "low": 0,
      "recentCount": 5,
      "blockRate": 91,
      "severity": "critical"
    }
  ]
}
```

### 5. `export_logs`

**Purpose**: Export filtered logs in multiple formats with comprehensive metadata.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "format": {
      "type": "string",
      "enum": ["json", "csv"],
      "description": "Export format"
    },
    "filters": {
      "type": "object",
      "properties": {
        "startTime": {
          "type": "string",
          "format": "date-time",
          "description": "Start time (ISO 8601)"
        },
        "endTime": {
          "type": "string",
          "format": "date-time", 
          "description": "End time (ISO 8601)"
        },
        "severity": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low", "info"]
          },
          "minItems": 1,
          "maxItems": 5
        },
        "logType": {
          "type": "string", 
          "enum": ["firewall", "vpn", "ips", "antivirus", "system", "all"],
          "default": "all"
        },
        "sourceIp": {
          "type": "string",
          "pattern": "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
        },
        "destIp": {
          "type": "string",
          "pattern": "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
        },
        "action": {
          "type": "string",
          "enum": ["allow", "deny", "drop", "reset", "all"],
          "default": "all"
        }
      },
      "additionalProperties": false
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of entries",
      "minimum": 1,
      "maximum": 100000,
      "default": 10000
    }
  },
  "required": ["format"],
  "additionalProperties": false
}
```

#### Response Schema
```json
{
  "type": "object",
  "properties": {
    "format": {"type": "string"},
    "data": {
      "type": "string",
      "description": "Exported data (JSON string or CSV)"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "totalRecords": {"type": "number"},
        "exportedRecords": {"type": "number"},
        "timeRange": {
          "type": "object",
          "properties": {
            "start": {"type": "string"},
            "end": {"type": "string"}
          }
        },
        "filters": {"type": "object"},
        "exportTime": {"type": "string"}
      }
    }
  }
}
```

## Response Formats

### Common Data Types

#### LogEntry
```json
{
  "id": "string",
  "timestamp": "ISO 8601 datetime",
  "severity": "critical|high|medium|low|info",
  "category": "firewall|vpn|ips|antivirus|system", 
  "action": "allow|deny|drop|reset",
  "sourceIp": "IPv4 address",
  "sourcePort": "number (optional)",
  "destIp": "IPv4 address",
  "destPort": "number (optional)",
  "protocol": "TCP|UDP|ICMP|OTHER",
  "rule": "string (optional)",
  "message": "string",
  "raw": "string (original log entry)",
  "cloudId": "string (SonicOS 8.x only)",
  "tenantId": "string (SonicOS 8.x only)"
}
```

#### ThreatInfo
```json
{
  "id": "string",
  "timestamp": "ISO 8601 datetime",
  "severity": "critical|high|medium|low",
  "type": "malware|intrusion|botnet|spam|suspicious",
  "sourceIp": "IPv4 address",
  "destIp": "IPv4 address", 
  "description": "string",
  "action": "string",
  "blocked": "boolean"
}
```

## Error Handling

### MCP Error Codes

The server returns standard MCP error codes:

- **-32700**: Parse error (invalid JSON)
- **-32600**: Invalid Request (invalid JSON-RPC)
- **-32601**: Method not found (unknown tool)
- **-32602**: Invalid params (schema validation failed)
- **-32603**: Internal error (server error)

### Tool-Specific Errors

#### Validation Errors
```json
{
  "code": -32602,
  "message": "Invalid arguments: /sourceIp must match pattern",
  "data": {
    "validationErrors": [
      "/sourceIp must match pattern"
    ]
  }
}
```

#### SonicWall Connection Errors
```json
{
  "content": [
    {
      "type": "text",
      "text": "Tool execution failed: Authentication failed with SonicWall device"
    }
  ],
  "isError": true
}
```

#### Rate Limiting
```json
{
  "code": -32603,
  "message": "Rate limit exceeded",
  "data": {
    "retryAfter": 60
  }
}
```

## Rate Limits & Performance

### Request Limits

- **analyze_logs**: 10 requests/minute
- **get_threats**: 20 requests/minute  
- **search_connections**: 15 requests/minute
- **get_stats**: 30 requests/minute
- **export_logs**: 5 requests/minute (due to data size)

### Performance Guidelines

#### Response Times (Typical)
- **analyze_logs**: 2-5 seconds
- **get_threats**: 1-3 seconds
- **search_connections**: 1-4 seconds  
- **get_stats**: 1-2 seconds
- **export_logs**: 5-30 seconds (depends on data size)

#### Optimization Tips

**Use specific time ranges:**
```json
// ✅ Optimal
{"hoursBack": 6}

// ❌ Slow  
{"hoursBack": 168}
```

**Leverage caching:**
```json
// ✅ Cache-friendly (standard intervals)
{"hoursBack": 24}

// ❌ Cache-unfriendly (custom ranges)
{"startTime": "2024-01-01T13:27:00Z"}
```

**Limit result sets:**
```json
// ✅ Efficient
{"limit": 100}

// ❌ Resource intensive
{"limit": 10000}
```

### Memory Usage

- **Cache Size**: ~100MB typical, 500MB maximum
- **Request Memory**: 10-50MB per request
- **Export Memory**: Up to 200MB for large exports

## Authentication

### Bearer Token (Optional)
```http
Authorization: Bearer your_token_here
```

### CORS Headers
```http
Origin: https://claude.ai
Access-Control-Allow-Origin: https://claude.ai
```

## Examples Collection

### Security Operations Center (SOC) Queries

```javascript
// Morning threat briefing
{
  "name": "get_threats",
  "arguments": {
    "severity": "high",
    "limit": 50
  }
}

// Incident investigation  
{
  "name": "search_connections",
  "arguments": {
    "sourceIp": "203.0.113.10",
    "hoursBack": 48,
    "limit": 1000
  }
}

// Weekly security report
{
  "name": "export_logs", 
  "arguments": {
    "format": "csv",
    "filters": {
      "severity": ["critical", "high"],
      "startTime": "2024-01-01T00:00:00Z",
      "endTime": "2024-01-07T23:59:59Z"
    }
  }
}
```

### Network Analysis

```javascript
// Bandwidth analysis
{
  "name": "get_stats",
  "arguments": {
    "metric": "top_allowed_ips",
    "limit": 50,
    "hoursBack": 168
  }
}

// Service monitoring
{
  "name": "get_stats",
  "arguments": {
    "metric": "port_summary", 
    "limit": 100
  }
}

// Traffic patterns
{
  "name": "get_stats",
  "arguments": {
    "metric": "hourly_traffic",
    "hoursBack": 72
  }
}
```

---

**💡 Pro Tip**: Use the schema validation to ensure your requests are properly formatted. All tools include comprehensive input validation to prevent errors and ensure optimal performance.