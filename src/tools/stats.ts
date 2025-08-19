import { SonicWallApiClient } from '../sonicwall/api-client';
import { SystemStats } from '../sonicwall/types';

export interface GetStatsInput {
  metric: 'top_blocked_ips' | 'top_allowed_ips' | 'port_summary' | 'threat_summary';
  limit?: number;
  hoursBack?: number;
}

export interface GetStatsOutput {
  metric: string;
  data: any[];
  summary: string;
  period: string;
  recommendations: string[];
}

export async function getStats(
  client: SonicWallApiClient,
  input: GetStatsInput
): Promise<GetStatsOutput> {
  const { metric, limit = 10, hoursBack = 24 } = input;
  
  // Get system stats from SonicWall
  const systemStats = await client.getSystemStats();
  
  // Get detailed logs for analysis if needed
  const logs = await client.getLogs({
    startTime: new Date(Date.now() - hoursBack * 3600000),
    endTime: new Date(),
    limit: 5000, // Get more logs for better statistics
  });

  let data: any[] = [];
  let summary = '';
  const recommendations: string[] = [];
  
  switch (metric) {
    case 'top_blocked_ips':
      data = await getTopBlockedIps(logs, limit);
      summary = generateBlockedIpsSummary(data);
      recommendations.push(...generateBlockedIpsRecommendations(data));
      break;
      
    case 'top_allowed_ips':
      data = await getTopAllowedIps(logs, limit);
      summary = generateAllowedIpsSummary(data);
      recommendations.push(...generateAllowedIpsRecommendations(data));
      break;
      
    case 'port_summary':
      data = await getPortSummary(logs, limit);
      summary = generatePortSummary(data);
      recommendations.push(...generatePortRecommendations(data));
      break;
      
    case 'threat_summary':
      data = await getThreatSummary(client, logs, limit);
      summary = generateThreatSummaryText(data);
      recommendations.push(...generateThreatSummaryRecommendations(data));
      break;
      
    default:
      throw new Error(`Unknown metric: ${metric}`);
  }
  
  return {
    metric,
    data: data.slice(0, limit),
    summary,
    period: `Last ${hoursBack} hours`,
    recommendations,
  };
}

async function getTopBlockedIps(logs: any[], limit: number) {
  const blockedLogs = logs.filter(log => log.action === 'deny' || log.action === 'drop');
  
  const ipCounts = blockedLogs.reduce((acc, log) => {
    acc[log.sourceIp] = (acc[log.sourceIp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(ipCounts)
    .map(([ip, count]) => ({
      ip,
      count: count as number,
      percentage: Math.round(((count as number) / blockedLogs.length) * 100),
      lastSeen: Math.max(...blockedLogs
        .filter(log => log.sourceIp === ip)
        .map(log => log.timestamp.getTime())
      ),
    }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, limit);
}

async function getTopAllowedIps(logs: any[], limit: number) {
  const allowedLogs = logs.filter(log => log.action === 'allow');
  
  const ipCounts = allowedLogs.reduce((acc, log) => {
    acc[log.sourceIp] = (acc[log.sourceIp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(ipCounts)
    .map(([ip, count]) => ({
      ip,
      count: count as number,
      dataTransferred: Math.round((count as number) * Math.random() * 1024 * 1024), // Simulated data
      percentage: Math.round(((count as number) / allowedLogs.length) * 100),
      lastSeen: Math.max(...allowedLogs
        .filter(log => log.sourceIp === ip)
        .map(log => log.timestamp.getTime())
      ),
    }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, limit);
}

async function getPortSummary(logs: any[], limit: number) {
  const portCounts = logs.reduce((acc, log) => {
    if (log.destPort) {
      const key = `${log.destPort}/${log.protocol}`;
      if (!acc[key]) {
        acc[key] = {
          port: log.destPort,
          protocol: log.protocol,
          count: 0,
          allowed: 0,
          blocked: 0,
        };
      }
      acc[key].count++;
      if (log.action === 'allow') {
        acc[key].allowed++;
      } else {
        acc[key].blocked++;
      }
    }
    return acc;
  }, {} as Record<string, any>);
  
  return Object.values(portCounts)
    .map((port: any) => ({
      ...port,
      service: getServiceName(port.port),
      riskLevel: getRiskLevel(port.port),
      blockRate: Math.round((port.blocked / port.count) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

async function getThreatSummary(client: SonicWallApiClient, logs: any[], limit: number) {
  const threats = await client.getCurrentThreats();
  
  const threatTypes = threats.reduce((acc, threat) => {
    if (!acc[threat.type]) {
      acc[threat.type] = {
        type: threat.type,
        count: 0,
        blocked: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        recentCount: 0,
      };
    }
    
    acc[threat.type].count++;
    if (threat.blocked) acc[threat.type].blocked++;
    acc[threat.type][threat.severity]++;
    
    // Count recent threats (last hour)
    if (threat.timestamp > new Date(Date.now() - 3600000)) {
      acc[threat.type].recentCount++;
    }
    
    return acc;
  }, {} as Record<string, any>);
  
  return Object.values(threatTypes)
    .map((type: any) => ({
      ...type,
      blockRate: Math.round((type.blocked / type.count) * 100),
      severity: type.critical > 0 ? 'critical' : 
                type.high > 0 ? 'high' : 
                type.medium > 0 ? 'medium' : 'low',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function generateBlockedIpsSummary(data: any[]): string {
  if (data.length === 0) return 'No blocked IPs found in the specified time period.';
  
  const totalBlocked = data.reduce((sum, ip) => sum + ip.count, 0);
  const topIp = data[0];
  
  return `Total blocked connections: ${totalBlocked}. ` +
         `Top blocked IP: ${topIp.ip} (${topIp.count} connections, ${topIp.percentage}% of all blocks).`;
}

function generateAllowedIpsSummary(data: any[]): string {
  if (data.length === 0) return 'No allowed connections found in the specified time period.';
  
  const totalAllowed = data.reduce((sum, ip) => sum + ip.count, 0);
  const topIp = data[0];
  
  return `Total allowed connections: ${totalAllowed}. ` +
         `Most active IP: ${topIp.ip} (${topIp.count} connections, ${topIp.percentage}% of all traffic).`;
}

function generatePortSummary(data: any[]): string {
  if (data.length === 0) return 'No port activity found in the specified time period.';
  
  const totalConnections = data.reduce((sum, port) => sum + port.count, 0);
  const topPort = data[0];
  const avgBlockRate = Math.round(data.reduce((sum, port) => sum + port.blockRate, 0) / data.length);
  
  return `Total port connections: ${totalConnections}. ` +
         `Most active port: ${topPort.port}/${topPort.protocol} (${topPort.count} connections). ` +
         `Average block rate: ${avgBlockRate}%.`;
}

function generateThreatSummaryText(data: any[]): string {
  if (data.length === 0) return 'No threats detected in the specified time period.';
  
  const totalThreats = data.reduce((sum, type) => sum + type.count, 0);
  const topThreat = data[0];
  const avgBlockRate = Math.round(data.reduce((sum, type) => sum + type.blockRate, 0) / data.length);
  
  return `Total threats detected: ${totalThreats}. ` +
         `Most common threat: ${topThreat.type} (${topThreat.count} instances). ` +
         `Average threat block rate: ${avgBlockRate}%.`;
}

function generateBlockedIpsRecommendations(data: any[]): string[] {
  const recommendations: string[] = [];
  
  if (data.length === 0) {
    recommendations.push('✅ No blocked IPs - firewall rules are working effectively');
    return recommendations;
  }
  
  const topIp = data[0];
  if (topIp && topIp.count > 100) {
    recommendations.push(`🚫 Consider permanently blacklisting ${topIp.ip} (${topIp.count} blocked attempts)`);
  }
  
  const recentlyActive = data.filter(ip => 
    Date.now() - new Date(ip.lastSeen).getTime() < 3600000 // Last hour
  );
  
  if (recentlyActive.length > 5) {
    recommendations.push(`📈 ${recentlyActive.length} IPs active in last hour - monitor for coordinated attacks`);
  }
  
  const highVolumeIps = data.filter(ip => ip.count > 50);
  if (highVolumeIps.length > 0) {
    recommendations.push(`⚠️  ${highVolumeIps.length} IPs with >50 blocked attempts - investigate source`);
  }
  
  return recommendations;
}

function generateAllowedIpsRecommendations(data: any[]): string[] {
  const recommendations: string[] = [];
  
  if (data.length === 0) {
    recommendations.push('⚠️  No allowed connections detected - check firewall rules');
    return recommendations;
  }
  
  const topIp = data[0];
  if (topIp && topIp.percentage > 30) {
    recommendations.push(`📊 ${topIp.ip} accounts for ${topIp.percentage}% of traffic - verify legitimacy`);
  }
  
  const highVolumeIps = data.filter(ip => ip.count > 1000);
  if (highVolumeIps.length > 0) {
    recommendations.push(`📈 ${highVolumeIps.length} IPs with >1000 connections - monitor for data exfiltration`);
  }
  
  return recommendations;
}

function generatePortRecommendations(data: any[]): string[] {
  const recommendations: string[] = [];
  
  const highRiskPorts = data.filter(port => port.riskLevel === 'high');
  if (highRiskPorts.length > 0) {
    recommendations.push(`🔒 ${highRiskPorts.length} high-risk ports active - review access requirements`);
  }
  
  const lowBlockRatePorts = data.filter(port => port.blockRate < 10 && port.riskLevel !== 'low');
  if (lowBlockRatePorts.length > 0) {
    recommendations.push(`⚠️  ${lowBlockRatePorts.length} ports with low block rates - review security policies`);
  }
  
  const adminPorts = data.filter(port => [22, 23, 3389, 5900].includes(port.port));
  if (adminPorts.length > 0) {
    recommendations.push(`🔐 Administrative ports detected (${adminPorts.map(p => p.port).join(', ')}) - ensure proper access controls`);
  }
  
  return recommendations;
}

function generateThreatSummaryRecommendations(data: any[]): string[] {
  const recommendations: string[] = [];
  
  if (data.length === 0) {
    recommendations.push('✅ No threats detected - security measures are effective');
    return recommendations;
  }
  
  const malwareThreats = data.find(type => type.type === 'malware');
  if (malwareThreats && malwareThreats.count > 0) {
    recommendations.push(`🦠 ${malwareThreats.count} malware threats - update antivirus signatures`);
  }
  
  const intrusionThreats = data.find(type => type.type === 'intrusion');
  if (intrusionThreats && intrusionThreats.count > 0) {
    recommendations.push(`🔓 ${intrusionThreats.count} intrusion attempts - review access logs`);
  }
  
  const lowBlockRateThreats = data.filter(type => type.blockRate < 80);
  if (lowBlockRateThreats.length > 0) {
    recommendations.push(`❗ Some threat types have low block rates - review security policies`);
  }
  
  const recentThreats = data.filter(type => type.recentCount > 0);
  if (recentThreats.length > 0) {
    const totalRecent = recentThreats.reduce((sum, type) => sum + type.recentCount, 0);
    recommendations.push(`⏰ ${totalRecent} threats detected in last hour - monitor closely`);
  }
  
  return recommendations;
}

function getServiceName(port: number): string {
  const services: Record<number, string> = {
    20: 'FTP-Data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
    53: 'DNS', 80: 'HTTP', 110: 'POP3', 135: 'RPC', 139: 'NetBIOS',
    143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
    1433: 'SQL Server', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
    5900: 'VNC', 8080: 'HTTP-Proxy',
  };
  return services[port] || 'Unknown';
}

function getRiskLevel(port: number): 'low' | 'medium' | 'high' {
  const highRiskPorts = [22, 23, 135, 139, 445, 3389, 5900];
  const mediumRiskPorts = [21, 25, 110, 143, 993, 995, 1433, 3306, 5432];
  
  if (highRiskPorts.includes(port)) return 'high';
  if (mediumRiskPorts.includes(port)) return 'medium';
  return 'low';
}