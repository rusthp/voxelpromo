import { logger } from '../logger';

describe('Logger', () => {
  it('should have all required methods', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should log info messages', () => {
    // Winston logger doesn't use console directly, so we test that the method exists and can be called
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });

  it('should log error messages', () => {
    // Winston logger doesn't use console directly, so we test that the method exists and can be called
    expect(() => {
      logger.error('Test error message');
    }).not.toThrow();
  });
});

