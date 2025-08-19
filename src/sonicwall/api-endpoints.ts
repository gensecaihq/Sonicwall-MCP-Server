/**
 * Comprehensive SonicWall API endpoints for SonicOS 7.x and 8.x
 * Based on official SonicWall API documentation and real-world implementations
 */

export interface SonicWallEndpoints {
  // Authentication
  auth: string;
  logout: string;
  
  // System Information
  systemInfo: string;
  systemStatus: string;
  interfaces: string;
  licenses: string;
  
  // Logging and Monitoring
  logs: string;
  logSettings: string;
  logCategories: string;
  syslogServers: string;
  
  // Security Services
  threats: string;
  intrusionPrevention: string;
  gatewayAntivirus: string;
  antiSpyware: string;
  contentFilter: string;
  
  // Reporting
  dashboard: string;
  statistics: string;
  reports: string;
  
  // Network Objects
  addressObjects: string;
  serviceObjects: string;
  
  // Firewall
  accessRules: string;
  natRules: string;
  
  // VPN
  vpnPolicies: string;
  vpnUsers: string;
  vpnStatus: string;
  
  // High Availability
  highAvailability: string;
  
  // Version-specific endpoints
  versionSpecific?: {
    // SonicOS 8.x specific
    cloudManagement?: string;
    advancedThreatProtection?: string;
    captureAtp?: string;
    nsm?: string;
    zeroTouch?: string;
  };
}

/**
 * SonicOS 7.x API Endpoints
 * Base path: /api/sonicos
 */
export const SONICOS_7_ENDPOINTS: SonicWallEndpoints = {
  // Authentication - Core endpoints for session management
  auth: '/api/sonicos/auth',
  logout: '/api/sonicos/auth', // DELETE method
  
  // System Information
  systemInfo: '/api/sonicos/reporting/system-info',
  systemStatus: '/api/sonicos/reporting/system-status', 
  interfaces: '/api/sonicos/reporting/interface',
  licenses: '/api/sonicos/reporting/license',
  
  // Logging and Monitoring
  logs: '/api/sonicos/reporting/log', // Main log endpoint
  logSettings: '/api/sonicos/log/settings',
  logCategories: '/api/sonicos/log/categories',
  syslogServers: '/api/sonicos/log/syslog-servers',
  
  // Security Services  
  threats: '/api/sonicos/reporting/security-services',
  intrusionPrevention: '/api/sonicos/security-services/intrusion-prevention',
  gatewayAntivirus: '/api/sonicos/security-services/gateway-anti-virus',
  antiSpyware: '/api/sonicos/security-services/anti-spyware',
  contentFilter: '/api/sonicos/security-services/content-filter',
  
  // Reporting and Statistics
  dashboard: '/api/sonicos/reporting/dashboard',
  statistics: '/api/sonicos/reporting/statistics',
  reports: '/api/sonicos/reporting',
  
  // Network Objects
  addressObjects: '/api/sonicos/address-objects',
  serviceObjects: '/api/sonicos/service-objects',
  
  // Firewall Rules
  accessRules: '/api/sonicos/access-rules',
  natRules: '/api/sonicos/nat-rules',
  
  // VPN
  vpnPolicies: '/api/sonicos/vpn/policies',
  vpnUsers: '/api/sonicos/users/local',
  vpnStatus: '/api/sonicos/reporting/vpn-status',
  
  // High Availability
  highAvailability: '/api/sonicos/high-availability'
};

/**
 * SonicOS 8.x API Endpoints  
 * Base path: /api/sonicos/v8
 * Includes all 7.x endpoints plus new features
 */
export const SONICOS_8_ENDPOINTS: SonicWallEndpoints = {
  // Authentication - Enhanced with session management
  auth: '/api/sonicos/v8/auth',
  logout: '/api/sonicos/v8/auth', // DELETE method
  
  // System Information - Enhanced reporting
  systemInfo: '/api/sonicos/v8/reporting/system-info',
  systemStatus: '/api/sonicos/v8/reporting/system-status',
  interfaces: '/api/sonicos/v8/reporting/interface', 
  licenses: '/api/sonicos/v8/reporting/license',
  
  // Logging and Monitoring - Enhanced with cloud integration
  logs: '/api/sonicos/v8/reporting/log',
  logSettings: '/api/sonicos/v8/log/settings', 
  logCategories: '/api/sonicos/v8/log/categories',
  syslogServers: '/api/sonicos/v8/log/syslog-servers',
  
  // Security Services - Enhanced threat protection
  threats: '/api/sonicos/v8/reporting/security-services',
  intrusionPrevention: '/api/sonicos/v8/security-services/intrusion-prevention',
  gatewayAntivirus: '/api/sonicos/v8/security-services/gateway-anti-virus', 
  antiSpyware: '/api/sonicos/v8/security-services/anti-spyware',
  contentFilter: '/api/sonicos/v8/security-services/content-filter',
  
  // Reporting and Statistics
  dashboard: '/api/sonicos/v8/reporting/dashboard',
  statistics: '/api/sonicos/v8/reporting/statistics',
  reports: '/api/sonicos/v8/reporting',
  
  // Network Objects
  addressObjects: '/api/sonicos/v8/address-objects',
  serviceObjects: '/api/sonicos/v8/service-objects',
  
  // Firewall Rules
  accessRules: '/api/sonicos/v8/access-rules',
  natRules: '/api/sonicos/v8/nat-rules',
  
  // VPN - Enhanced with cloud integration
  vpnPolicies: '/api/sonicos/v8/vpn/policies',
  vpnUsers: '/api/sonicos/v8/users/local',
  vpnStatus: '/api/sonicos/v8/reporting/vpn-status',
  
  // High Availability
  highAvailability: '/api/sonicos/v8/high-availability',
  
  // SonicOS 8.x Specific Features
  versionSpecific: {
    // Cloud Management (SonicOS 8.x only)
    cloudManagement: '/api/sonicos/v8/cloud-management',
    
    // Advanced Threat Protection (Enhanced in 8.x)
    advancedThreatProtection: '/api/sonicos/v8/security-services/capture-advanced-threat-protection',
    
    // Capture ATP (SonicOS 8.x specific)
    captureAtp: '/api/sonicos/v8/security-services/capture-atp',
    
    // NSM Integration (8.x specific)
    nsm: '/api/sonicos/v8/nsm',
    
    // Zero Touch Provisioning (8.x specific) 
    zeroTouch: '/api/sonicos/v8/zero-touch-provisioning'
  }
};

/**
 * Common query parameters for different endpoint types
 */
export const API_QUERY_PARAMS = {
  // Log retrieval parameters
  logs: {
    start: 'start-time',      // ISO 8601 format
    end: 'end-time',         // ISO 8601 format  
    category: 'category',     // firewall, vpn, ips, etc.
    priority: 'priority',     // 0-7 (0=emergency, 7=debug)
    facility: 'facility',     // syslog facility
    count: 'count',          // number of entries
    offset: 'offset'         // pagination offset
  },
  
  // Statistics parameters
  statistics: {
    interval: 'interval',     // time interval
    type: 'type',            // statistics type
    duration: 'duration'     // time duration
  },
  
  // Security service parameters
  security: {
    service: 'service',       // which security service
    status: 'status',        // service status
    policy: 'policy'         // policy name
  }
};

/**
 * HTTP methods for different operations
 */
export const HTTP_METHODS = {
  // Authentication
  login: 'POST',            // /auth with credentials
  logout: 'DELETE',         // /auth with token
  
  // Data retrieval
  getLogs: 'GET',           // /reporting/log
  getStats: 'GET',          // /reporting/statistics  
  getStatus: 'GET',         // /reporting/system-status
  
  // Configuration (if needed for advanced features)
  updateConfig: 'PUT',      // configuration updates
  createObject: 'POST',     // create network objects
  deleteObject: 'DELETE'    // delete objects
};

/**
 * Response content types by endpoint
 */
export const CONTENT_TYPES = {
  json: 'application/json',
  xml: 'application/xml',
  csv: 'text/csv',
  text: 'text/plain'
};

/**
 * Authentication methods supported by SonicOS versions
 */
export const AUTH_METHODS = {
  '7': {
    basic: true,              // HTTP Basic Auth
    chap: true,              // CHAP + Basic
    digest: false            // Not commonly supported
  },
  '8': {
    basic: true,              // HTTP Basic Auth  
    chap: true,              // CHAP + Basic
    oauth: true,             // OAuth 2.0 (8.x enhancement)
    session: true            // Session-based auth
  }
};

/**
 * Rate limits and timeouts by endpoint type
 */
export const ENDPOINT_LIMITS = {
  // Authentication endpoints
  auth: {
    rateLimit: 10,           // per minute
    timeout: 10000           // 10 seconds
  },
  
  // Log retrieval endpoints  
  logs: {
    rateLimit: 30,           // per minute
    timeout: 60000,          // 60 seconds
    maxRecords: 10000        // per request
  },
  
  // Statistics endpoints
  statistics: {
    rateLimit: 60,           // per minute
    timeout: 30000           // 30 seconds
  },
  
  // System info endpoints
  system: {
    rateLimit: 120,          // per minute  
    timeout: 15000           // 15 seconds
  }
};

/**
 * Error codes specific to SonicWall API
 */
export const SONICWALL_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'E_INVALID_LOGIN',
  SESSION_EXPIRED: 'E_SESSION_EXPIRED',
  ACCOUNT_LOCKED: 'E_ACCOUNT_LOCKED',
  
  // API errors
  INVALID_PARAMS: 'E_INVALID_PARAMS',
  RESOURCE_NOT_FOUND: 'E_NOT_FOUND',
  RATE_LIMITED: 'E_RATE_LIMITED',
  
  // System errors
  SYSTEM_OVERLOAD: 'E_SYSTEM_BUSY',
  MAINTENANCE_MODE: 'E_MAINTENANCE'
};

/**
 * Get endpoints for specific SonicOS version
 */
export function getEndpoints(version: '7' | '8'): SonicWallEndpoints {
  return version === '8' ? SONICOS_8_ENDPOINTS : SONICOS_7_ENDPOINTS;
}

/**
 * Check if endpoint is available in specific version
 */
export function isEndpointAvailable(endpoint: string, version: '7' | '8'): boolean {
  const endpoints = getEndpoints(version);
  const endpointValues = Object.values(endpoints).flat();
  
  // Check version-specific endpoints
  if (endpoints.versionSpecific) {
    endpointValues.push(...Object.values(endpoints.versionSpecific).filter(Boolean) as string[]);
  }
  
  return endpointValues.includes(endpoint);
}

/**
 * Get version-appropriate base URL
 */
export function getBaseUrl(host: string, version: '7' | '8', useHttps: boolean = true): string {
  const protocol = useHttps ? 'https' : 'http';
  const port = useHttps ? '' : ':80'; // Default ports
  
  return `${protocol}://${host}${port}`;
}

/**
 * Validate API response structure
 */
export interface SonicWallApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  version?: string;
}