import webpush from 'web-push';
import { getJson, setJson } from '@/app/api/upstash';
import { ChildId, getChildSettings, NotificationEventKey } from '@/app/lib/settings-shared';

type PushSubscriptionRecord = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@ali1-one.vercel.app',
    publicKey,
    privateKey
  );

  return { publicKey, privateKey };
}

export function isEventEnabled(channel: 'telegram' | 'webPush', settings: any, childId: ChildId, eventType: NotificationEventKey) {
  const child = getChildSettings(settings, childId);
  const prefs = child.notifications[channel];
  return !!prefs.enabled && !!prefs.events[eventType];
}

export async function addPushSubscription(childId: ChildId, subscription: PushSubscriptionRecord) {
  const key = `aq:webpush:subs:${childId}`;
  const current = await getJson(key) || [];
  const normalized = Array.isArray(current) ? current : [];
  const filtered = normalized.filter((item: any) => item.endpoint !== subscription.endpoint);
  filtered.push(subscription);
  await setJson(key, filtered);
  return filtered;
}

export async function removePushSubscription(childId: ChildId, endpoint?: string) {
  if (!endpoint) return;
  const key = `aq:webpush:subs:${childId}`;
  const current = await getJson(key) || [];
  const filtered = Array.isArray(current) ? current.filter((item: any) => item.endpoint !== endpoint) : [];
  await setJson(key, filtered);
  return filtered;
}

export async function sendWebPushToChild(childId: ChildId, payload: any) {
  const vapid = getVapidConfig();
  if (!vapid) return { sent: 0, skipped: true, reason: 'missing-vapid' };

  const key = `aq:webpush:subs:${childId}`;
  const subs = await getJson(key) || [];
  const subscriptions = Array.isArray(subs) ? subs : [];
  if (subscriptions.length === 0) return { sent: 0, skipped: true, reason: 'no-subscribers' };

  const message = JSON.stringify(payload);
  let sent = 0;
  await Promise.allSettled(
    subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification(sub, message);
        sent += 1;
      } catch (error: any) {
        const statusCode = error?.statusCode || error?.status;
        if (statusCode === 410 || statusCode === 404) {
          await removePushSubscription(childId, sub.endpoint);
        }
      }
    })
  );

  return { sent, skipped: false };
}

export async function sendTelegramIfEnabled(settings: any, childId: ChildId, eventType: NotificationEventKey, message: string) {
  if (!isEventEnabled('telegram', settings, childId, eventType)) {
    return { sent: 0, skipped: true };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_IDS = process.env.TELEGRAM_CHAT_IDS?.split(',') || [];
  if (!BOT_TOKEN || CHAT_IDS.length === 0) {
    return { sent: 0, skipped: true, reason: 'missing-config' };
  }

  await Promise.allSettled(
    CHAT_IDS.map(async (chatId) => {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text: message,
          parse_mode: 'HTML',
        }),
      });
    })
  );

  return { sent: CHAT_IDS.length, skipped: false };
}
