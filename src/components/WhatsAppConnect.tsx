import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Unplug, RefreshCw, AlertTriangle } from 'lucide-react';

type WaStatus = 'disconnected' | 'connecting' | 'qr' | 'connected';

interface WaState {
  status: WaStatus;
  qr: string | null;
  phone: string | null;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const STEPS = [
  'Open WhatsApp on your phone',
  'Tap Menu (⋮) → Linked Devices',
  'Tap "Link a Device"',
  'Point your phone camera at this QR code',
];

export function WhatsAppConnect() {
  const [state, setState] = useState<WaState>({ status: 'disconnected', qr: null, phone: null });
  const [serverOffline, setServerOffline] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const connectSSE = () => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource('/api/whatsapp/events');
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'state' || data.type === 'qr') {
          setState({ status: data.status, qr: data.qr ?? null, phone: data.phone ?? null });
        }
        setServerOffline(false);
      } catch (_) { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setServerOffline(true);
      es.close();
      esRef.current = null;
      // Retry SSE connection every 5 s while server is offline
      setTimeout(connectSSE, 5000);
    };
  };

  useEffect(() => {
    connectSSE();
    return () => { esRef.current?.close(); };
  }, []);

  const handleConnect = async () => {
    setServerOffline(false);
    await fetch('/api/whatsapp/connect', { method: 'POST' }).catch(() => setServerOffline(true));
  };

  const handleDisconnect = async () => {
    await fetch('/api/whatsapp/disconnect', { method: 'POST' }).catch(() => setServerOffline(true));
  };

  if (serverOffline) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-sm">WhatsApp server is offline</p>
          <p className="text-xs text-muted-foreground mt-1">
            Run <code className="bg-muted px-1 rounded text-[11px]">npm run server:install</code> then{' '}
            <code className="bg-muted px-1 rounded text-[11px]">npm run server</code> in a separate terminal.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={connectSSE}>
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  if (state.status === 'connected') {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <p className="font-semibold text-green-700 dark:text-green-400">WhatsApp Connected</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Linked to <span className="font-mono font-medium">+{state.phone}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Messages sent from the Communication page will be delivered via WhatsApp.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <Unplug className="w-4 h-4" /> Disconnect
        </Button>
      </div>
    );
  }

  if (state.status === 'qr' && state.qr) {
    return (
      <div className="flex flex-col lg:flex-row gap-8 items-center py-4">
        {/* QR code */}
        <div className="shrink-0">
          <div className="w-56 h-56 rounded-2xl border-4 border-green-400 p-2 bg-white shadow-lg">
            <img src={state.qr} alt="WhatsApp QR Code" className="w-full h-full rounded-xl" />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">Scan with WhatsApp</p>
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <WhatsAppIcon className="w-5 h-5 text-green-500" />
            <p className="font-semibold text-sm">How to scan</p>
          </div>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center text-[11px] font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">
            QR codes expire after 60 seconds. A new one will appear automatically.
          </p>
        </div>
      </div>
    );
  }

  // disconnected or connecting
  return (
    <div className="flex flex-col items-center gap-5 py-10 text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
        {state.status === 'connecting' ? (
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        ) : (
          <WhatsAppIcon className="w-8 h-8 text-green-500" />
        )}
      </div>
      <div>
        <p className="font-semibold text-sm">
          {state.status === 'connecting' ? 'Connecting to WhatsApp…' : 'WhatsApp Not Connected'}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {state.status === 'connecting'
            ? 'Generating QR code — this takes a few seconds.'
            : 'Link your WhatsApp account to send messages directly from ChurchCare.'}
        </p>
      </div>
      {state.status === 'disconnected' && (
        <Button
          onClick={handleConnect}
          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <WhatsAppIcon className="w-4 h-4" /> Connect WhatsApp
        </Button>
      )}
    </div>
  );
}
