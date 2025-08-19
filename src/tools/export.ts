import { SonicWallApiClient } from '../sonicwall/api-client';
import { LogEntry, LogQueryParams } from '../sonicwall/types';

export interface ExportLogsInput {
  format: 'json' | 'csv';
  filters?: {
    startTime?: string;
    endTime?: string;
    severity?: string[];
    logType?: 'firewall' | 'vpn' | 'ips' | 'all';
    sourceIp?: string;
    destIp?: string;
    action?: 'allow' | 'deny' | 'all';
  };
  limit?: number;
}

export interface ExportLogsOutput {
  format: string;
  data: string;
  metadata: {
    totalRecords: number;
    exportedRecords: number;
    timeRange: {
      start: string;
      end: string;
    };
    filters: any;
    exportTime: string;
  };
}

export async function exportLogs(
  client: SonicWallApiClient,
  input: ExportLogsInput
): Promise<ExportLogsOutput> {
  const { format, filters = {}, limit = 10000 } = input;

  // Build query parameters from filters
  const queryParams: LogQueryParams = {
    startTime: filters.startTime ? new Date(filters.startTime) : new Date(Date.now() - 86400000), // Default: last 24h
    endTime: filters.endTime ? new Date(filters.endTime) : new Date(),
    logType: filters.logType === 'all' ? undefined : filters.logType,
    sourceIp: filters.sourceIp,
    destIp: filters.destIp,
    action: filters.action === 'all' ? undefined : filters.action,
    severity: filters.severity,
    limit: Math.min(limit, 50000), // Cap at 50k records for performance
  };

  // Get logs from SonicWall
  const logs = await client.getLogs(queryParams);

  // Apply additional filtering if needed
  const filteredLogs = applyAdditionalFilters(logs, filters);

  let exportData: string;
  
  switch (format) {
    case 'json':
      exportData = exportToJson(filteredLogs);
      break;
    case 'csv':
      exportData = exportToCsv(filteredLogs);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  const metadata = {
    totalRecords: logs.length,
    exportedRecords: filteredLogs.length,
    timeRange: {
      start: queryParams.startTime?.toISOString() || '',
      end: queryParams.endTime?.toISOString() || '',
    },
    filters,
    exportTime: new Date().toISOString(),
  };

  return {
    format,
    data: exportData,
    metadata,
  };
}

function applyAdditionalFilters(logs: LogEntry[], filters: any): LogEntry[] {
  let filtered = [...logs];

  // Apply severity filter
  if (filters.severity && Array.isArray(filters.severity) && filters.severity.length > 0) {
    filtered = filtered.filter(log => filters.severity.includes(log.severity));
  }

  return filtered;
}

function exportToJson(logs: LogEntry[]): string {
  const exportObject = {
    metadata: {
      exportVersion: '1.0',
      recordCount: logs.length,
      exportTimestamp: new Date().toISOString(),
      source: 'SonicWall MCP Server',
    },
    logs: logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      severity: log.severity,
      category: log.category,
      action: log.action,
      sourceIp: log.sourceIp,
      sourcePort: log.sourcePort || null,
      destIp: log.destIp,
      destPort: log.destPort || null,
      protocol: log.protocol,
      rule: log.rule || null,
      message: log.message,
      raw: log.raw,
    })),
  };

  return JSON.stringify(exportObject, null, 2);
}

function exportToCsv(logs: LogEntry[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Severity',
    'Category',
    'Action',
    'Source IP',
    'Source Port',
    'Destination IP',
    'Destination Port',
    'Protocol',
    'Rule',
    'Message',
    'Raw Log'
  ];

  const csvRows: string[] = [];
  
  // Add header row
  csvRows.push(headers.map(header => `"${header}"`).join(','));

  // Add data rows
  logs.forEach(log => {
    const row = [
      log.id,
      log.timestamp.toISOString(),
      log.severity,
      log.category,
      log.action,
      log.sourceIp,
      log.sourcePort?.toString() || '',
      log.destIp,
      log.destPort?.toString() || '',
      log.protocol,
      log.rule || '',
      escapeCsvValue(log.message),
      escapeCsvValue(log.raw),
    ];

    csvRows.push(row.map(value => `"${value}"`).join(','));
  });

  return csvRows.join('\\n');
}

function escapeCsvValue(value: string): string {
  if (!value) return '';
  
  // Escape quotes by doubling them and handle newlines
  return value
    .replace(/"/g, '""')
    .replace(/\\r\\n|\\r|\\n/g, ' ')
    .trim();
}

// Additional export utilities

export function createExportSummary(logs: LogEntry[]): any {
  const summary = {
    recordCount: logs.length,
    timeRange: {
      earliest: logs.length > 0 ? Math.min(...logs.map(l => l.timestamp.getTime())) : null,
      latest: logs.length > 0 ? Math.max(...logs.map(l => l.timestamp.getTime())) : null,
    },
    severityBreakdown: {} as Record<string, number>,
    categoryBreakdown: {} as Record<string, number>,
    actionBreakdown: {} as Record<string, number>,
    protocolBreakdown: {} as Record<string, number>,
    topSourceIps: [] as Array<{ ip: string; count: number }>,
    topDestIps: [] as Array<{ ip: string; count: number }>,
    topPorts: [] as Array<{ port: number; count: number }>,
  };

  // Calculate breakdowns
  logs.forEach(log => {
    summary.severityBreakdown[log.severity] = (summary.severityBreakdown[log.severity] || 0) + 1;
    summary.categoryBreakdown[log.category] = (summary.categoryBreakdown[log.category] || 0) + 1;
    summary.actionBreakdown[log.action] = (summary.actionBreakdown[log.action] || 0) + 1;
    summary.protocolBreakdown[log.protocol] = (summary.protocolBreakdown[log.protocol] || 0) + 1;
  });

  // Calculate top IPs
  const sourceIpCounts = logs.reduce((acc, log) => {
    acc[log.sourceIp] = (acc[log.sourceIp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  summary.topSourceIps = Object.entries(sourceIpCounts)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const destIpCounts = logs.reduce((acc, log) => {
    acc[log.destIp] = (acc[log.destIp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  summary.topDestIps = Object.entries(destIpCounts)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Calculate top ports
  const portCounts = logs.reduce((acc, log) => {
    if (log.destPort) {
      acc[log.destPort] = (acc[log.destPort] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  summary.topPorts = Object.entries(portCounts)
    .map(([port, count]) => ({ port: parseInt(port), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Convert timestamps to readable format
  if (summary.timeRange.earliest) {
    summary.timeRange.earliest = new Date(summary.timeRange.earliest).toISOString();
  }
  if (summary.timeRange.latest) {
    summary.timeRange.latest = new Date(summary.timeRange.latest).toISOString();
  }

  return summary;
}

export function validateExportFilters(filters: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (filters.startTime) {
    const startTime = new Date(filters.startTime);
    if (isNaN(startTime.getTime())) {
      errors.push('Invalid startTime format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)');
    }
  }

  if (filters.endTime) {
    const endTime = new Date(filters.endTime);
    if (isNaN(endTime.getTime())) {
      errors.push('Invalid endTime format. Use ISO 8601 format (e.g., 2024-01-01T23:59:59Z)');
    }
  }

  if (filters.startTime && filters.endTime) {
    const start = new Date(filters.startTime);
    const end = new Date(filters.endTime);
    if (start > end) {
      errors.push('startTime must be before endTime');
    }
  }

  if (filters.severity && Array.isArray(filters.severity)) {
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    const invalidSeverities = filters.severity.filter((s: string) => !validSeverities.includes(s));
    if (invalidSeverities.length > 0) {
      errors.push(`Invalid severity values: ${invalidSeverities.join(', ')}`);
    }
  }

  if (filters.logType) {
    const validLogTypes = ['firewall', 'vpn', 'ips', 'all'];
    if (!validLogTypes.includes(filters.logType)) {
      errors.push(`Invalid logType. Must be one of: ${validLogTypes.join(', ')}`);
    }
  }

  if (filters.action) {
    const validActions = ['allow', 'deny', 'all'];
    if (!validActions.includes(filters.action)) {
      errors.push(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}