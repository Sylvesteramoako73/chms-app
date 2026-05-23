import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Megaphone, Plus, Pencil, Trash2, Users, MapPin, Calendar,
  Phone, ChevronRight, LayoutList, Kanban, Check, X,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import type { OutreachActivity, OutreachProspect, OutreachType, OutreachFollowUpStatus, InterestLevel } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils';

// ── helpers ────────────────────────────────────────────────────────────────
const uid = () => `o${Date.now()}${Math.random().toString(36).slice(2, 7)}`;

const OUTREACH_TYPES: OutreachType[] = [
  'House-to-House', 'Street Evangelism', 'Campus Outreach', 'Community Event', 'Online', 'Other',
];

const INTEREST_COLORS: Record<InterestLevel, string> = {
  High: 'bg-green-500/20 text-green-400',
  Medium: 'bg-amber-500/20 text-amber-400',
  Low: 'bg-navy-700 text-navy-400',
};

const PIPELINE_COLS: Array<{
  status: OutreachFollowUpStatus;
  label: string;
  next?: OutreachFollowUpStatus;
  colClass: string;
  headerClass: string;
}> = [
  { status: 'Contacted', label: 'Contacted', next: 'Invited',   colClass: 'border-blue-500/30 bg-blue-500/5',   headerClass: 'text-blue-400' },
  { status: 'Invited',   label: 'Invited',   next: 'Attended',  colClass: 'border-purple-500/30 bg-purple-500/5', headerClass: 'text-purple-400' },
  { status: 'Attended',  label: 'Attended',  next: 'Converted', colClass: 'border-amber-500/30 bg-amber-500/5',  headerClass: 'text-amber-400' },
  { status: 'Converted', label: 'Converted',                    colClass: 'border-sage-500/30 bg-sage-500/5',   headerClass: 'text-sage-400' },
];

// ── Activity form ──────────────────────────────────────────────────────────
interface ActivityFormProps {
  initial?: OutreachActivity;
  members: { id: string; firstName: string; lastName: string }[];
  onSave: (a: OutreachActivity) => void;
  onClose: () => void;
}

function ActivityForm({ initial, members, onSave, onClose }: ActivityFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<OutreachType>(initial?.type ?? 'House-to-House');
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState(initial?.location ?? '');
  const [teamIds, setTeamIds] = useState<string[]>(initial?.teamMemberIds ?? []);
  const [reached, setReached] = useState(String(initial?.prospectsReached ?? 0));
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const toggleMember = (id: string) =>
    setTeamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = () => {
    if (!title.trim() || !location.trim()) return;
    onSave({
      id: initial?.id ?? uid(),
      title: title.trim(),
      type,
      date,
      location: location.trim(),
      teamMemberIds: teamIds,
      prospectsReached: parseInt(reached) || 0,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-navy-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{initial ? 'Edit Activity' : 'New Outreach Activity'}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              placeholder="e.g. Saturday Market Outreach" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value as OutreachType)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                {OUTREACH_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Location *</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              placeholder="e.g. Kejetia Market, Kumasi" />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Prospects Reached</label>
            <input type="number" min="0" value={reached} onChange={e => setReached(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-2">Team Members ({teamIds.length} selected)</label>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-navy-700 rounded-lg p-2">
              {members.length === 0 && <p className="text-navy-500 text-xs p-2">No members found.</p>}
              {members.map(m => (
                <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-navy-800 cursor-pointer">
                  <input type="checkbox" checked={teamIds.includes(m.id)} onChange={() => toggleMember(m.id)}
                    className="accent-gold-500" />
                  <span className="text-sm text-white">{m.firstName} {m.lastName}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500 resize-none" />
          </div>
        </div>
        <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-navy-300 hover:text-white border border-navy-700 hover:border-navy-600 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || !location.trim()}
            className="px-4 py-2 rounded-lg text-sm bg-gold-500 text-navy-900 font-semibold hover:bg-gold-400 transition-colors disabled:opacity-40">
            {initial ? 'Save Changes' : 'Add Activity'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Prospect form ──────────────────────────────────────────────────────────
interface ProspectFormProps {
  initial?: OutreachProspect;
  activities: OutreachActivity[];
  onSave: (p: OutreachProspect) => void;
  onClose: () => void;
}

function ProspectForm({ initial, activities, onSave, onClose }: ProspectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [activityId, setActivityId] = useState(initial?.activityId ?? '');
  const [interest, setInterest] = useState<InterestLevel>(initial?.interestLevel ?? 'Medium');
  const [status, setStatus] = useState<OutreachFollowUpStatus>(initial?.status ?? 'Contacted');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? uid(),
      activityId: activityId || undefined,
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      interestLevel: interest,
      status,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-navy-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{initial ? 'Edit Prospect' : 'New Prospect'}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              placeholder="e.g. Kwame Asante" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                placeholder="024 XXX XXXX" />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Interest Level</label>
              <select value={interest} onChange={e => setInterest(e.target.value as InterestLevel)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              placeholder="e.g. Adum, Kumasi" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Pipeline Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as OutreachFollowUpStatus)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                {PIPELINE_COLS.map(c => <option key={c.status}>{c.status}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">From Activity</label>
              <select value={activityId} onChange={e => setActivityId(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                <option value="">— none —</option>
                {activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500 resize-none" />
          </div>
        </div>
        <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-navy-300 hover:text-white border border-navy-700 hover:border-navy-600 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-sm bg-gold-500 text-navy-900 font-semibold hover:bg-gold-400 transition-colors disabled:opacity-40">
            {initial ? 'Save Changes' : 'Add Prospect'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Outreach() {
  const {
    members,
    outreachActivities, addOutreachActivity, updateOutreachActivity, deleteOutreachActivity,
    outreachProspects, addOutreachProspect, updateOutreachProspect, deleteOutreachProspect,
  } = useData();

  const [activityForm, setActivityForm] = useState<{ open: boolean; editing?: OutreachActivity }>({ open: false });
  const [prospectForm, setProspectForm] = useState<{ open: boolean; editing?: OutreachProspect }>({ open: false });
  const [prospectView, setProspectView] = useState<'list' | 'pipeline'>('pipeline');
  const [filterStatus, setFilterStatus] = useState<OutreachFollowUpStatus | 'All'>('All');
  const [searchQ, setSearchQ] = useState('');

  const activeMembers = useMemo(() =>
    members.filter(m => m.status === 'Active' || m.status === 'New Convert'),
    [members]);

  const filteredProspects = useMemo(() => {
    let p = outreachProspects;
    if (filterStatus !== 'All') p = p.filter(x => x.status === filterStatus);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      p = p.filter(x => x.name.toLowerCase().includes(q) || x.phone?.includes(q));
    }
    return p;
  }, [outreachProspects, filterStatus, searchQ]);

  const totalReached = outreachActivities.reduce((s, a) => s + a.prospectsReached, 0);
  const converted = outreachProspects.filter(p => p.status === 'Converted').length;

  const moveNext = (prospect: OutreachProspect, next: OutreachFollowUpStatus) =>
    updateOutreachProspect({ ...prospect, status: next });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Outreach & Evangelism</h1>
          <p className="text-navy-400 text-sm mt-0.5">Track activities, prospects, and follow-up pipeline</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActivityForm({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-navy-800 border border-navy-700 hover:border-gold-500/50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Activity
          </button>
          <button
            onClick={() => setProspectForm({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-400 text-navy-900 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Prospect
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Activities', value: outreachActivities.length, icon: Megaphone, color: 'text-gold-400' },
          { label: 'Total Reached', value: totalReached, icon: Users, color: 'text-blue-400' },
          { label: 'Prospects', value: outreachProspects.length, icon: Phone, color: 'text-purple-400' },
          { label: 'Converted', value: converted, icon: Check, color: 'text-sage-400' },
        ].map(s => (
          <div key={s.label} className="bg-navy-800 border border-navy-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn('w-4 h-4', s.color)} />
              <span className="text-xs text-navy-400">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activities">
        <TabsList className="bg-navy-800 border border-navy-700">
          <TabsTrigger value="activities" className="data-[state=active]:bg-navy-700 data-[state=active]:text-white text-navy-400">
            Activities ({outreachActivities.length})
          </TabsTrigger>
          <TabsTrigger value="prospects" className="data-[state=active]:bg-navy-700 data-[state=active]:text-white text-navy-400">
            Prospects ({outreachProspects.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Activities Tab ── */}
        <TabsContent value="activities" className="mt-4">
          {outreachActivities.length === 0 ? (
            <div className="text-center py-16 text-navy-500">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-white/60">No activities yet</p>
              <p className="text-sm mt-1">Record your first outreach activity to get started.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {outreachActivities.map(a => {
                const teamNames = a.teamMemberIds
                  .map(id => activeMembers.find(m => m.id === id))
                  .filter(Boolean)
                  .map(m => `${m!.firstName} ${m!.lastName}`);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-navy-800 border border-navy-700 rounded-xl p-4 space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white text-sm">{a.title}</p>
                        <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 font-medium">
                          {a.type}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => setActivityForm({ open: true, editing: a })}
                          className="p-1.5 rounded-lg text-navy-400 hover:text-white hover:bg-navy-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteOutreachActivity(a.id)}
                          className="p-1.5 rounded-lg text-navy-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs text-navy-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {format(parseISO(a.date), 'EEE, MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {a.location}
                      </div>
                      {teamNames.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{teamNames.slice(0, 3).join(', ')}{teamNames.length > 3 ? ` +${teamNames.length - 3}` : ''}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-navy-700 flex items-center justify-between">
                      <span className="text-xs text-navy-500">Prospects reached</span>
                      <span className="text-lg font-bold text-white">{a.prospectsReached}</span>
                    </div>
                    {a.notes && <p className="text-xs text-navy-500 line-clamp-2">{a.notes}</p>}
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Prospects Tab ── */}
        <TabsContent value="prospects" className="mt-4 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {(['All', ...PIPELINE_COLS.map(c => c.status)] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s as OutreachFollowUpStatus | 'All')}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    filterStatus === s ? 'bg-gold-500 text-navy-900' : 'bg-navy-800 text-navy-400 hover:text-white border border-navy-700')}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search prospects…"
                className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500 w-44" />
              <div className="flex bg-navy-800 border border-navy-700 rounded-lg overflow-hidden">
                <button onClick={() => setProspectView('list')}
                  className={cn('p-2 transition-colors', prospectView === 'list' ? 'bg-navy-700 text-white' : 'text-navy-400 hover:text-white')}>
                  <LayoutList className="w-4 h-4" />
                </button>
                <button onClick={() => setProspectView('pipeline')}
                  className={cn('p-2 transition-colors', prospectView === 'pipeline' ? 'bg-navy-700 text-white' : 'text-navy-400 hover:text-white')}>
                  <Kanban className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* List view */}
          {prospectView === 'list' && (
            filteredProspects.length === 0 ? (
              <div className="text-center py-12 text-navy-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No prospects found.</p>
              </div>
            ) : (
              <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy-700 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden sm:table-cell">Activity</th>
                      <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Interest</th>
                      <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-700">
                    {filteredProspects.map(p => {
                      const activity = outreachActivities.find(a => a.id === p.activityId);
                      return (
                        <tr key={p.id} className="hover:bg-navy-750 group">
                          <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                          <td className="px-4 py-3 text-navy-400">{p.phone ?? '—'}</td>
                          <td className="px-4 py-3 text-navy-400 hidden sm:table-cell">{activity?.title ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', INTEREST_COLORS[p.interestLevel])}>
                              {p.interestLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                              p.status === 'Converted' ? 'bg-sage-500/20 text-sage-400' :
                              p.status === 'Attended' ? 'bg-amber-500/20 text-amber-400' :
                              p.status === 'Invited' ? 'bg-purple-500/20 text-purple-400' :
                              'bg-blue-500/20 text-blue-400')}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setProspectForm({ open: true, editing: p })}
                                className="p-1.5 rounded text-navy-400 hover:text-white hover:bg-navy-700 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteOutreachProspect(p.id)}
                                className="p-1.5 rounded text-navy-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Pipeline / Kanban view */}
          {prospectView === 'pipeline' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PIPELINE_COLS.map(col => {
                const cards = outreachProspects.filter(p => p.status === col.status);
                return (
                  <div key={col.status} className={cn('border rounded-xl p-3 min-h-[300px]', col.colClass)}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn('text-xs font-bold uppercase tracking-wider', col.headerClass)}>{col.label}</span>
                      <span className="text-xs text-navy-500 bg-navy-800/60 px-2 py-0.5 rounded-full">{cards.length}</span>
                    </div>
                    <div className="space-y-2">
                      {cards.map(p => (
                        <motion.div
                          key={p.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-navy-800 border border-navy-700 rounded-lg p-3 group cursor-pointer hover:border-navy-600 transition-colors"
                          onClick={() => setProspectForm({ open: true, editing: p })}
                        >
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <p className="text-sm font-medium text-white leading-tight">{p.name}</p>
                            <button
                              onClick={e => { e.stopPropagation(); deleteOutreachProspect(p.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-navy-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {p.phone && (
                            <div className="flex items-center gap-1 text-xs text-navy-400 mb-2">
                              <Phone className="w-3 h-3" />{p.phone}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className={cn('text-[11px] px-1.5 py-0.5 rounded font-medium', INTEREST_COLORS[p.interestLevel])}>
                              {p.interestLevel}
                            </span>
                            {col.next ? (
                              <button
                                onClick={e => { e.stopPropagation(); moveNext(p, col.next!); }}
                                className="flex items-center gap-0.5 text-[11px] text-navy-400 hover:text-white transition-colors"
                              >
                                {col.next} <ChevronRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-sage-400">
                                <Check className="w-3 h-3" /> Converted
                              </span>
                            )}
                          </div>
                          {p.notes && <p className="mt-2 text-[11px] text-navy-500 line-clamp-2">{p.notes}</p>}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {activityForm.open && (
        <ActivityForm
          initial={activityForm.editing}
          members={activeMembers}
          onSave={activityForm.editing ? updateOutreachActivity : addOutreachActivity}
          onClose={() => setActivityForm({ open: false })}
        />
      )}
      {prospectForm.open && (
        <ProspectForm
          initial={prospectForm.editing}
          activities={outreachActivities}
          onSave={prospectForm.editing ? updateOutreachProspect : addOutreachProspect}
          onClose={() => setProspectForm({ open: false })}
        />
      )}
    </div>
  );
}
