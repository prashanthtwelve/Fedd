import { tokens } from '../src/theme/tokens';
test('Android controls remain accessible and brand palette follows Stitch', () => {
  expect(tokens.size.minTouchTarget).toBeGreaterThanOrEqual(44);
  expect(tokens.colors.background).toBe('#f7faf8');
});
