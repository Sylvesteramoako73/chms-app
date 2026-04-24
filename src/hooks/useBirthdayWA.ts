import { useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { API_BASE } from '@/lib/api';
import { format, getMonth, getDate } from 'date-fns';

const SETTINGS_KEY = 'chms_birthday_wa';
const sentKey = () => `chms_bday_sent_${format(new Date(), 'yyyy-MM-dd')}`;

interface BWASettings {
  birthdayEnabled: boolean;
  anniversaryEnabled: boolean;
}

export function useBirthdayWA() {
  const { members } = useData();

  useEffect(() => {
    if (members.length === 0) return;
    if (localStorage.getItem(sentKey())) return;

    let settings: BWASettings = { birthdayEnabled: false, anniversaryEnabled: false };
    try { settings = { ...settings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }; }
    catch { /* use defaults */ }

    if (!settings.birthdayEnabled && !settings.anniversaryEnabled) return;

    const today = new Date();
    const todayMonth = getMonth(today);
    const todayDay = getDate(today);

    async function doSend() {
      try {
        const res = await fetch(`${API_BASE}/api/whatsapp/status`);
        const { status } = await res.json() as { status: string };
        if (status !== 'connected') return;

        const sends: Promise<void>[] = [];

        if (settings.birthdayEnabled) {
          members
            .filter(m => {
              if (!m.dateOfBirth || !m.phone) return false;
              const d = new Date(m.dateOfBirth);
              return getMonth(d) === todayMonth && getDate(d) === todayDay;
            })
            .forEach(m => {
              const msg = `Happy Birthday, ${m.firstName}! 🎂 Wishing you a day filled with God's blessings and joy. With love, from your church family.`;
              sends.push(
                fetch(`${API_BASE}/api/whatsapp/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ number: m.phone, message: msg }),
                }).then(() => undefined)
              );
            });
        }

        if (settings.anniversaryEnabled) {
          members
            .filter(m => {
              if (!m.joinDate || !m.phone) return false;
              const d = new Date(m.joinDate);
              if (d.getFullYear() === today.getFullYear()) return false;
              return getMonth(d) === todayMonth && getDate(d) === todayDay;
            })
            .forEach(m => {
              const years = today.getFullYear() - new Date(m.joinDate).getFullYear();
              const msg = `Happy ${years}-year Church Anniversary, ${m.firstName}! 🎉 Thank you for being a faithful part of our congregation. God bless you abundantly!`;
              sends.push(
                fetch(`${API_BASE}/api/whatsapp/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ number: m.phone, message: msg }),
                }).then(() => undefined)
              );
            });
        }

        if (sends.length > 0) {
          await Promise.allSettled(sends);
          localStorage.setItem(sentKey(), '1');
        }
      } catch {
        // WhatsApp server offline — skip silently
      }
    }

    doSend();
  }, [members]);
}
