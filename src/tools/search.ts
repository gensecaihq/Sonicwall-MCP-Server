import { SonicWallApiClient } from '../sonicwall/api-client';
import { LogEntry, LogQueryParams } from '../sonicwall/types';

export interface SearchConnectionsInput {
  sourceIp?: string;
  destIp?: string;
  port?: number;
  action?: 'allow' | 'deny' | 'all';
  hoursBack?: number;
  limit?: number;
}

export interface SearchConnectionsOutput {
  connections: LogEntry[];
  summary: {
    total: number;
    allowed: number;
    blocked: number;
    byProtocol: Record<string, number>;
    topPorts: Array<{ port: number; count: number }>;
    timeRange: {
      start: string;
      end: string;
    };
  };
  insights: string[];
}

export async function searchConnections(
  client: SonicWallApiClient,
  input: SearchConnectionsInput = {}
): Promise<SearchConnectionsOutput> {
  const {
    sourceIp,
    destIp,
    port,
    action = 'all',
    hoursBack = 24,
    limit = 100
  } = input;

  // Build query parameters
  const queryParams: LogQueryParams = {
    startTime: new Date(Date.now() - hoursBack * 3600000),
    endTime: new Date(),
    sourceIp,
    destIp,
    port,
    action: action === 'all' ? undefined : action,
    limit: Math.min(limit, 1000), // Cap at 1000 for performance
  };

  // Get filtered logs from SonicWall
  const connections = await client.getLogs(queryParams);

  // Generate summary and insights
  const summary = generateConnectionSummary(connections, input);
  const insights = generateConnectionInsights(connections, input);

  return {
    connections: connections
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit),
    summary,
    insights,
  };
}

function generateConnectionSummary(connections: LogEntry[], input: SearchConnectionsInput) {
  const summary = {
    total: connections.length,
    allowed: 0,
    blocked: 0,
    byProtocol: {} as Record<string, number>,
    topPorts: [] as Array<{ port: number; count: number }>,
    timeRange: {
      start: connections.length > 0 ? connections[connections.length - 1]!.timestamp.toISOString() : '',
      end: connections.length > 0 ? connections[0]!.timestamp.toISOString() : '',
    },
  };

  // Count by action
  connections.forEach(conn => {
    if (conn.action === 'allow') {
      summary.allowed++;
    } else if (conn.action === 'deny' || conn.action === 'drop') {
      summary.blocked++;
    }
    
    // Count by protocol
    summary.byProtocol[conn.protocol] = (summary.byProtocol[conn.protocol] || 0) + 1;
  });

  // Calculate top ports
  const portCounts = connections.reduce((acc, conn) => {
    if (conn.destPort) {
      acc[conn.destPort] = (acc[conn.destPort] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  summary.topPorts = Object.entries(portCounts)
    .map(([port, count]) => ({ port: parseInt(port), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return summary;
}

function generateConnectionInsights(connections: LogEntry[], input: SearchConnectionsInput): string[] {
  const insights: string[] = [];
  
  if (connections.length === 0) {
    insights.push('No connections found matching the specified criteria');
    return insights;
  }

  // IP-specific insights
  if (input.sourceIp) {
    const blockedCount = connections.filter(c => c.action === 'deny' || c.action === 'drop').length;
    const allowedCount = connections.length - blockedCount;
    
    insights.push(`Source IP ${input.sourceIp}: ${allowedCount} allowed, ${blockedCount} blocked connections`);
    
    // Check for potential scanning activity
    const uniqueDestPorts = new Set(connections.map(c => c.destPort).filter(Boolean));
    if (uniqueDestPorts.size > 20) {
      insights.push(`⚠️  Potential port scanning detected - ${uniqueDestPorts.size} different destination ports accessed`);
    }
    
    // Check for high-risk ports
    const highRiskPorts = [22, 23, 135, 139, 445, 3389, 5900];
    const accessedRiskPorts = connections
      .filter(c => c.destPort && highRiskPorts.includes(c.destPort))
      .map(c => c.destPort);
    
    if (accessedRiskPorts.length > 0) {
      const uniqueRiskPorts = [...new Set(accessedRiskPorts)];
      insights.push(`🔒 High-risk ports accessed: ${uniqueRiskPorts.join(', ')}`);
    }
  }
  
  if (input.destIp) {
    const sourceIps = [...new Set(connections.map(c => c.sourceIp))];
    insights.push(`Destination IP ${input.destIp} accessed by ${sourceIps.length} unique source IPs`);
    
    if (sourceIps.length > 50) {
      insights.push(`⚠️  High number of source IPs (${sourceIps.length}) - potential DDoS or distributed attack`);
    }
  }
  
  // Port-specific insights
  if (input.port) {
    const protocolBreakdown = connections.reduce((acc, c) => {
      acc[c.protocol] = (acc[c.protocol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const protocols = Object.entries(protocolBreakdown)
      .map(([proto, count]) => `${proto}: ${count}`)
      .join(', ');
    
    insights.push(`Port ${input.port} traffic breakdown: ${protocols}`);
    
    // Check for common service ports
    const serviceInfo = getServiceInfo(input.port);
    if (serviceInfo) {
      insights.push(`ℹ️  Port ${input.port} commonly used for: ${serviceInfo}`);
    }
  }
  
  // Time-based insights
  const timeDistribution = analyzeTimeDistribution(connections);
  if (timeDistribution.insight) {
    insights.push(timeDistribution.insight);
  }
  
  // Protocol insights
  const protocols = Object.entries(
    connections.reduce((acc, c) => {
      acc[c.protocol] = (acc[c.protocol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([,a], [,b]) => b - a);
  
  if (protocols.length > 0) {
    insights.push(`Most common protocol: ${protocols[0]![0]} (${protocols[0]![1]} connections)`);
  }
  
  // Severity insights
  const highSeverityConnections = connections.filter(c => 
    c.severity === 'critical' || c.severity === 'high'
  );
  
  if (highSeverityConnections.length > 0) {
    insights.push(`🚨 ${highSeverityConnections.length} high/critical severity connections found`);
  }
  
  // Rate insights
  const hoursBack = input.hoursBack || 24;
  const connectionsPerHour = Math.round(connections.length / hoursBack);
  insights.push(`Average connection rate: ${connectionsPerHour} connections/hour`);
  
  if (connectionsPerHour > 100) {
    insights.push(`📈 High connection rate detected - monitor for potential automated activity`);
  }
  
  return insights;
}

function analyzeTimeDistribution(connections: LogEntry[]): { insight?: string } {
  if (connections.length < 10) {
    return {};
  }
  
  // Group by hour
  const hourly = connections.reduce((acc, conn) => {
    const hour = conn.timestamp.getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const hours = Object.entries(hourly).map(([h, count]) => ({ hour: parseInt(h), count }));
  hours.sort((a, b) => b.count - a.count);
  
  if (hours.length > 0 && hours[0]!.count > connections.length * 0.3) {
    const peakHour = hours[0]!.hour;
    const peakCount = hours[0]!.count;
    const percentage = Math.round((peakCount / connections.length) * 100);
    
    return {
      insight: `🕐 Peak activity at ${peakHour}:00 (${percentage}% of all connections)`
    };
  }
  
  return {};
}

function getServiceInfo(port: number): string | null {
  const services: Record<number, string> = {
    20: 'FTP Data Transfer',
    21: 'FTP Control',
    22: 'SSH',
    23: 'Telnet',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    135: 'RPC Endpoint Mapper',
    139: 'NetBIOS Session Service',
    143: 'IMAP',
    443: 'HTTPS',
    445: 'SMB',
    993: 'IMAPS',
    995: 'POP3S',
    1433: 'SQL Server',
    3306: 'MySQL',
    3389: 'RDP',
    5432: 'PostgreSQL',
    5900: 'VNC',
    8080: 'HTTP Proxy',
  };
  
  return services[port] || null;
}