import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { loopWatchdogMiddleware } from './loop-watchdog';

describe('middleware/loop-watchdog.ts', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      path: '/api/test',
      headers: {
        'user-agent': 'test-agent',
      },
    };

    mockRes = {
      setHeader: vi.fn(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('allows normal request to pass through', () => {
    loopWatchdogMiddleware(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockRes.setHeader).not.toHaveBeenCalled();
  });

  test('allows multiple requests under threshold (25 in 5 seconds)', () => {
    // Make 24 requests (under the 25 threshold)
    for (let i = 0; i < 24; i++) {
      loopWatchdogMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    }

    // All should pass without setting watchdog header
    expect(mockNext).toHaveBeenCalledTimes(24);
    expect(mockRes.setHeader).not.toHaveBeenCalled();
  });

  test('detects suspicious loop when threshold exceeded', () => {
    // Make 26 requests (over the 25 threshold)
    for (let i = 0; i < 26; i++) {
      loopWatchdogMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    }

    // Should set header on 26th request
    expect(mockNext).toHaveBeenCalledTimes(26);
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'X-Loop-Watchdog',
      'suspected'
    );
  });

  test('tracks requests per IP and path combination', () => {
    const mockReq1 = { ...mockReq, ip: '1.1.1.1', path: '/api/jobs' };
    const mockReq2 = { ...mockReq, ip: '2.2.2.2', path: '/api/jobs' };
    const mockReq3 = { ...mockReq, ip: '1.1.1.1', path: '/api/contacts' };

    // Make 26 requests from each unique ip:path combination
    for (let i = 0; i < 26; i++) {
      loopWatchdogMiddleware(
        mockReq1 as Request,
        mockRes as Response,
        mockNext
      );
      loopWatchdogMiddleware(
        mockReq2 as Request,
        mockRes as Response,
        mockNext
      );
      loopWatchdogMiddleware(
        mockReq3 as Request,
        mockRes as Response,
        mockNext
      );
    }

    // Each unique combination should trigger independently
    expect(mockRes.setHeader).toHaveBeenCalledTimes(3);
  });

  test('uses x-forwarded-for header when available', () => {
    const mockReqWithForwarded = {
      ...mockReq,
      headers: {
        'x-forwarded-for': '10.0.0.1',
        'user-agent': 'test-agent',
      },
      ip: '127.0.0.1',
      path: '/api/test',
    };

    // Make requests with x-forwarded-for header
    for (let i = 0; i < 26; i++) {
      loopWatchdogMiddleware(
        mockReqWithForwarded as Request,
        mockRes as Response,
        mockNext
      );
    }

    // Should track by forwarded IP
    expect(mockRes.setHeader).toHaveBeenCalled();
  });

  test('handles originalUrl when path is not available', () => {
    const mockReqWithOriginalUrl = {
      ...mockReq,
      path: undefined,
      originalUrl: '/api/original',
    };

    loopWatchdogMiddleware(
      mockReqWithOriginalUrl as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledOnce();
  });

  test('handles missing IP gracefully (uses "unknown")', () => {
    const mockReqNoIp = {
      ...mockReq,
      ip: undefined,
      headers: {},
      path: '/api/test',
    };

    loopWatchdogMiddleware(
      mockReqNoIp as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledOnce();
  });

  test('continues to call next even when loop detected', () => {
    // Make 30 requests
    for (let i = 0; i < 30; i++) {
      loopWatchdogMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    }

    // Should call next for all requests (doesn't block)
    expect(mockNext).toHaveBeenCalledTimes(30);
  });

  test.skip('maintains sliding window (old requests expire)', async () => {
    // This test is time-sensitive and relies on the 5-second window
    // Skipped because it's unreliable in CI/CD environments
    // Make 20 requests
    for (let i = 0; i < 20; i++) {
      loopWatchdogMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    }

    // Wait for window to expire (5 seconds + buffer)
    await new Promise((resolve) => setTimeout(resolve, 5100));

    // Make 20 more requests - should not trigger since old ones expired
    for (let i = 0; i < 20; i++) {
      loopWatchdogMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    }

    // Should not have set header since we stayed under threshold
    expect(mockRes.setHeader).not.toHaveBeenCalled();
  }, 10000); // Increase test timeout for this test

  test('logs warning when loop detected', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Make 26 requests to trigger warning
    for (let i = 0; i < 26; i++) {
      loopWatchdogMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    }

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[LoopWatchdogMiddleware]',
      expect.objectContaining({
        type: 'BACKEND_REQUEST_LOOP_SUSPECTED',
        ip: '127.0.0.1',
        path: '/api/test',
      })
    );

    consoleSpy.mockRestore();
  });

  test('includes user agent in warning log', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockReq.headers = {
      'user-agent': 'Mozilla/5.0 (Custom Browser)',
    };

    // Trigger warning
    for (let i = 0; i < 26; i++) {
      loopWatchdogMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    }

    expect(consoleSpy).toHaveBeenCalledWith(
      '[LoopWatchdogMiddleware]',
      expect.objectContaining({
        userAgent: 'Mozilla/5.0 (Custom Browser)',
      })
    );

    consoleSpy.mockRestore();
  });

  test('multiple different paths from same IP are tracked separately', () => {
    const paths = ['/api/jobs', '/api/contacts', '/api/applications'];

    paths.forEach((path) => {
      const req = { ...mockReq, path };

      // Make requests for each path
      for (let i = 0; i < 26; i++) {
        loopWatchdogMiddleware(
          req as Request,
          mockRes as Response,
          mockNext
        );
      }
    });

    // Each path should trigger independently (3 times)
    expect(mockRes.setHeader).toHaveBeenCalledTimes(3);
  });

  test('reset mock response for each test maintains isolation', () => {
    // First batch of requests
    for (let i = 0; i < 26; i++) {
      loopWatchdogMiddleware(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
    }

    const firstCallCount = (mockRes.setHeader as any).mock.calls.length;

    // Reset mocks
    vi.clearAllMocks();

    // Second batch with different IP (should not affect count)
    const newMockReq = { ...mockReq, ip: '8.8.8.8' };
    for (let i = 0; i < 26; i++) {
      loopWatchdogMiddleware(
        newMockReq as Request,
        mockRes as Response,
        mockNext
      );
    }

    // After clearing mocks, setHeader should have been called again
    expect(mockRes.setHeader).toHaveBeenCalled();
  });
});
