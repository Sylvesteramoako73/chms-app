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
        <p className="text-sm text-muted-foreground">Link your WhatsApp number to send messages directly from ChurchCare.</p>
      </div>

      <Card className="glass border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-500" /> WhatsApp Integration
          </CardTitle>
          <CardDescription>
            Scan the QR code with your phone to link your WhatsApp. Once connected, all messages from Communication, Automation, and Task Assignment are sent automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppConnect sessionId={profile?.id ?? 'default'} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
