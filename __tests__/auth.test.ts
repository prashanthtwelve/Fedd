import {
  makeNameProfile,
  validateBackupPassword,
  validatePin,
  validateProfileName,
} from '../src/services/auth';

test('a local profile contains only the trimmed name, without mock credentials', () => {
  expect(makeNameProfile('  TestUser  ')).toEqual({ name: 'TestUser' });
  expect(makeNameProfile('李 小明')).toEqual({ name: '李 小明' });
});

test.each(['', '  ', 'x'.repeat(61), 'Ada\n', 'Ada\u0000', 'Ada\u007f'])(
  'empty, oversized and control-character names are rejected (%j)',
  name => {
    expect(validateProfileName(name)).not.toBeNull();
    expect(() => makeNameProfile(name)).toThrow();
  },
);

test.each(['A', 'x'.repeat(60), '  Grace Hopper  '])(
  'names accept inclusive boundaries and ordinary spaces (%s)',
  name => expect(validateProfileName(name)).toBeNull(),
);

test.each(['123456', '012345678901'])(
  'PIN accepts 6 to 12 ASCII digits without changing leading zeroes (%s)',
  pin => expect(validatePin(pin)).toBeNull(),
);

test.each([
  '',
  '12345',
  '1234567890123',
  '12x456',
  ' 123456',
  '123456 ',
  '１２３４５６',
])('invalid PIN format is rejected (%j)', pin =>
  expect(validatePin(pin)).not.toBeNull(),
);

test('backup passwords accept 10 to 128 characters and preserve intentional spaces', () => {
  expect(validateBackupPassword('correct horse battery')).toBeNull();
  expect(validateBackupPassword(' leading space')).toBeNull();
  expect(validateBackupPassword('x'.repeat(10))).toBeNull();
  expect(validateBackupPassword('x'.repeat(128))).toBeNull();
});

test.each(['', '123456789', 'x'.repeat(129), ' '.repeat(10)])(
  'short, oversized and blank backup passwords are rejected (%j)',
  password => expect(validateBackupPassword(password)).not.toBeNull(),
);
