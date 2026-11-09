import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AppError } from './providers.js';

const scrypt = promisify(scryptCallback);
const USERNAME = /^[a-z0-9._-]{3,32}$/;
const DUMMY_SALT = randomBytes(16);

// Guardian (family member) accounts: a login that is separate from the senior's profile capability.
// Accounts live in bounded process memory, like every other record in this prototype; a restart clears them.
export function createGuardianStore({ maxAccounts = 200, maxPerProfile = 5, maxSessionsPerAccount = 5, maxFailureRecords = 5000, sessionTtlMs = 12 * 3600e3, idleMs = 30 * 24 * 3600e3, maxFailures = 5, maxFailuresPerUsername = 20, lockMs = 15 * 60e3, now = () => Date.now() } = {}) {
 const accounts = new Map(), sessions = new Map(), failures = new Map();

 const normalizeUsername = username => (typeof username === 'string' ? username.trim().toLowerCase() : '');
 const hash = (passphrase, salt) => scrypt(passphrase.normalize('NFKC'), salt, 32, { N: 16384, r: 8, p: 1 });
 function validate(username, passphrase) {
  if (!USERNAME.test(normalizeUsername(username))) throw new AppError(400, 'Choose a username of 3–32 letters, numbers, dots, dashes or underscores.');
  if (typeof passphrase !== 'string' || passphrase.length < 10 || passphrase.length > 128) throw new AppError(400, 'Choose a passphrase of 10–128 characters.');
 }
 const linkedTo = profileToken => [...accounts.values()].filter(a => profileToken && a.profileToken === profileToken);
 function assertRoom(profileToken, account) {
  if (account?.profileToken === profileToken) return;
  if (linkedTo(profileToken).length >= maxPerProfile) throw new AppError(429, 'This person already has the maximum number of family accounts.');
 }

 async function register(username, passphrase, profileToken) {
  validate(username, passphrase);
  const name = normalizeUsername(username);
  const checkRoom = () => {
   if (accounts.has(name)) throw new AppError(409, 'That username is taken. Sign in instead, or choose another.');
   if (accounts.size >= maxAccounts) throw new AppError(429, 'Family account capacity reached. Retry later.');
   assertRoom(profileToken);
  };
  checkRoom();
  const salt = randomBytes(16), digest = await hash(passphrase, salt);
  checkRoom(); // re-check after the await so concurrent registrations cannot overwrite or exceed limits
  const account = { username: name, salt, hash: digest, profileToken, createdAt: now(), lastUsedAt: now(), subscription: null, pushStatus: 'not subscribed' };
  accounts.set(name, account);
  return account;
 }

 async function login(username, passphrase, clientKey = '') {
  const name = normalizeUsername(username);
  if (!USERNAME.test(name)) throw new AppError(401, 'Username or passphrase is incorrect.');
  const failureKey = `${name}|${clientKey}`, usernameKey = `${name}|*`;
  const failure = failures.get(failureKey), usernameFailure = failures.get(usernameKey);
  if (failure?.until > now() || usernameFailure?.until > now()) throw new AppError(429, 'Too many attempts. Try again in 15 minutes.');
  const account = accounts.get(name);
  // Hash even for unknown usernames so timing does not reveal which accounts exist.
  const candidate = await hash(typeof passphrase === 'string' ? passphrase : '', account ? account.salt : DUMMY_SALT);
  if (!account || !timingSafeEqual(candidate, account.hash)) {
   countFailure(failureKey, maxFailures);       // per username and client
   countFailure(usernameKey, maxFailuresPerUsername); // per username across clients, so rotating addresses does not help
   throw new AppError(401, 'Username or passphrase is incorrect.');
  }
  failures.delete(failureKey);
  account.lastUsedAt = now();
  return account;
 }

 function countFailure(k, limit) {
  const previous = failures.get(k), fresh = !previous || previous.since + lockMs < now() || (previous.until && previous.until <= now());
  const count = (fresh ? 0 : previous.count) + 1;
  failures.delete(k);
  failures.set(k, { count, since: fresh ? now() : previous.since, until: count >= limit ? now() + lockMs : 0 });
  while (failures.size > maxFailureRecords) failures.delete(failures.keys().next().value); // bounded: oldest first
 }
 function startSession(account) {
  const own = [...sessions].filter(([, e]) => e.username === account.username);
  for (const [token] of own.slice(0, Math.max(0, own.length - maxSessionsPerAccount + 1))) sessions.delete(token);
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { username: account.username, expiresAt: now() + sessionTtlMs });
  return token;
 }
 function fromToken(token) {
  const entry = typeof token === 'string' ? sessions.get(token) : undefined;
  if (!entry || entry.expiresAt < now()) { if (token) sessions.delete(token); return null; }
  const account = accounts.get(entry.username);
  if (!account) { sessions.delete(token); return null; }
  account.lastUsedAt = now();
  return account;
 }
 const endSession = token => sessions.delete(token);
 function link(account, profileToken) { assertRoom(profileToken, account); account.profileToken = profileToken; }
 function unlink(profileToken, username) {
  const account = accounts.get(normalizeUsername(username));
  if (!account || account.profileToken !== profileToken) return false;
  account.profileToken = null;
  account.subscription = null;
  account.pushStatus = 'not subscribed';
  return true;
 }
 function sweep() {
  const t = now();
  for (const [token, entry] of sessions) if (entry.expiresAt < t) sessions.delete(token);
  for (const [name, account] of accounts) if (account.lastUsedAt + idleMs < t) { accounts.delete(name); for (const [token, entry] of sessions) if (entry.username === name) sessions.delete(token); }
  for (const [k, failure] of failures) if (failure.since + lockMs < t && (!failure.until || failure.until < t)) failures.delete(k);
 }
 return { register, login, startSession, fromToken, endSession, link, unlink, linkedTo, sweep, sessionTtlMs };
}
