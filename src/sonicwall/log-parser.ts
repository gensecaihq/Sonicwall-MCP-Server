import { LogEntry } from './types';

export class SonicWallLogParser {
  parseLogLine(rawLine: string): LogEntry | null {
    try {
      // Basic syslog format parsing for SonicWall logs
      // Format: <timestamp> <host> id=<id> sn=<sn> time=<time> fw=<fw> pri=<pri> c=<category> m=<msg>
      const logPattern = /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}).*?id=(\w+).*?time="([^"]*)".*?fw=([^\\s]+).*?pri=(\d+).*?c=(\d+).*?m="([^"]*)".*?src=([^:]+):?(\d+)?.*?dst=([^:]+):?(\d+)?.*?proto=(\w+).*?rule=(\d+)/;
      
      const match = rawLine.match(logPattern);
      
      if (!match) {
        // Fallback parsing for different log formats
        return this.parseAlternativeFormat(rawLine);
      }

      const [
        ,
        timestamp,
        id,
        timeStr,
        fw,
        priority,
        category,
        message,
        sourceIp,
        sourcePort,
        destIp,
        destPort,
        protocol,
        rule
      ] = match;

      return {
        id: id || this.generateId(),
        timestamp: this.parseTimestamp(timestamp, timeStr),
        severity: this.mapPriorityToSeverity(parseInt(priority)),
        category: this.mapCategoryCode(parseInt(category)),
        action: this.extractAction(message),
        sourceIp: sourceIp || 'unknown',
        sourcePort: sourcePort ? parseInt(sourcePort) : undefined,
        destIp: destIp || 'unknown',
        destPort: destPort ? parseInt(destPort) : undefined,
        protocol: this.normalizeProtocol(protocol),
        rule: rule || undefined,
        message: message || 'Unknown message',
        raw: rawLine,
      };
    } catch (error) {
      console.warn('Failed to parse log line:', error);
      return null;
    }
  }

  private parseAlternativeFormat(rawLine: string): LogEntry | null {
    // Alternative parsing for different SonicWall log formats
    const simplePattern = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}).*?(ALLOW|DENY|DROP).*?SRC=([\\d.]+).*?DST=([\\d.]+).*?PROTO=(\w+)/i;
    const match = rawLine.match(simplePattern);
    
    if (!match) return null;

    const [, timestamp, action, sourceIp, destIp, protocol] = match;

    return {
      id: this.generateId(),
      timestamp: new Date(timestamp),
      severity: action === 'DENY' || action === 'DROP' ? 'medium' : 'info',
      category: 'firewall',
      action: action.toLowerCase() as 'allow' | 'deny' | 'drop',
      sourceIp,
      destIp,
      protocol: this.normalizeProtocol(protocol),
      message: `Traffic ${action.toLowerCase()}ed from ${sourceIp} to ${destIp}`,
      raw: rawLine,
    };
  }

  private parseTimestamp(syslogTime: string, sonicwallTime?: string): Date {
    if (sonicwallTime) {
      return new Date(sonicwallTime);
    }
    
    // Parse syslog timestamp (assumes current year)
    const currentYear = new Date().getFullYear();
    const dateStr = `${currentYear} ${syslogTime}`;
    return new Date(dateStr);
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
    };
    return categoryMap[code] || 'system';
  }

  private extractAction(message: string): LogEntry['action'] {
    const msgLower = message.toLowerCase();
    if (msgLower.includes('allow') || msgLower.includes('accept')) return 'allow';
    if (msgLower.includes('deny') || msgLower.includes('block')) return 'deny';
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

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  parseLogs(rawLogs: string[]): LogEntry[] {
    return rawLogs
      .map(line => this.parseLogLine(line))
      .filter((entry): entry is LogEntry => entry !== null);
  }
}