import { initialData } from '../src/domain/model';
import { createBackupService } from '../src/services/backups';

jest.mock('../src/platform/security', () => ({ localSecurity: {} }));
jest.mock('../src/services/storage', () => ({ storage: { flush: jest.fn() } }));

const password = 'test backup password';
function fixture() {
  const transport = {
    backup: jest.fn().mockResolvedValue('fedd-test.feddbackup'),
    readBackup: jest.fn().mockResolvedValue(JSON.stringify(initialData)),
  };
  const flush = jest.fn().mockResolvedValue(undefined);
  return { transport, flush, service: createBackupService(transport, flush) };
}
test('weak passwords and mismatching confirmation never create a backup', async () => {
  const { service, transport, flush } = fixture();
  await expect(service.create('short', 'short')).rejects.toThrow();
  await expect(service.create(password, 'different')).rejects.toThrow();
  expect(flush).not.toHaveBeenCalled();
  expect(transport.backup).not.toHaveBeenCalled();
});
test('backup waits for pending secure writes before reading the native snapshot', async () => {
  const { service, transport, flush } = fixture();
  let complete!: () => void;
  flush.mockImplementation(
    () =>
      new Promise<void>(resolve => {
        complete = resolve;
      }),
  );
  const result = service.create(password, password);
  expect(transport.backup).not.toHaveBeenCalled();
  complete();
  await expect(result).resolves.toBe('fedd-test.feddbackup');
  expect(transport.backup).toHaveBeenCalledWith(password);
});
test('failed secure write prevents exporting an outdated snapshot', async () => {
  const { service, transport, flush } = fixture();
  flush.mockRejectedValue(new Error('Disk full'));
  await expect(service.create(password, password)).rejects.toThrow('Disk full');
  expect(transport.backup).not.toHaveBeenCalled();
});
test('valid restore is staged without writing local data', async () => {
  const { service, transport, flush } = fixture();
  const snapshot = {
    ...initialData,
    profile: { name: 'Alex' },
    nudge: 'firm',
    activityHistory: [
      { id: 'a1', activityId: 2, completedAt: 10, text: 'Be curious' },
    ],
  };
  transport.readBackup.mockResolvedValue(JSON.stringify(snapshot));
  await expect(service.prepareRestore(password)).resolves.toEqual(snapshot);
  expect(transport.readBackup).toHaveBeenCalledWith(password);
  expect(transport.backup).not.toHaveBeenCalled();
  expect(flush).not.toHaveBeenCalled();
});
test.each([
  'not json',
  JSON.stringify({ ...initialData, version: 99 }),
  JSON.stringify({ ...initialData, sessions: [{}] }),
])('malformed restore is rejected without changing the vault', async raw => {
  const { service, transport } = fixture();
  transport.readBackup.mockResolvedValue(raw);
  await expect(service.prepareRestore(password)).rejects.toThrow();
  expect(transport.backup).not.toHaveBeenCalled();
});
test('incorrect password and cancelled file selection leave data untouched', async () => {
  const { service, transport } = fixture();
  transport.readBackup.mockRejectedValueOnce(
    new Error('Wrong password or damaged backup'),
  );
  await expect(service.prepareRestore(password)).rejects.toThrow(
    'Wrong password',
  );
  transport.readBackup.mockRejectedValueOnce(
    Object.assign(new Error('Cancelled'), { code: 'CANCELLED' }),
  );
  await expect(service.prepareRestore(password)).rejects.toMatchObject({
    code: 'CANCELLED',
  });
  expect(transport.backup).not.toHaveBeenCalled();
});
