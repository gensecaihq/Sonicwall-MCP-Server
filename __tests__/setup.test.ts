/**
 * Basic test setup and smoke tests for SonicWall MCP Server
 * 
 * These tests verify that the core modules can be imported and initialized
 * without errors. They do not require a live SonicWall device.
 */

describe('SonicWall MCP Server - Basic Setup', () => {
  test('should import core modules without errors', async () => {
    // Test that main modules can be imported
    expect(() => require('../src/sonicwall/types')).not.toThrow();
    expect(() => require('../src/utils/config')).not.toThrow();
    expect(() => require('../src/utils/cache')).not.toThrow();
  });

  test('should have valid package.json configuration', () => {
    const pkg = require('../package.json');
    
    expect(pkg.name).toBe('sonicwall-mcp-server');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.main).toBe('dist/server.js');
    expect(pkg.license).toBe('MIT');
    
    // Check required dependencies
    expect(pkg.dependencies['@modelcontextprotocol/sdk']).toBeDefined();
    expect(pkg.dependencies['express']).toBeDefined();
    expect(pkg.dependencies['axios']).toBeDefined();
  });

  test('should have proper TypeScript configuration', () => {
    const tsconfig = require('../tsconfig.json');
    
    // Note: strict mode temporarily disabled for development
    expect(tsconfig.compilerOptions.strict).toBe(false);
    expect(tsconfig.compilerOptions.target).toBe('ES2022');
    expect(tsconfig.compilerOptions.outDir).toBe('./dist');
  });
});

describe('Configuration Validation', () => {
  test('should validate environment variables structure', () => {
    const { appConfig } = require('../src/utils/config');
    
    // Test that config structure exists
    expect(appConfig).toBeDefined();
    expect(appConfig.sonicwall).toBeDefined();
    expect(appConfig.server).toBeDefined();
    expect(appConfig.cache).toBeDefined();
    
    // Auth is optional based on environment
    if (process.env.MCP_BEARER_TOKEN) {
      expect(appConfig.auth).toBeDefined();
    }
  });
});

describe('MCP Protocol Compliance', () => {
  test('should use correct MCP protocol version', async () => {
    const { LATEST_PROTOCOL_VERSION } = require('@modelcontextprotocol/sdk/types.js');
    
    expect(LATEST_PROTOCOL_VERSION).toBe('2025-06-18');
  });

  test('should have required MCP tool schemas', () => {
    // Test that we can access MCP types without errors
    const types = require('@modelcontextprotocol/sdk/types.js');
    
    expect(types.CallToolRequestSchema).toBeDefined();
    expect(types.ListToolsRequestSchema).toBeDefined();
    expect(types.InitializeRequestSchema).toBeDefined();
  });
});

/**
 * Note: Integration tests with actual SonicWall devices should be added
 * in a separate test file (e.g., integration.test.ts) and run only
 * when appropriate test credentials and network access are available.
 */