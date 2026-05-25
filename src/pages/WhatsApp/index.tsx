import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WhatsAppConnect } from '@/components/WhatsAppConnect';
import { useAuth } from '@/context/AuthContext';

export default function WhatsAppPage() {
  const { profile } = useAuth();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Connect your WhatsApp account to send messages directly from the app.</p>
      </div>

      <Card className="glass border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" /> WhatsApp Integration
          </CardTitle>
          <CardDescription>
            Scan the QR code with your phone to link your WhatsApp account. Once connected, messages sent from Communication and Task Assignment will go through your WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-400">
            <strong>Setup required:</strong> The WhatsApp server must be running. Ask your Administrator to start the server, or if you manage the server yourself run:{' '}
            <code className="bg-black/10 px-1 rounded">npm run server:install</code> once, then{' '}
            <code className="bg-black/10 px-1 rounded">npm run server</code>.
          </div>
          <WhatsAppConnect sessionId={profile?.id} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
