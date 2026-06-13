/**
 * Phase 2 tests — crypto, settings masking, setup/auth, and route ordering.
 * Run with: tsx tests/phase2.test.js (see package.json `test` script).
 *
 * Uses an isolated temp DATA_DIR and a fixed APP_SECRET so nothing touches the
 * real database or generates persistent secrets.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Must be set BEFORE importing any server module that reads config/db.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'awp-test-'));
process.env.DATA_DIR = tmpDir;
process.env.APP_SECRET = 'unit-test-app-secret-1234567890';
process.env.NODE_ENV = 'test';

let passed = 0;
let failed = 0;
function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

// ── crypto ──
console.log('\n🔧 crypto: encrypt / decrypt / mask');
const { encryptSecret, decryptSecret, isEncrypted, maskSecret } = await import(
  '../server/lib/crypto.ts'
);
const secret = 'sk-test-1234567890abcd';
const enc = encryptSecret(secret);
assert('encrypted value is prefixed', isEncrypted(enc));
assert('encrypted value differs from plaintext', enc !== secret);
assert('decrypt round-trips', decryptSecret(enc) === secret);
assert('decrypt of plaintext is passthrough', decryptSecret('plain') === 'plain');
assert('two encryptions differ (random IV)', encryptSecret(secret) !== encryptSecret(secret));
assert('mask hides middle', maskSecret(secret) === 'sk-t****abcd');
assert('mask empty is empty', maskSecret('') === '');
assert('mask short never reveals all', !maskSecret('abcd').includes('abcd'));

// ── settings service ──
console.log('\n🔧 settings: encrypt + mask + keep-existing');
const settingsSvc = await import('../server/services/settings-service.ts');
settingsSvc.setApiKeyEncrypted(secret);
const pub1 = settingsSvc.getPublicSettings();
assert('public settings hide raw key', pub1.ai_api_key === undefined);
assert('public settings expose masked key', pub1.ai_api_key_masked === 'sk-t****abcd');
assert('public settings flag key set', pub1.ai_api_key_set === true);
assert('server-use settings decrypt key', settingsSvc.getAiSettingsForServerUse().apiKey === secret);

// empty key -> keep existing; other fields update
settingsSvc.updateSettingsSafely({ ai_api_key: '', ai_model: 'changed-model' });
assert('empty key keeps existing key', settingsSvc.getAiSettingsForServerUse().apiKey === secret);
assert('non-key field updates', settingsSvc.getSetting('ai_model') === 'changed-model');

// new key -> replaces
settingsSvc.updateSettingsSafely({ ai_api_key: 'sk-new-9999999999wxyz' });
assert('new key replaces existing', settingsSvc.getAiSettingsForServerUse().apiKey === 'sk-new-9999999999wxyz');
assert('stored key is encrypted at rest', isEncrypted(settingsSvc.getSetting('ai_api_key')));

// ── setup + auth ──
console.log('\n🔧 setup + auth');
const setupSvc = await import('../server/services/setup-service.ts');
const authSvc = await import('../server/services/auth-service.ts');
assert('setup required when no admin', setupSvc.isSetupRequired() === true);
assert('status reports setupRequired true', setupSvc.getSetupStatus().setupRequired === true);

await setupSvc.completeSetup({
  username: 'admin',
  email: 'admin@example.com',
  password: 'supersecret123',
  aiProviderName: 'OpenAI',
  aiBaseUrl: 'https://api.example.com/v1',
  aiModel: 'gpt-test',
  aiApiKey: 'sk-setup-1234567890abcd',
  defaultLanguage: 'English',
  defaultTone: 'informational',
});
assert('setup not required after complete', setupSvc.isSetupRequired() === false);
assert('admin user created', authSvc.hasAdminUser() === true);
assert('setup stored encrypted key (masked)', settingsSvc.getPublicSettings().ai_api_key_masked === 'sk-s****abcd');
assert('setup completing again is rejected', await setupSvc
  .completeSetup({
    username: 'x', email: 'x@x.com', password: 'password123',
    aiProviderName: 'x', aiBaseUrl: 'https://x.com/v1', aiModel: 'x',
    aiApiKey: 'x', defaultLanguage: 'English', defaultTone: 'casual',
  })
  .then(() => false)
  .catch(() => true));

const goodUser = await authSvc.verifyCredentials('admin', 'supersecret123');
assert('login succeeds with correct password', goodUser && goodUser.username === 'admin');
const badUser = await authSvc.verifyCredentials('admin', 'wrong-password');
assert('login fails with wrong password', badUser === null);
const unknownUser = await authSvc.verifyCredentials('nobody', 'whatever12');
assert('login fails for unknown user', unknownUser === null);

// ── JWT ──
console.log('\n🔧 jwt');
const { signJwt, verifyJwt } = await import('../server/lib/jwt.ts');
const token = signJwt({ sub: 1, username: 'admin', role: 'admin' });
assert('valid token verifies', verifyJwt(token)?.username === 'admin');
assert('tampered token rejected', verifyJwt(token.slice(0, -3) + 'aaa') === null);
assert('garbage token rejected', verifyJwt('not.a.jwt') === null);

// ── articles route ordering ──
console.log('\n🔧 articles route ordering');
const articlesRouter = (await import('../server/routes/articles.js')).default;
const paths = articlesRouter.stack.filter((l) => l.route).map((l) => l.route.path);
const projectIdx = paths.indexOf('/project/:projectId');
const idIdx = paths.indexOf('/:id');
assert('project list route registered before /:id', projectIdx !== -1 && projectIdx < idIdx);

// ── results ──
console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('========================================');

// Cleanup temp data dir.
try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch {
  /* ignore */
}

if (failed > 0) process.exit(1);
