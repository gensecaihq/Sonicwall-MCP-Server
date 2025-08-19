export interface LogEntry {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'firewall' | 'vpn' | 'ips' | 'antivirus' | 'system';
  action: 'allow' | 'deny' | 'drop' | 'reset';
  sourceIp: string;
  sourcePort?: number | undefined;
  destIp: string;
  destPort?: number | undefined;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'OTHER';
  rule?: string | undefined;
  message: string;
  raw: string;
  // SonicOS 8.x specific fields
  cloudId?: string | undefined;
  tenantId?: string | undefined;
  fileHash?: string | undefined;
  threatName?: string | undefined;
  analysisTime?: number | undefined;
}

export interface ThreatInfo {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'malware' | 'intrusion' | 'botnet' | 'spam' | 'suspicious';
  sourceIp: string;
  destIp: string;
  description: string;
  action: string;
  blocked: boolean;
}

export interface SystemStats {
  totalConnections: number;
  blockedConnections: number;
  allowedConnections: number;
  topBlockedIps: Array<{ ip: string; count: number }>;
  topAllowedIps: Array<{ ip: string; count: number }>;
  portSummary: Array<{ port: number; protocol: string; count: number }>;
  threatSummary: Array<{ type: string; count: number }>;
}

export interface LogQueryParams {
  startTime?: Date;
  endTime?: Date;
  logType?: 'firewall' | 'vpn' | 'ips' | 'antivirus' | 'system' | 'all';
  severity?: string[];
  sourceIp?: string;
  destIp?: string;
  port?: number;
  action?: 'allow' | 'deny' | 'all';
  limit?: number;
  offset?: number;
}

export interface AuthResponse {
  token: string;
  expiry: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}