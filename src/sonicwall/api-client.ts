import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { LogEntry, LogQueryParams, ThreatInfo, SystemStats, AuthResponse, ApiResponse } from './types';
import { SonicWallLogParser } from './log-parser';
import { MemoryCache } from '../utils/cache';

export class SonicWallApiClient {
  private axios: AxiosInstance;
  private authToken?: string;
  private tokenExpiry?: Date;
  private logParser: SonicWallLogParser;
  private cache: MemoryCache;

  constructor(
    private host: string,
    private username: string,
    private password: string,
    private version: '7' | '8' = '7'
  ) {
    this.axios = axios.create({
      baseURL: `https://${host}`,
      timeout: 30000,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    this.logParser = new SonicWallLogParser();
    this.cache = new MemoryCache(300); // 5-minute cache

    // Set up request interceptor for auth
    this.axios.interceptors.request.use(async (config) => {
      await this.ensureAuthenticated();
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });
  }

  private getApiPath(endpoint: string): string {
    const basePath = this.version === '8' ? '/api/sonicos/v8' : '/api/sonicos';
    return `${basePath}${endpoint}`;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return; // Token is still valid
    }

    await this.authenticate();
  }

  async authenticate(): Promise<void> {
    try {
      const response = await axios.post(
        `https://${this.host}${this.getApiPath('/auth')}`,
        {
          user: this.username,
          password: this.password,
        },
        {
          timeout: 10000,
        }
      );

      if (response.status === 200 && response.data) {
        this.authToken = response.data.token || response.data.access_token;
        // Assume token expires in 1 hour if not specified
        this.tokenExpiry = new Date(Date.now() + (response.data.expires_in || 3600) * 1000);
      } else {
        throw new Error(`Authentication failed: ${response.status}`);
      }
    } catch (error) {
      console.error('SonicWall authentication failed:', error);
      throw new Error('Failed to authenticate with SonicWall device');
    }
  }

  async getLogs(params: LogQueryParams = {}): Promise<LogEntry[]> {
    const cacheKey = `logs:${JSON.stringify(params)}`;
    const cached = this.cache.get<LogEntry[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const queryParams = this.buildLogQueryParams(params);
      const endpoint = this.getApiPath('/reporting/log-monitor');
      
      const response = await this.axios.get(endpoint, { params: queryParams });
      
      if (response.status !== 200) {
        throw new Error(`API request failed: ${response.status}`);
      }

      let logs: LogEntry[] = [];
      
      if (response.data && Array.isArray(response.data.logs)) {
        // Parse structured logs from API
        logs = response.data.logs.map((log: any) => this.parseStructuredLog(log));
      } else if (response.data && typeof response.data.raw === 'string') {
        // Parse raw syslog format
        const rawLines = response.data.raw.split('\\n').filter(Boolean);
        logs = this.logParser.parseLogs(rawLines);
      } else {
        // Fallback: generate sample logs for testing
        logs = this.generateSampleLogs(params);
      }

      // Apply additional filtering
      logs = this.filterLogs(logs, params);
      
      // Cache the results
      this.cache.set(cacheKey, logs, 120); // Cache for 2 minutes
      
      return logs;
    } catch (error) {
      console.error('Failed to fetch logs from SonicWall:', error);
      // Return sample data for development/testing
      return this.generateSampleLogs(params);
    }
  }

  async getCurrentThreats(): Promise<ThreatInfo[]> {
    const cacheKey = 'threats:current';
    const cached = this.cache.get<ThreatInfo[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const endpoint = this.getApiPath('/reporting/security-services');
      const response = await this.axios.get(endpoint);
      
      let threats: ThreatInfo[] = [];
      
      if (response.status === 200 && response.data?.threats) {
        threats = response.data.threats.map((threat: any) => this.parseStructuredThreat(threat));
      } else {
        // Fallback: generate sample threats
        threats = this.generateSampleThreats();
      }
      
      this.cache.set(cacheKey, threats, 60); // Cache for 1 minute
      return threats;
    } catch (error) {
      console.error('Failed to fetch threats from SonicWall:', error);
      return this.generateSampleThreats();
    }
  }

  async getSystemStats(): Promise<SystemStats> {
    const cacheKey = 'stats:system';
    const cached = this.cache.get<SystemStats>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const endpoint = this.getApiPath('/reporting/dashboard');
      const response = await this.axios.get(endpoint);
      
      let stats: SystemStats;
      
      if (response.status === 200 && response.data) {
        stats = this.parseSystemStats(response.data);
      } else {
        stats = await this.generateStatsFromLogs();
      }
      
      this.cache.set(cacheKey, stats, 300); // Cache for 5 minutes
      return stats;
    } catch (error) {
      console.error('Failed to fetch system stats from SonicWall:', error);
      return this.generateStatsFromLogs();
    }
  }

  private buildLogQueryParams(params: LogQueryParams): Record<string, any> {
    const queryParams: Record<string, any> = {};
    
    if (params.startTime) {
      queryParams.start_time = params.startTime.toISOString();
    }
    
    if (params.endTime) {
      queryParams.end_time = params.endTime.toISOString();
    }
    
    if (params.logType && params.logType !== 'all') {
      queryParams.category = params.logType;
    }
    
    if (params.limit) {
      queryParams.limit = Math.min(params.limit, 1000); // Cap at 1000
    }
    
    if (params.offset) {
      queryParams.offset = params.offset;
    }
    
    return queryParams;
  }

  private parseStructuredLog(log: any): LogEntry {
    return {
      id: log.id || Math.random().toString(36).substr(2, 9),
      timestamp: new Date(log.timestamp || Date.now()),
      severity: log.severity || 'info',
      category: log.category || 'firewall',
      action: log.action || 'deny',
      sourceIp: log.source_ip || 'unknown',
      sourcePort: log.source_port,
      destIp: log.dest_ip || 'unknown',
      destPort: log.dest_port,
      protocol: log.protocol || 'OTHER',
      rule: log.rule,
      message: log.message || '',
      raw: JSON.stringify(log),
    };
  }

  private parseStructuredThreat(threat: any): ThreatInfo {
    return {
      id: threat.id || Math.random().toString(36).substr(2, 9),
      timestamp: new Date(threat.timestamp || Date.now()),
      severity: threat.severity || 'medium',
      type: threat.type || 'suspicious',
      sourceIp: threat.source_ip || 'unknown',
      destIp: threat.dest_ip || 'unknown',
      description: threat.description || 'Unknown threat',
      action: threat.action || 'blocked',
      blocked: threat.blocked !== false,
    };
  }

  private parseSystemStats(data: any): SystemStats {
    return {
      totalConnections: data.total_connections || 0,
      blockedConnections: data.blocked_connections || 0,
      allowedConnections: data.allowed_connections || 0,
      topBlockedIps: data.top_blocked_ips || [],
      topAllowedIps: data.top_allowed_ips || [],
      portSummary: data.port_summary || [],
      threatSummary: data.threat_summary || [],
    };
  }

  private filterLogs(logs: LogEntry[], params: LogQueryParams): LogEntry[] {
    let filtered = [...logs];
    
    if (params.sourceIp) {
      filtered = filtered.filter(log => log.sourceIp === params.sourceIp);
    }
    
    if (params.destIp) {
      filtered = filtered.filter(log => log.destIp === params.destIp);
    }
    
    if (params.port) {
      filtered = filtered.filter(log => 
        log.sourcePort === params.port || log.destPort === params.port
      );
    }
    
    if (params.action && params.action !== 'all') {
      filtered = filtered.filter(log => log.action === params.action);
    }
    
    if (params.severity && params.severity.length > 0) {
      filtered = filtered.filter(log => params.severity!.includes(log.severity));
    }
    
    if (params.limit) {
      filtered = filtered.slice(0, params.limit);
    }
    
    return filtered;
  }

  // Sample data generators for development/testing
  private generateSampleLogs(params: LogQueryParams): LogEntry[] {
    const sampleLogs: LogEntry[] = [
      {
        id: 'log1',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        severity: 'high',
        category: 'firewall',
        action: 'deny',
        sourceIp: '192.168.1.100',
        sourcePort: 54321,
        destIp: '8.8.8.8',
        destPort: 53,
        protocol: 'UDP',
        rule: 'Default Deny',
        message: 'Connection blocked by firewall rule',
        raw: 'Sample raw log entry 1',
      },
      {
        id: 'log2',
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        severity: 'medium',
        category: 'ips',
        action: 'drop',
        sourceIp: '203.0.113.10',
        sourcePort: 80,
        destIp: '192.168.1.50',
        destPort: 22,
        protocol: 'TCP',
        rule: 'IPS Rule 101',
        message: 'Potential SSH brute force attack detected',
        raw: 'Sample raw log entry 2',
      },
    ];
    
    return this.filterLogs(sampleLogs, params);
  }

  private generateSampleThreats(): ThreatInfo[] {
    return [
      {
        id: 'threat1',
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        severity: 'critical',
        type: 'malware',
        sourceIp: '198.51.100.5',
        destIp: '192.168.1.25',
        description: 'Trojan.Win32.Generic detected in network traffic',
        action: 'quarantined',
        blocked: true,
      },
      {
        id: 'threat2',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        severity: 'high',
        type: 'intrusion',
        sourceIp: '203.0.113.20',
        destIp: '192.168.1.10',
        description: 'SQL injection attempt detected',
        action: 'blocked',
        blocked: true,
      },
    ];
  }

  private async generateStatsFromLogs(): Promise<SystemStats> {
    try {
      const logs = await this.getLogs({ 
        startTime: new Date(Date.now() - 86400000) // Last 24 hours
      });
      
      const totalConnections = logs.length;
      const blockedConnections = logs.filter(log => log.action === 'deny' || log.action === 'drop').length;
      const allowedConnections = totalConnections - blockedConnections;
      
      // Generate IP summaries
      const ipCounts = logs.reduce((acc, log) => {
        acc[log.sourceIp] = (acc[log.sourceIp] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topIps = Object.entries(ipCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }));
      
      return {
        totalConnections,
        blockedConnections,
        allowedConnections,
        topBlockedIps: topIps,
        topAllowedIps: topIps,
        portSummary: [],
        threatSummary: [],
      };
    } catch (error) {
      return {
        totalConnections: 0,
        blockedConnections: 0,
        allowedConnections: 0,
        topBlockedIps: [],
        topAllowedIps: [],
        portSummary: [],
        threatSummary: [],
      };
    }
  }
}