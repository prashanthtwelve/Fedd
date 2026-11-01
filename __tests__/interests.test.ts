import { copy } from '../src/copy';
import {
  PRESETS,
  pickerValid,
  togglePreset,
  savePresets,
  validateCustom,
  toggleSession,
  selectNewCustom,
  joinInterests,
} from '../src/domain/interests';
const ids = PRESETS.slice(0, 3).map(p => p.id);
const custom = {
  id: 'custom-1',
  name: 'Architecture',
  icon: 'sparkles',
  isCustom: true,
};
test('picker only exposes presets and cannot toggle a custom ID', () => {
  expect(PRESETS.every(p => !p.isCustom)).toBe(true);
  expect(PRESETS.some(p => p.name === 'Add your own')).toBe(false);
  expect(togglePreset(ids, custom.id)).toEqual(ids);
});
test('picker requires 3 to 5 unique presets', () => {
  expect(pickerValid(ids.slice(0, 2))).toBe(false);
  expect(pickerValid(ids)).toBe(true);
  expect(pickerValid(PRESETS.slice(0, 5).map(p => p.id))).toBe(true);
  expect(pickerValid(PRESETS.slice(0, 6).map(p => p.id))).toBe(false);
  expect(pickerValid([ids[0], ids[0], ids[0]])).toBe(false);
});
test('picker stops new selections at five, but permits deselection', () => {
  const five = PRESETS.slice(0, 5).map(p => p.id);
  expect(togglePreset(five, PRESETS[5].id)).toEqual(five);
  expect(togglePreset(five, five[0])).toHaveLength(4);
});
test('custom validation rejects empty, long, duplicate and excess names', () => {
  expect(validateCustom('Tea\nCoffee', [])).toBe(copy.custom.invalidName);
  expect(validateCustom('Tea\u0000', [])).toBe(copy.custom.invalidName);
  expect(validateCustom(' ', [])).toBe(copy.custom.empty);
  expect(validateCustom('x'.repeat(25), [])).toBe(copy.custom.long);
  expect(validateCustom(' filmmaking ', [])).toBe(copy.custom.duplicate);
  expect(validateCustom(' ARCHITECTURE ', [custom])).toBe(
    copy.custom.duplicate,
  );
  expect(
    validateCustom(
      'Sculpture',
      Array.from({ length: 10 }, (_, i) => ({
        ...custom,
        name: `Custom ${i}`,
      })),
    ),
  ).toBe(copy.custom.limit);
  expect(validateCustom('Sculpture', [custom])).toBeNull();
});
test('Home permits at most three and supports deselection', () => {
  expect(toggleSession(ids, 'fourth')).toEqual(ids);
  expect(toggleSession(ids, ids[0])).toHaveLength(2);
  expect(selectNewCustom(ids, custom.id)).toEqual([ids[0], ids[1], custom.id]);
});
test('Settings preserves custom interests when editing presets', () => {
  expect(savePresets([...PRESETS.slice(0, 4), custom], ids)).toEqual([
    ...PRESETS.slice(0, 3),
    custom,
  ]);
});
test('handoff joins one, two and three names', () => {
  expect(joinInterests(['A'])).toBe('A');
  expect(joinInterests(['A', 'B'])).toBe('A and B');
  expect(joinInterests(['A', 'B', 'C'])).toBe('A, B and C');
});
