import { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import type { EventRecord } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, MapPin, Clock, Users, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { format, parseISO, isAfter, subDays } from 'date-fns';

const EMPTY_FORM: Omit<EventRecord, 'id'> = {
  title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00',
  location: '', description: '', organizer: '',
  isRecurring: false, expectedAttendance: undefined, departmentId: undefined, recurringPattern: undefined,
};

export default function Events() {
  const { events, departments, addEvent, updateEvent, deleteEvent } = useData();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [form, setForm] = useState<Omit<EventRecord, 'id'>>(EMPTY_FORM);

  const today = new Date();
  const upcoming = events
    .filter(e => isAfter(new Date(e.date), subDays(today, 1)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = events
    .filter(e => !isAfter(new Date(e.date), subDays(today, 1)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (event: EventRecord) => {
    setEditing(event);
    const { id: _id, ...rest } = event;
    setForm(rest);
    setDialogOpen(true);
  };

  const set = <K extends keyof Omit<EventRecord, 'id'>>(key: K, val: Omit<EventRecord, 'id'>[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.title.trim() || !form.date || !form.location.trim()) {
      toast({ title: 'Validation error', description: 'Title, date, and location are required.', variant: 'destructive' });
      return;
    }
    if (editing) {
      updateEvent({ ...form, id: editing.id });
      toast({ title: 'Event updated', description: `"${form.title}" has been updated.` });
    } else {
      addEvent({ ...form, id: `e${Date.now()}` });
      toast({ title: 'Event created', description: `"${form.title}" has been added to the calendar.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (event: EventRecord) => {
    deleteEvent(event.id);
    toast({ title: 'Event deleted', description: `"${event.title}" has been removed.` });
  };

  const EventCard = ({ event }: { event: EventRecord }) => {
    const dept = departments.find(d => d.id === event.departmentId);
    return (
      <Card className="glass border-none shadow-sm hover:shadow-md transition-all group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-navy-100 dark:bg-navy-800 text-navy-700 dark:text-navy-300 border border-navy-200 dark:border-navy-700">
                {event.isRecurring ? <><RefreshCw className="w-2.5 h-2.5" />{event.recurringPattern}</> : 'One-time'}
              </span>
              {dept && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sage-500/10 text-sage-700 dark:text-sage-400 border border-sage-200 dark:border-sage-800/40">
                  {dept.name}
                </span>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(event)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(event)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <CardTitle className="text-lg group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors leading-snug">
            {event.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Calendar className="w-4 h-4 text-gold-500 shrink-0" />
            {format(parseISO(event.date), 'EEEE, MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Clock className="w-4 h-4 text-sage-500 shrink-0" />
            {event.time}
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            {event.location}
          </div>
          {event.expectedAttendance && (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Users className="w-4 h-4 shrink-0" />
              Expected: {event.expectedAttendance}
            </div>
          )}
          {event.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border/40">{event.description}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Events & Programs</h1>
          <p className="text-sm text-muted-foreground">{upcoming.length} upcoming · {past.length} past</p>
        </div>
        <Button size="sm" onClick={openAdd} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
          <Plus className="w-4 h-4" /> Create Event
        </Button>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past Events ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-0">
          {upcoming.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No upcoming events. Create one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcoming.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-0">
          {past.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              No past events recorded.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {past.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Event Title *</Label>
              <Input placeholder="e.g. Sunday Worship Service" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input type="time" value={form.time} onChange={e => set('time', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Location *</Label>
              <Input placeholder="e.g. Main Auditorium" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Organizer</Label>
              <Input placeholder="e.g. Pastor James" value={form.organizer} onChange={e => set('organizer', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Attendance</Label>
              <Input type="number" min="0" placeholder="0" value={form.expectedAttendance ?? ''} onChange={e => set('expectedAttendance', e.target.value ? parseInt(e.target.value) : undefined)} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={form.departmentId ?? 'none'} onValueChange={v => set('departmentId', v === 'none' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="All / None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recurring</Label>
              <Select
                value={form.isRecurring ? (form.recurringPattern ?? 'Weekly') : 'none'}
                onValueChange={v => {
                  if (v === 'none') set('isRecurring', false);
                  else { set('isRecurring', true); set('recurringPattern', v as 'Weekly' | 'Monthly' | 'Yearly'); }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">One-time</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea placeholder="Brief description of the event…" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">
              {editing ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
