import { LogEntry } from './types';

/**
 * Enhanced SonicWall Log Parser with support for SonicOS 7.x and 8.x formats
 * Handles multiple syslog formats, structured JSON logs, and version-specific fields
 */
export class EnhancedSonicWallLogParser {
  private readonly SONICOS_7_PATTERNS = {
    // Standard SonicOS 7.x syslog pattern
    standard: /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+([^\s]+)\s+id=(\w+)\s+sn=([^\s]*)\s+time="([^"]*)".*?fw=([^\s]+).*?pri=(\d+).*?c=(\d+).*?m="([^"]*)".*?src=([^:]+):?(\d+)?.*?dst=([^:]+):?(\d+)?.*?proto=(\w+).*?(?:rule=(\d+))?/,
    
    // Simplified pattern for basic logs
    simple: /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s+.*?(ALLOW|DENY|DROP|RESET).*?SRC=([\\d.]+).*?DST=([\\d.]+).*?PROTO=(\w+)(?:.*?SPT=(\d+))?(?:.*?DPT=(\d+))?/i,
    
    // IPS/IDS specific pattern
    ips: /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+.*?IPS.*?pri=(\d+).*?src=([^:]+):?(\d+)?.*?dst=([^:]+):?(\d+)?.*?sig=([^\\s]+).*?msg="([^"]*)"/,
    
    // VPN specific pattern  
    vpn: /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+.*?VPN.*?user="([^"]*)".*?src=([^:]+).*?dst=([^:]+).*?result=(\\w+).*?msg="([^"]*)"/
  };

  private readonly SONICOS_8_PATTERNS = {
    // SonicOS 8.x enhanced syslog pattern with cloud management fields
    enhanced: /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s+([^\s]+)\s+id=(\w+)\s+sn=([^\s]*)\s+time="([^"]*)".*?fw=([^\s]+).*?pri=(\d+).*?c=(\d+).*?m="([^"]*)".*?src=([^:]+):?(\d+)?.*?dst=([^:]+):?(\d+)?.*?proto=(\w+).*?(?:rule=(\d+))?(?:.*?cloud_id=([^\s]+))?(?:.*?tenant_id=([^\s]+))?/,
    
    // ATP (Advanced Threat Protection) pattern for SonicOS 8.x
    atp: /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s+.*?ATP.*?threat_type=(\w+).*?severity=(\w+).*?src=([^:]+).*?dst=([^:]+).*?file_hash=([a-fA-F0-9]+)?.*?verdict=(\w+).*?msg="([^"]*)"/,
    
    // Capture ATP pattern
    capture_atp: /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s+.*?CAPTURE.*?analysis_time=(\d+).*?file_type=(\w+).*?threat_name="([^"]*)".*?src=([^:]+).*?dst=([^:]+).*?disposition=(\w+)/,
    
    // Standard fallback for SonicOS 8.x
    standard: /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s+.*?(ALLOW|DENY|DROP|RESET).*?SRC=([\\d.]+).*?DST=([\\d.]+).*?PROTO=(\w+)(?:.*?SPT=(\d+))?(?:.*?DPT=(\d+))?/i
  };

  constructor(private sonicOSVersion: '7' | '8' = '7') {}

  /**
   * Parse a single log line based on SonicOS version
   */
  parseLogLine(rawLine: string): LogEntry | null {
    try {
      // Remove any leading/trailing whitespace
      const cleanLine = rawLine.trim();
      if (!cleanLine) return null;

      // Try JSON parsing first (for structured API responses)
      if (cleanLine.startsWith('{')) {
        try {
          const jsonLog = JSON.parse(cleanLine);
          return this.parseStructuredLog(jsonLog);
        } catch (e) {
          // Not JSON, continue with syslog parsing
        }
      }

      if (this.sonicOSVersion === '8') {
        return this.parseSonicOS8Log(cleanLine);
      } else {
        return this.parseSonicOS7Log(cleanLine);
      }
    } catch (error) {
      console.warn('Failed to parse log line:', error);
      return this.createFallbackLogEntry(rawLine);
    }
  }

  /**
   * Parse SonicOS 7.x log format
   */
  private parseSonicOS7Log(rawLine: string): LogEntry | null {
    const patterns = this.SONICOS_7_PATTERNS;

    // Try VPN pattern first
    let match = rawLine.match(patterns.vpn);
    if (match) {
      return this.createLogEntry({
        timestamp: this.parseTimestamp(match[1]),
        category: 'vpn',
        sourceIp: match[3],
        destIp: match[4],
        message: `VPN ${match[5]} for user ${match[2]}: ${match[6]}`,
        action: match[5].toLowerCase() === 'success' ? 'allow' : 'deny',
        raw: rawLine
      });
    }

    // Try IPS pattern
    match = rawLine.match(patterns.ips);
    if (match) {
      return this.createLogEntry({
        timestamp: this.parseTimestamp(match[1]),
        severity: this.mapPriorityToSeverity(parseInt(match[2])),
        category: 'ips',
        sourceIp: match[3],
        sourcePort: match[4] ? parseInt(match[4]) : undefined,
        destIp: match[5],
        destPort: match[6] ? parseInt(match[6]) : undefined,
        message: `IPS signature ${match[7]}: ${match[8]}`,
        action: 'drop',
        raw: rawLine
      });
    }

    // Try standard pattern
    match = rawLine.match(patterns.standard);
    if (match) {
      return this.createLogEntry({
        timestamp: this.parseTimestamp(match[1], match[5]),
        id: match[3],
        severity: this.mapPriorityToSeverity(parseInt(match[7])),
        category: this.mapCategoryCode(parseInt(match[8])),
        message: match[9],
        sourceIp: match[10],
        sourcePort: match[11] ? parseInt(match[11]) : undefined,
        destIp: match[12],
        destPort: match[13] ? parseInt(match[13]) : undefined,
        protocol: this.normalizeProtocol(match[14]),
        rule: match[15],
        raw: rawLine
      });
    }

    // Try simple pattern
    match = rawLine.match(patterns.simple);
    if (match) {
      return this.createLogEntry({
        timestamp: new Date(match[1]),
        action: match[2].toLowerCase() as LogEntry['action'],
        sourceIp: match[3],
        destIp: match[4],
        protocol: this.normalizeProtocol(match[5]),
        sourcePort: match[6] ? parseInt(match[6]) : undefined,
        destPort: match[7] ? parseInt(match[7]) : undefined,
        message: `Traffic ${match[2].toLowerCase()}ed from ${match[3]} to ${match[4]}`,
        raw: rawLine
      });
    }

    return this.createFallbackLogEntry(rawLine);
  }

  /**
   * Parse SonicOS 8.x log format with enhanced features
   */
  private parseSonicOS8Log(rawLine: string): LogEntry | null {
    const patterns = this.SONICOS_8_PATTERNS;

    // Try Capture ATP pattern first (SonicOS 8.x specific)
    let match = rawLine.match(patterns.capture_atp);
    if (match) {
      return this.createLogEntry({
        timestamp: new Date(match[1]),
        category: 'antivirus',
        severity: match[7] === 'malicious' ? 'critical' : 'medium',
        sourceIp: match[5],
        destIp: match[6],
        action: match[7] === 'clean' ? 'allow' : 'deny',
        message: `Capture ATP analysis: ${match[4]} (${match[3]}) - ${match[7]}`,
        raw: rawLine
      });
    }

    // Try ATP pattern
    match = rawLine.match(patterns.atp);
    if (match) {
      return this.createLogEntry({
        timestamp: new Date(match[1]),
        category: 'antivirus',
        severity: this.normalizeSeverity(match[3]),
        sourceIp: match[4],
        destIp: match[5],
        action: match[7] === 'allow' ? 'allow' : 'deny',
        message: `ATP ${match[2]} threat: ${match[8]} (verdict: ${match[7]})`,
        raw: rawLine
      });
    }

    // Try enhanced pattern with cloud fields
    match = rawLine.match(patterns.enhanced);
    if (match) {
      const entry = this.createLogEntry({
        timestamp: new Date(match[1]),
        id: match[3],
        severity: this.mapPriorityToSeverity(parseInt(match[7])),
        category: this.mapCategoryCode(parseInt(match[8])),
        message: match[9],
        sourceIp: match[10],
        sourcePort: match[11] ? parseInt(match[11]) : undefined,
        destIp: match[12],
        destPort: match[13] ? parseInt(match[13]) : undefined,
        protocol: this.normalizeProtocol(match[14]),
        rule: match[15],
        raw: rawLine
      });

      // Add SonicOS 8.x specific fields
      if (match[16]) entry.cloudId = match[16];
      if (match[17]) entry.tenantId = match[17];

      return entry;
    }

    // Try standard pattern
    match = rawLine.match(patterns.standard);
    if (match) {
      return this.createLogEntry({
        timestamp: new Date(match[1]),
        action: match[2].toLowerCase() as LogEntry['action'],
        sourceIp: match[3],
        destIp: match[4],
        protocol: this.normalizeProtocol(match[5]),
        sourcePort: match[6] ? parseInt(match[6]) : undefined,
        destPort: match[7] ? parseInt(match[7]) : undefined,
        message: `Traffic ${match[2].toLowerCase()}ed from ${match[3]} to ${match[4]}`,
        raw: rawLine
      });
    }

    return this.createFallbackLogEntry(rawLine);
  }

  /**
   * Parse structured JSON log entry
   */
  private parseStructuredLog(logData: any): LogEntry {
    return this.createLogEntry({
      id: logData.id || logData.log_id,
      timestamp: new Date(logData.timestamp || logData.time || Date.now()),
      severity: this.normalizeSeverity(logData.severity || logData.priority),
      category: this.normalizeCategory(logData.category || logData.log_type),
      action: this.normalizeAction(logData.action || logData.disposition),
      sourceIp: logData.source_ip || logData.src_ip || logData.srcIP,
      sourcePort: this.parsePort(logData.source_port || logData.src_port || logData.srcPort),
      destIp: logData.dest_ip || logData.dst_ip || logData.destIP,
      destPort: this.parsePort(logData.dest_port || logData.dst_port || logData.destPort),
      protocol: this.normalizeProtocol(logData.protocol || logData.proto),
      rule: logData.rule || logData.rule_name || logData.policy,
      message: logData.message || logData.description || logData.event_description,
      raw: JSON.stringify(logData),
      // SonicOS 8.x specific fields
      cloudId: logData.cloud_id,
      tenantId: logData.tenant_id,
      fileHash: logData.file_hash,
      threatName: logData.threat_name,
      analysisTime: logData.analysis_time
    });
  }

  /**
   * Create a log entry with defaults
   */
  private createLogEntry(partial: Partial<LogEntry> & { raw: string }): LogEntry {
    return {
      id: partial.id || this.generateId(),
      timestamp: partial.timestamp || new Date(),
      severity: partial.severity || 'info',
      category: partial.category || 'system',
      action: partial.action || this.extractAction(partial.message || ''),
      sourceIp: partial.sourceIp || 'unknown',
      sourcePort: partial.sourcePort,
      destIp: partial.destIp || 'unknown',
      destPort: partial.destPort,
      protocol: partial.protocol || 'OTHER',
      rule: partial.rule,
      message: partial.message || 'Unknown message',
      raw: partial.raw,
      // SonicOS 8.x specific fields
      ...((partial as any).cloudId && { cloudId: (partial as any).cloudId }),
      ...((partial as any).tenantId && { tenantId: (partial as any).tenantId }),
      ...((partial as any).fileHash && { fileHash: (partial as any).fileHash }),
      ...((partial as any).threatName && { threatName: (partial as any).threatName }),
      ...((partial as any).analysisTime && { analysisTime: (partial as any).analysisTime })
    };
  }

  /**
   * Create fallback log entry for unparseable logs
   */
  private createFallbackLogEntry(rawLine: string): LogEntry {
    // Try to extract basic information
    const ipPattern = /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g;
    const ips = rawLine.match(ipPattern) || [];
    
    const actionPattern = /(ALLOW|DENY|DROP|RESET|BLOCK)/i;
    const actionMatch = rawLine.match(actionPattern);
    
    return this.createLogEntry({
      sourceIp: ips[0] || 'unknown',
      destIp: ips[1] || 'unknown',
      action: actionMatch ? actionMatch[1].toLowerCase() as LogEntry['action'] : 'deny',
      message: `Unparsed log entry: ${rawLine.substring(0, 100)}${rawLine.length > 100 ? '...' : ''}`,
      raw: rawLine
    });
  }

  /**
   * Parse multiple log lines
   */
  parseLogs(rawLogs: string[]): LogEntry[] {
    return rawLogs
      .map(line => this.parseLogLine(line))
      .filter((entry): entry is LogEntry => entry !== null)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp descending
  }

  /**
   * Parse timestamp with SonicOS format support
   */
  private parseTimestamp(syslogTime: string, sonicwallTime?: string): Date {
    if (sonicwallTime) {
      const date = new Date(sonicwallTime);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Handle ISO 8601 format (SonicOS 8.x)
    if (syslogTime.includes('T') || syslogTime.includes('-')) {
      const date = new Date(syslogTime);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Handle syslog timestamp format (SonicOS 7.x)
    const currentYear = new Date().getFullYear();
    const dateStr = `${currentYear} ${syslogTime}`;
    const date = new Date(dateStr);
    
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Fallback to current time
    return new Date();
  }

  private mapPriorityToSeverity(priority: number): LogEntry['severity'] {
    if (priority <= 2) return 'critical';
    if (priority <= 4) return 'high';
    if (priority <= 6) return 'medium';
    if (priority <= 7) return 'low';
    return 'info';
  }

  private mapCategoryCode(code: number): LogEntry['category'] {
    const categoryMap: Record<number, LogEntry['category']> = {
      1: 'firewall',
      2: 'vpn',
      3: 'ips',
      4: 'antivirus',
      5: 'system',
      6: 'system', // Admin/management
      256: 'firewall', // Connection events
      257: 'firewall', // Rule matching
      512: 'vpn',      // VPN events
      768: 'ips',      // IPS events
      1024: 'antivirus' // Antivirus events
    };
    return categoryMap[code] || 'system';
  }

  private extractAction(message: string): LogEntry['action'] {
    const msgLower = message.toLowerCase();
    if (msgLower.includes('allow') || msgLower.includes('permit') || msgLower.includes('accept')) return 'allow';
    if (msgLower.includes('deny') || msgLower.includes('block') || msgLower.includes('reject')) return 'deny';
    if (msgLower.includes('drop')) return 'drop';
    if (msgLower.includes('reset')) return 'reset';
    return 'deny'; // Default to deny for security
  }

  private normalizeProtocol(protocol: string): LogEntry['protocol'] {
    const proto = protocol.toUpperCase();
    if (['TCP', 'UDP', 'ICMP'].includes(proto)) {
      return proto as LogEntry['protocol'];
    }
    return 'OTHER';
  }

  private normalizeSeverity(severity: any): LogEntry['severity'] {
    if (typeof severity === 'number') {
      return this.mapPriorityToSeverity(severity);
    }
    
    const sev = String(severity).toLowerCase();
    if (['critical', 'crit', 'emergency', 'alert'].includes(sev)) return 'critical';
    if (['high', 'error', 'err'].includes(sev)) return 'high';
    if (['medium', 'med', 'warning', 'warn'].includes(sev)) return 'medium';
    if (['low', 'notice'].includes(sev)) return 'low';
    return 'info';
  }

  private normalizeCategory(category: any): LogEntry['category'] {
    const cat = String(category).toLowerCase();
    if (cat.includes('firewall') || cat.includes('fw')) return 'firewall';
    if (cat.includes('vpn')) return 'vpn';
    if (cat.includes('ips') || cat.includes('intrusion')) return 'ips';
    if (cat.includes('antivirus') || cat.includes('av') || cat.includes('atp')) return 'antivirus';
    return 'system';
  }

  private normalizeAction(action: any): LogEntry['action'] {
    const act = String(action).toLowerCase();
    if (act.includes('allow') || act.includes('permit') || act.includes('accept')) return 'allow';
    if (act.includes('deny') || act.includes('block') || act.includes('reject')) return 'deny';
    if (act.includes('drop')) return 'drop';
    if (act.includes('reset')) return 'reset';
    return 'deny'; // Default to deny for security
  }

  private parsePort(port: any): number | undefined {
    if (typeof port === 'number') return port;
    if (typeof port === 'string') {
      const parsed = parseInt(port, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get parsing statistics
   */
  getParsingStats(logs: string[]): {
    total: number;
    parsed: number;
    failed: number;
    byCategory: Record<string, number>;
    byAction: Record<string, number>;
  } {
    const entries = this.parseLogs(logs);
    const stats = {
      total: logs.length,
      parsed: entries.length,
      failed: logs.length - entries.length,
      byCategory: {} as Record<string, number>,
      byAction: {} as Record<string, number>
    };

    entries.forEach(entry => {
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
      stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;
    });

    return stats;
  }
}