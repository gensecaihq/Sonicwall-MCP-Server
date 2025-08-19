// Jest setup file for environment configuration

// Set required environment variables for testing
process.env.SONICWALL_HOST = 'test.example.com';
process.env.SONICWALL_USERNAME = 'test-user';
process.env.SONICWALL_PASSWORD = 'test-password';
process.env.SONICWALL_VERSION = '7';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.NODE_ENV = 'test';