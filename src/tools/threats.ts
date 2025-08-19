import { SonicWallApiClient } from '../sonicwall/api-client';
import { ThreatInfo } from '../sonicwall/types';

export interface GetThreatsInput {
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'all';
  limit?: number;
}

export interface GetThreatsOutput {
  threats: ThreatInfo[];
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    blocked: number;
    allowed: number;
  };
  recommendations: string[];
}

export async function getThreats(
  client: SonicWallApiClient,
  input: GetThreatsInput = {}
): Promise<GetThreatsOutput> {
  const { severity = 'all', limit = 50 } = input;

  // Get current threats from SonicWall
  const allThreats = await client.getCurrentThreats();
  
  // Filter by severity if specified
  let threats = allThreats;
  if (severity !== 'all') {
    threats = allThreats.filter(threat => threat.severity === severity);
  }
  
  // Apply limit
  threats = threats.slice(0, limit);

  // Generate summary statistics
  const summary = generateThreatSummary(allThreats);
  
  // Generate recommendations
  const recommendations = generateThreatRecommendations(allThreats, summary);

  return {
    threats: threats.sort((a, b) => {
      // Sort by severity priority, then by timestamp
      const severityPriority = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const aPriority = severityPriority[a.severity] || 0;
      const bPriority = severityPriority[b.severity] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.timestamp.getTime() - a.timestamp.getTime();
    }),
    summary,
    recommendations,
  };
}

function generateThreatSummary(threats: ThreatInfo[]) {
  const summary = {
    total: threats.length,
    bySeverity: {} as Record<string, number>,
    byType: {} as Record<string, number>,
    blocked: 0,
    allowed: 0,
  };

  threats.forEach(threat => {
    // Count by severity
    summary.bySeverity[threat.severity] = (summary.bySeverity[threat.severity] || 0) + 1;
    
    // Count by type
    summary.byType[threat.type] = (summary.byType[threat.type] || 0) + 1;
    
    // Count blocked vs allowed
    if (threat.blocked) {
      summary.blocked++;
    } else {
      summary.allowed++;
    }
  });

  return summary;
}

function generateThreatRecommendations(threats: ThreatInfo[], summary: any): string[] {
  const recommendations: string[] = [];
  
  // Critical threat recommendations
  const criticalThreats = summary.bySeverity['critical'] || 0;
  if (criticalThreats > 0) {
    recommendations.push(`🚨 ${criticalThreats} critical threats detected - immediate action required`);
  }
  
  // High threat recommendations
  const highThreats = summary.bySeverity['high'] || 0;
  if (highThreats > 5) {
    recommendations.push(`⚠️  ${highThreats} high-severity threats - review and investigate`);
  }
  
  // Malware recommendations
  const malwareCount = summary.byType['malware'] || 0;
  if (malwareCount > 0) {
    recommendations.push(`🦠 ${malwareCount} malware detections - ensure endpoint protection is active`);
  }
  
  // Intrusion recommendations
  const intrusionCount = summary.byType['intrusion'] || 0;
  if (intrusionCount > 0) {
    recommendations.push(`🔓 ${intrusionCount} intrusion attempts - review access controls and authentication`);
  }
  
  // Botnet recommendations
  const botnetCount = summary.byType['botnet'] || 0;
  if (botnetCount > 0) {
    recommendations.push(`🤖 ${botnetCount} botnet activities - check for compromised internal hosts`);
  }
  
  // Unblocked threats
  if (summary.allowed > 0) {
    recommendations.push(`❗ ${summary.allowed} threats were not blocked - review security policies`);
  }
  
  // Recent threat activity
  const recentThreats = threats.filter(threat => 
    threat.timestamp > new Date(Date.now() - 3600000) // Last hour
  );
  if (recentThreats.length > 10) {
    recommendations.push(`📈 High threat activity in last hour (${recentThreats.length} threats) - monitor closely`);
  }
  
  // Source IP analysis
  const sourceIpCounts = threats.reduce((acc, threat) => {
    acc[threat.sourceIp] = (acc[threat.sourceIp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topThreatSources = Object.entries(sourceIpCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);
  
  if (topThreatSources.length > 0 && topThreatSources[0]![1] > 5) {
    const [ip, count] = topThreatSources[0]!;
    recommendations.push(`🎯 IP ${ip} is responsible for ${count} threats - consider blocking`);
  }
  
  // General security posture
  if (threats.length === 0) {
    recommendations.push(`✅ No active threats detected - maintain current security posture`);
  } else {
    const blockedPercentage = Math.round((summary.blocked / summary.total) * 100);
    recommendations.push(`🛡️  Threat blocking effectiveness: ${blockedPercentage}%`);
  }
  
  return recommendations;
}