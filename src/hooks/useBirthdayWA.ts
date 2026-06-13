import { useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { sendWhatsAppViaServer } from '@/lib/whatsapp';
import { format, getMonth, getDate } from 'date-fns';

const SETTINGS_KEY = 'chms_birthday_wa';
const sentKey = () => `chms_bday_sent_${format(new Date(), 'yyyy-MM-dd')}`;

interface BWASettings {
  birthdayEnabled: boolean;
  anniversaryEnabled: boolean;
}

export function useBirthdayWA() {
  const { members } = useData();
  const { profile } = useAuth();

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

    const run = async () => {
      let sent = 0;

      if (settings.birthdayEnabled) {
        const targets = members.filter(m => {
          if (!m.dateOfBirth || !m.phone) return false;
          const d = new Date(m.dateOfBirth);
          return getMonth(d) === todayMonth && getDate(d) === todayDay;
        });
        for (const m of targets) {
          const msg = `Happy Birthday, ${m.firstName}! 🎂 Wishing you a day filled with God's blessings and joy. With love, from your church family.`;
          if (profile?.id && await sendWhatsAppViaServer(profile.churchId ?? 'default', m.phone!, msg)) sent++;
        }
      }

      if (settings.anniversaryEnabled) {
        const targets = members.filter(m => {
          if (!m.joinDate || !m.phone) return false;
          const d = new Date(m.joinDate);
          if (d.getFullYear() === today.getFullYear()) return false;
          return getMonth(d) === todayMonth && getDate(d) === todayDay;
        });
        for (const m of targets) {
          const years = today.getFullYear() - new Date(m.joinDate).getFullYear();
          const msg = `Happy ${years}-year Church Anniversary, ${m.firstName}! 🎉 Thank you for being a faithful part of our congregation. God bless you abundantly!`;
          if (profile?.id && await sendWhatsAppViaServer(profile.churchId ?? 'default', m.phone!, msg)) sent++;
        }
      }

      if (sent > 0) {
        localStorage.setItem(sentKey(), '1');
      }
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, profile?.id]);
}
