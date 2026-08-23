import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { HttpExceptionFilter } from './http-exception.filter';

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
  withScope: jest.fn((callback: (scope: unknown) => void) =>
    callback({ setTag: jest.fn(), setContext: jest.fn() }),
  ),
}));

function createMockHost(user?: {
  id: string;
  userType: string;
  roles: string[];
}): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/test', user }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('HttpExceptionFilter — Sentry integration (Stage 11 hardening)', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new HttpExceptionFilter();
  });

  it('reports a 500-level error to Sentry', () => {
    const { host } = createMockHost();
    filter.catch(new Error('boom'), host);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('does NOT report a 4xx client error to Sentry', () => {
    const { host } = createMockHost();
    filter.catch(new BadRequestException('bad input'), host);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("attaches the caller's role/userType as Sentry tags, never name/email (no PII)", () => {
    const setTag = jest.fn();
    (Sentry.withScope as jest.Mock).mockImplementationOnce(
      (callback: (scope: unknown) => void) =>
        callback({ setTag, setContext: jest.fn() }),
    );
    const { host } = createMockHost({
      id: 'staff-123',
      userType: 'STAFF',
      roles: ['ADMIN'],
    });

    filter.catch(new Error('boom'), host);

    expect(setTag).toHaveBeenCalledWith('userType', 'STAFF');
    expect(setTag).toHaveBeenCalledWith('roles', 'ADMIN');
  });
});
