import { SonicWallApiClient } from '../sonicwall/api-client';
import { LogEntry, LogQueryParams } from '../sonicwall/types';

export interface AnalyzeLogsInput {
  query: string;
  hoursBack?: number;
  logType?: 'firewall' | 'vpn' | 'ips' | 'all';
}

export interface AnalyzeLogsOutput {
  summary: string;
  totalCount: number;
  matchedLogs: LogEntry[];
  insights: string[];
  recommendations: string[];
}

export async function analyzeLogs(
  client: SonicWallApiClient,
  input: AnalyzeLogsInput
): Promise<AnalyzeLogsOutput> {
  const {
    query,
    hoursBack = 24,
    logType = 'all'
  } = input;

  // Build query parameters
  const queryParams: LogQueryParams = {
    startTime: new Date(Date.now() - hoursBack * 3600000),
    endTime: new Date(),
    logType: logType === 'all' ? undefined : logType,
    limit: 1000, // Limit for analysis
  };

  // Get logs from SonicWall
  const logs = await client.getLogs(queryParams);

  // Analyze logs based on natural language query
  const analysisResults = performLogAnalysis(logs, query);

  return {
    summary: analysisResults.summary,
    totalCount: logs.length,
    matchedLogs: analysisResults.matchedLogs.slice(0, 50), // Limit results for readability
    insights: analysisResults.insights,
    recommendations: analysisResults.recommendations,
  };
}

function performLogAnalysis(logs: LogEntry[], query: string): {
  summary: string;
  matchedLogs: LogEntry[];
  insights: string[];
  recommendations: string[];
} {
  const queryLower = query.toLowerCase();
  const insights: string[] = [];
  const recommendations: string[] = [];
  
  // Simple keyword-based analysis
  let matchedLogs: LogEntry[] = [];

  // Analysis patterns
  if (queryLower.includes('blocked') || queryLower.includes('deny') || queryLower.includes('drop')) {
    matchedLogs = logs.filter(log => 
      log.action === 'deny' || 
      log.action === 'drop' || 
      log.message.toLowerCase().includes('block')
    );
    insights.push(`Found ${matchedLogs.length} blocked connections`);
    
    if (matchedLogs.length > 0) {
      const topSourceIps = getTopIps(matchedLogs, 'sourceIp');
      insights.push(`Top blocked source IPs: ${topSourceIps.slice(0, 3).map(ip => ip.ip).join(', ')}`);
      
      if (topSourceIps.length > 0 && topSourceIps[0]!.count > 10) {
        recommendations.push(`Consider investigating IP ${topSourceIps[0]!.ip} - it has been blocked ${topSourceIps[0]!.count} times`);
      }
    }
  }
  
  if (queryLower.includes('attack') || queryLower.includes('threat') || queryLower.includes('malware')) {
    matchedLogs = logs.filter(log => 
      log.category === 'ips' || 
      log.severity === 'critical' || 
      log.severity === 'high' ||
      log.message.toLowerCase().includes('attack') ||
      log.message.toLowerCase().includes('threat')
    );
    insights.push(`Found ${matchedLogs.length} potential security threats`);
    
    const criticalLogs = matchedLogs.filter(log => log.severity === 'critical');
    if (criticalLogs.length > 0) {
      recommendations.push(`${criticalLogs.length} critical threats require immediate attention`);
    }
  }
  
  if (queryLower.includes('vpn')) {
    matchedLogs = logs.filter(log => log.category === 'vpn');
    insights.push(`Found ${matchedLogs.length} VPN-related log entries`);
    
    const vpnFailures = matchedLogs.filter(log => 
      log.message.toLowerCase().includes('fail') || log.action === 'deny'
    );
    if (vpnFailures.length > 0) {
      insights.push(`${vpnFailures.length} VPN connection failures detected`);
      recommendations.push('Review VPN configuration and user authentication issues');
    }
  }
  
  if (queryLower.includes('port') || queryLower.includes('service')) {
    const portPattern = /port\s+(\d+)/i;
    const portMatch = query.match(portPattern);
    if (portMatch) {
      const port = parseInt(portMatch[1]!, 10);
      matchedLogs = logs.filter(log => 
        log.sourcePort === port || log.destPort === port
      );
      insights.push(`Found ${matchedLogs.length} connections involving port ${port}`);
    } else {
      // General port analysis
      const portStats = getPortStatistics(logs);
      insights.push(`Most active ports: ${portStats.slice(0, 5).map(p => `${p.port}(${p.count})`).join(', ')}`);
    }
  }
  
  if (queryLower.includes('ip') || queryLower.includes('address')) {
    const ipPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
    const ipMatch = query.match(ipPattern);
    if (ipMatch) {
      const ip = ipMatch[1]!;
      matchedLogs = logs.filter(log => 
        log.sourceIp === ip || log.destIp === ip
      );
      insights.push(`Found ${matchedLogs.length} connections involving IP ${ip}`);
      
      const blockedCount = matchedLogs.filter(log => log.action === 'deny' || log.action === 'drop').length;
      const allowedCount = matchedLogs.length - blockedCount;
      insights.push(`IP ${ip}: ${allowedCount} allowed, ${blockedCount} blocked connections`);
    } else {
      // General IP analysis
      const topIps = getTopIps(logs, 'sourceIp');
      insights.push(`Most active source IPs: ${topIps.slice(0, 3).map(ip => `${ip.ip}(${ip.count})`).join(', ')}`);
    }
  }
  
  if (queryLower.includes('recent') || queryLower.includes('latest') || queryLower.includes('last hour')) {
    const oneHourAgo = new Date(Date.now() - 3600000);
    matchedLogs = logs.filter(log => log.timestamp > oneHourAgo);
    insights.push(`Found ${matchedLogs.length} log entries from the last hour`);
  }
  
  if (queryLower.includes('high') || queryLower.includes('critical')) {
    matchedLogs = logs.filter(log => 
      log.severity === 'high' || log.severity === 'critical'
    );
    insights.push(`Found ${matchedLogs.length} high/critical severity events`);
    
    if (matchedLogs.length > 10) {
      recommendations.push('High number of critical events - consider reviewing security policies');
    }
  }
  
  // If no specific patterns matched, return recent blocked connections
  if (matchedLogs.length === 0) {
    matchedLogs = logs
      .filter(log => log.action === 'deny' || log.action === 'drop')
      .slice(0, 20);
    insights.push('Showing recent blocked connections as no specific patterns were found in the query');
  }
  
  // General insights about the log set
  const severityCounts = logs.reduce((acc, log) => {
    acc[log.severity] = (acc[log.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  insights.push(`Log severity breakdown: ${Object.entries(severityCounts)
    .map(([sev, count]) => `${sev}: ${count}`)
    .join(', ')}`);
  
  // Generate summary
  const summary = generateSummary(matchedLogs, query, insights);
  
  return {
    summary,
    matchedLogs: matchedLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    insights,
    recommendations,
  };
}

function getTopIps(logs: LogEntry[], field: 'sourceIp' | 'destIp'): Array<{ ip: string; count: number }> {
  const ipCounts = logs.reduce((acc, log) => {
    const ip = log[field];
    acc[ip] = (acc[ip] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(ipCounts)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count);
}

function getPortStatistics(logs: LogEntry[]): Array<{ port: number; count: number }> {
  const portCounts = logs.reduce((acc, log) => {
    if (log.destPort) {
      acc[log.destPort] = (acc[log.destPort] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);
  
  return Object.entries(portCounts)
    .map(([port, count]) => ({ port: parseInt(port), count }))
    .sort((a, b) => b.count - a.count);
}

function generateSummary(matchedLogs: LogEntry[], query: string, insights: string[]): string {
  const logCount = matchedLogs.length;
  
  if (logCount === 0) {
    return `No logs found matching the query: "${query}"`;
  }
  
  const timeRange = matchedLogs.length > 0 ? 
    `from ${matchedLogs[matchedLogs.length - 1]!.timestamp.toLocaleString()} to ${matchedLogs[0]!.timestamp.toLocaleString()}` :
    'in the specified time range';
  
  let summary = `Found ${logCount} log entries ${timeRange} matching your query: "${query}".\\n\\n`;
  
  if (insights.length > 0) {
    summary += 'Key findings:\\n' + insights.map(insight => `• ${insight}`).join('\\n');
  }
  
  return summary;
}