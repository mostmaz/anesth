import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging, SendResponse } from 'firebase-admin/messaging';
import prisma from '../prisma';

let initialized = false;

// Lazily initialise firebase-admin from a base64-encoded service-account JSON
// passed via FIREBASE_SERVICE_ACCOUNT_B64. Returns false if not configured.
function ensureInit(): boolean {
  if (initialized) return true;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) return false;
  try {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    if (getApps().length === 0) {
      initializeApp({ credential: cert(json) });
    }
    initialized = true;
    console.log('[FCM] firebase-admin initialised for project', json.project_id);
    return true;
  } catch (e) {
    console.error('[FCM] init failed:', e);
    return false;
  }
}

// Remove a device token from every user (called on sign-out) so a signed-out
// device is owned by nobody and therefore receives no pushes.
export async function unregisterToken(token: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: { fcmTokens: { has: token } },
    select: { id: true, fcmTokens: true },
  });
  for (const u of users) {
    await prisma.user.update({ where: { id: u.id }, data: { fcmTokens: { set: u.fcmTokens.filter(t => t !== token) } } });
  }
}

// Move a device token to the given user (a device belongs to whoever last logged in).
export async function registerToken(userId: string, token: string): Promise<void> {
  const others = await prisma.user.findMany({
    where: { fcmTokens: { has: token }, id: { not: userId } },
    select: { id: true, fcmTokens: true },
  });
  for (const u of others) {
    await prisma.user.update({ where: { id: u.id }, data: { fcmTokens: { set: u.fcmTokens.filter(t => t !== token) } } });
  }
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { fcmTokens: true } });
  if (me && !me.fcmTokens.includes(token)) {
    await prisma.user.update({ where: { id: userId }, data: { fcmTokens: { push: token } } });
  }
}

// Sends one push to a set of device tokens and forgets tokens FCM reports as dead.
async function sendToTokens(tokens: string[], title: string, body: string, data: Record<string, string>): Promise<void> {
  if (tokens.length === 0) return;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
    android: { priority: 'high', notification: { channelId: 'icu-alerts', sound: 'default' } },
  });

  const invalid: string[] = [];
  res.responses.forEach((r: SendResponse, i: number) => {
    if (!r.success) {
      const code = (r.error as any)?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
        invalid.push(tokens[i]);
      }
    }
  });
  if (invalid.length) {
    const affected = await prisma.user.findMany({
      where: { fcmTokens: { hasSome: invalid } },
      select: { id: true, fcmTokens: true },
    });
    for (const u of affected) {
      await prisma.user.update({ where: { id: u.id }, data: { fcmTokens: { set: u.fcmTokens.filter(t => !invalid.includes(t)) } } });
    }
  }
  console.log(`[FCM] sent "${title}" to ${res.successCount}/${tokens.length} devices`);
}

// Broadcast a push to every registered device. Fire-and-forget; never throws.
export async function sendToAll(title: string, body: string, data: Record<string, string> = {}): Promise<void> {
  try {
    if (!ensureInit()) return;
    const users = await prisma.user.findMany({
      where: { NOT: { fcmTokens: { isEmpty: true } } },
      select: { fcmTokens: true },
    });
    await sendToTokens(Array.from(new Set(users.flatMap(u => u.fcmTokens))), title, body, data);
  } catch (e) {
    console.error('[FCM] send failed:', e);
  }
}

// Push to specific users only. Fire-and-forget; never throws.
export async function sendToUsers(userIds: string[], title: string, body: string, data: Record<string, string> = {}): Promise<void> {
  try {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    if (ids.length === 0 || !ensureInit()) return;
    const users = await prisma.user.findMany({
      where: { id: { in: ids }, NOT: { fcmTokens: { isEmpty: true } } },
      select: { fcmTokens: true },
    });
    await sendToTokens(Array.from(new Set(users.flatMap(u => u.fcmTokens))), title, body, data);
  } catch (e) {
    console.error('[FCM] send failed:', e);
  }
}

export type Audience = 'nurse' | 'doctors' | 'team';

// The nurse(s) looking after a patient right now. If nobody is assigned, the
// nurses currently on shift; if nobody is on shift either, every nurse — so an
// alert is never silently dropped.
export async function nursesFor(patientId: string): Promise<string[]> {
  const assigned = await prisma.patientAssignment.findMany({
    where: { patientId, isActive: true, isPending: false, user: { role: 'NURSE' } },
    select: { userId: true },
  });
  if (assigned.length) return assigned.map(a => a.userId);
  const onShift = await prisma.shift.findMany({
    where: { isActive: true, user: { role: 'NURSE' } },
    select: { userId: true },
  });
  if (onShift.length) return Array.from(new Set(onShift.map(s => s.userId)));
  const all = await prisma.user.findMany({ where: { role: 'NURSE' }, select: { id: true } });
  return all.map(u => u.id);
}

export async function doctors(): Promise<string[]> {
  const users = await prisma.user.findMany({ where: { role: { in: ['RESIDENT', 'SENIOR'] } }, select: { id: true } });
  return users.map(u => u.id);
}

// Who should hear about something concerning one patient:
//   nurse   — the bedside nurse(s) only (e.g. a dose is overdue)
//   doctors — residents and seniors
//   team    — both
export async function recipientsFor(patientId: string, audience: Audience): Promise<string[]> {
  const [n, d] = await Promise.all([
    audience === 'doctors' ? Promise.resolve([] as string[]) : nursesFor(patientId),
    audience === 'nurse' ? Promise.resolve([] as string[]) : doctors(),
  ]);
  return Array.from(new Set([...n, ...d]));
}

// Push about one patient to the right people instead of every device.
export async function notifyPatient(
  patientId: string, audience: Audience, title: string, body: string, data: Record<string, string> = {},
): Promise<void> {
  try {
    const ids = await recipientsFor(patientId, audience);
    await sendToUsers(ids, title, body, { ...data, patientId });
  } catch (e) {
    console.error('[FCM] targeted send failed:', e);
  }
}
