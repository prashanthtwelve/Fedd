import { remainingMs, weeklyStats } from '../src/domain/model';
import { interestUrl, launchInstagram } from '../src/lib/instagram';
test('invalid hashtag characters skip directly to app home', async () => {
  const transport = {
    openTag: jest.fn(),
    openApp: jest.fn().mockResolvedValue(true),
    openBrowser: jest.fn(),
  };
  expect(await launchInstagram('Art & Design', transport)).toBe('app');
  expect(transport.openTag).not.toHaveBeenCalled();
});
test('remaining time is recomputed from persisted deadline, never negative', () => {
  expect(remainingMs(61000, 1000)).toBe(60000);
  expect(remainingMs(61000, 90000)).toBe(0);
});
test('interest link normalizes case, spaces and URL-encodes unsafe characters', () => {
  expect(interestUrl(' Color Grading ')).toBe(
    'https://www.instagram.com/explore/tags/colorgrading/',
  );
  expect(interestUrl('Art & Design')).toContain('art%26design/');
});
test('launch tries the interest link first', async () => {
  const transport = {
    openTag: jest.fn().mockResolvedValue(true),
    openApp: jest.fn(),
    openBrowser: jest.fn(),
  };
  expect(await launchInstagram('Film', transport)).toBe('tag');
  expect(transport.openApp).not.toHaveBeenCalled();
});
test('failed tag falls back to package home, then browser', async () => {
  const transport = {
    openTag: jest.fn().mockRejectedValue(new Error('no handler')),
    openApp: jest.fn().mockResolvedValue(false),
    openBrowser: jest.fn().mockResolvedValue(true),
  };
  expect(await launchInstagram('Film', transport)).toBe('browser');
  expect(transport.openBrowser).toHaveBeenCalledWith(
    'https://www.instagram.com/',
  );
});
test('feature flag can skip unofficial links; app home succeeds', async () => {
  const transport = {
    openTag: jest.fn(),
    openApp: jest.fn().mockResolvedValue(true),
    openBrowser: jest.fn(),
  };
  expect(await launchInstagram('Film', transport, false)).toBe('app');
  expect(transport.openTag).not.toHaveBeenCalled();
});
test('all handlers failing produces an actionable error', async () => {
  await expect(
    launchInstagram('Film', {
      openTag: async () => false,
      openApp: async () => false,
      openBrowser: async () => false,
    }),
  ).rejects.toThrow();
});
test('empty insight data has no fabricated wins', () => {
  expect(weeklyStats([])).toEqual({
    started: 0,
    found: 0,
    distracted: 0,
    ratio: 0,
  });
});
