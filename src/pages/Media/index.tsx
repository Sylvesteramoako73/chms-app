import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useMedia } from '@/hooks/useMedia';
import { useRole } from '@/context/RoleContext';
import type { Sermon } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  PlayCircle, Plus, Search, Mic2, Star, Eye, Download,
  Music, Video, Pencil, Trash2, Tag, BookOpen, ExternalLink, FileText,
} from 'lucide-react';
import { cn } from '@/utils';

const CATEGORY_COLORS: Record<string, string> = {
  '#C9A84C': 'bg-gold-500/10 text-gold-700 dark:text-gold-400',
  '#4A7C6F': 'bg-sage-500/10 text-sage-700 dark:text-sage-400',
  '#6366f1': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  '#f97316': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  '#ec4899': 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
};

const EMPTY_SERMON: Omit<Sermon, 'id' | 'createdAt' | 'viewCount'> = {
  title: '', preacherId: undefined, categoryId: undefined,
  scripture: '', description: '', date: format(new Date(), 'yyyy-MM-dd'),
  audioUrl: '', videoUrl: '', pdfUrl: '', thumbnailUrl: '',
  tags: [], duration: '', isFeatured: false,
};

export default function Media() {
  const { sermons, categories, preachers, loading, addSermon, updateSermon, deleteSermon, incrementView, addPreacher, deletePreacher, addCategory, deleteCategory } = useMedia();
  const { actions } = useRole();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [preacherFilter, setPreacherFilter] = useState('all');
  const [sermonDialog, setSermonDialog] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [sForm, setSForm] = useState({ ...EMPTY_SERMON });
  const [tagsInput, setTagsInput] = useState('');
  const [detailSermon, setDetailSermon] = useState<Sermon | null>(null);

  const [preacherDialog, setPreacherDialog] = useState(false);
  const [pForm, setPForm] = useState({ name: '', title: '', bio: '', avatarUrl: '' });

  const [catDialog, setCatDialog] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', color: '#4A7C6F' });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sermons.filter(s => {
      if (catFilter !== 'all' && s.categoryId !== catFilter) return false;
      if (preacherFilter !== 'all' && s.preacherId !== preacherFilter) return false;
      return s.title.toLowerCase().includes(q) || (s.scripture ?? '').toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q));
    });
  }, [sermons, search, catFilter, preacherFilter]);

  const featured = useMemo(() => sermons.find(s => s.isFeatured) ?? sermons[0], [sermons]);
  const totalViews = useMemo(() => sermons.reduce((sum, s) => sum + s.viewCount, 0), [sermons]);

  const openAdd = () => { setEditingSermon(null); setSForm({ ...EMPTY_SERMON }); setTagsInput(''); setSermonDialog(true); };
  const openEdit = (s: Sermon) => {
    setEditingSermon(s);
    setSForm({ title: s.title, preacherId: s.preacherId, categoryId: s.categoryId, scripture: s.scripture ?? '', description: s.description ?? '', date: s.date, audioUrl: s.audioUrl ?? '', videoUrl: s.videoUrl ?? '', pdfUrl: s.pdfUrl ?? '', thumbnailUrl: s.thumbnailUrl ?? '', tags: s.tags, duration: s.duration ?? '', isFeatured: s.isFeatured });
    setTagsInput(s.tags.join(', '));
    setSermonDialog(true);
  };

  const handleSave = () => {
    if (!sForm.title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (editingSermon) {
      updateSermon({ ...editingSermon, ...sForm, tags });
      toast({ title: 'Sermon updated' });
    } else {
      addSermon({ id: `sm${Date.now()}`, ...sForm, tags, viewCount: 0, createdAt: new Date().toISOString() });
      toast({ title: 'Sermon added', description: `"${sForm.title}" has been added to the library.` });
    }
    setSermonDialog(false);
  };

  const handleOpenDetail = (s: Sermon) => {
    setDetailSermon(s);
    incrementView(s.id);
  };

  const handleSavePreacher = () => {
    if (!pForm.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    addPreacher({ id: `pr${Date.now()}`, name: pForm.name, title: pForm.title || undefined, bio: pForm.bio || undefined, avatarUrl: pForm.avatarUrl || undefined });
    toast({ title: 'Preacher added' });
    setPForm({ name: '', title: '', bio: '', avatarUrl: '' });
    setPreacherDialog(false);
  };

  const handleSaveCategory = () => {
    if (!catForm.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    addCategory({ id: `sc${Date.now()}`, name: catForm.name, color: catForm.color });
    toast({ title: 'Category added' });
    setCatForm({ name: '', color: '#4A7C6F' });
    setCatDialog(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Media Library</h1>
          <p className="text-sm text-muted-foreground">Sermons, teachings, devotionals, and resources</p>
        </div>
        {actions.canManageMedia && (
          <Button size="sm" onClick={openAdd} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium shrink-0">
            <Plus className="w-4 h-4" /> Add Sermon
          </Button>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Sermons', value: sermons.length, icon: PlayCircle, color: 'text-gold-500' },
          { label: 'Total Views', value: totalViews, icon: Eye, color: 'text-sage-500' },
          { label: 'Preachers', value: preachers.length, icon: Mic2, color: 'text-blue-500' },
          { label: 'Categories', value: categories.length, icon: Tag, color: 'text-purple-500' },
        ].map(s => (
          <Card key={s.label} className="glass border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div>
                <p className="text-xl font-bold">{s.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Featured Sermon Banner */}
      {featured && (
        <Card className="glass border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="relative h-36 sm:h-48 bg-gradient-to-r from-navy-900 to-navy-700 flex items-end">
              {featured.thumbnailUrl && (
                <img src={featured.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
              )}
              <div className="relative z-10 p-5 text-white w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gold-400">Featured</span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight mb-1">{featured.title}</h2>
                <div className="flex items-center gap-3 text-xs text-white/70">
                  {featured.preacherId && <span>{preachers.find(p => p.id === featured.preacherId)?.name}</span>}
                  <span>{format(new Date(featured.date), 'MMM d, yyyy')}</span>
                  {featured.scripture && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{featured.scripture}</span>}
                </div>
              </div>
              <Button size="sm" className="absolute right-4 top-1/2 -translate-y-1/2 gap-1.5 bg-gold-500 hover:bg-gold-400 text-navy-900 font-semibold" onClick={() => handleOpenDetail(featured)}>
                <PlayCircle className="w-4 h-4" /> Play
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="library">
        <TabsList className="glass border-none">
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="preachers">Preachers</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* ── Library Tab ── */}
        <TabsContent value="library" className="space-y-4 mt-4">
          {/* Search & Filters */}
          <Card className="glass border-none shadow-sm">
            <CardContent className="p-3 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sermons, scripture, tags…" className="pl-8 h-8 text-sm" />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="h-8 text-sm w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={preacherFilter} onValueChange={setPreacherFilter}>
                <SelectTrigger className="h-8 text-sm w-[150px]"><SelectValue placeholder="Preacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Preachers</SelectItem>
                  {preachers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <PlayCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">{search ? 'No sermons match your search.' : 'No sermons uploaded yet.'}</p>
              {actions.canManageMedia && <Button size="sm" variant="outline" onClick={openAdd} className="mt-4 gap-1"><Plus className="w-3.5 h-3.5" /> Add First Sermon</Button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(s => {
                const preacher = preachers.find(p => p.id === s.preacherId);
                const cat = categories.find(c => c.id === s.categoryId);
                const catStyle = cat ? (CATEGORY_COLORS[cat.color] ?? 'bg-muted text-muted-foreground') : null;
                const hasAudio = !!s.audioUrl;
                const hasVideo = !!s.videoUrl;
                const hasPdf = !!s.pdfUrl;
                return (
                  <Card key={s.id} className="glass border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => handleOpenDetail(s)}>
                    <CardContent className="p-0">
                      {/* Thumbnail */}
                      <div className="relative h-36 bg-gradient-to-br from-navy-800 to-navy-900 rounded-t-xl overflow-hidden">
                        {s.thumbnailUrl ? (
                          <img src={s.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <PlayCircle className="w-12 h-12 text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                        {s.isFeatured && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-gold-500/90 text-navy-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            <Star className="w-2.5 h-2.5 fill-current" /> Featured
                          </div>
                        )}
                        {/* Media type badges */}
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          {hasAudio && <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"><Music className="w-2.5 h-2.5" /> Audio</span>}
                          {hasVideo && <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"><Video className="w-2.5 h-2.5" /> Video</span>}
                          {hasPdf && <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" /> PDF</span>}
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-3.5">
                        {cat && catStyle && <span className={cn('inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1.5', catStyle)}>{cat.name}</span>}
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1">{s.title}</h3>
                        {preacher && <p className="text-xs text-muted-foreground">{preacher.title ? `${preacher.title} ` : ''}{preacher.name}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground">{format(new Date(s.date), 'MMM d, yyyy')}{s.duration && ` · ${s.duration}`}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {s.viewCount}</span>
                        </div>
                        {s.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {s.tags.slice(0, 3).map(tag => <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{tag}</span>)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Preachers Tab ── */}
        <TabsContent value="preachers" className="space-y-4 mt-4">
          {actions.canManageMedia && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setPreacherDialog(true)} className="gap-1.5 h-8 bg-white hover:bg-gray-50 text-navy-900 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Preacher
              </Button>
            </div>
          )}
          {preachers.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <Mic2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No preachers added yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {preachers.map(p => {
                const count = sermons.filter(s => s.preacherId === p.id).length;
                return (
                  <Card key={p.id} className="glass border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-navy-700 flex items-center justify-center text-white font-bold shrink-0 border border-navy-600">
                        {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" /> : p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{p.name}</p>
                        {p.title && <p className="text-xs text-muted-foreground truncate">{p.title}</p>}
                        <p className="text-xs text-gold-600 dark:text-gold-400">{count} sermon{count !== 1 ? 's' : ''}</p>
                      </div>
                      {actions.canManageMedia && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => { deletePreacher(p.id); toast({ title: 'Preacher removed' }); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Categories Tab ── */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          {actions.canManageMedia && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setCatDialog(true)} className="gap-1.5 h-8 bg-white hover:bg-gray-50 text-navy-900 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Category
              </Button>
            </div>
          )}
          {categories.length === 0 ? (
            <div className="glass rounded-xl border border-dashed border-border p-16 text-center">
              <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No categories yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map(cat => {
                const count = sermons.filter(s => s.categoryId === cat.id).length;
                const catStyle = CATEGORY_COLORS[cat.color] ?? 'bg-muted text-muted-foreground';
                return (
                  <Card key={cat.id} className="glass border-none shadow-sm">
                    <CardContent className="p-3.5 flex items-center justify-between gap-2">
                      <div>
                        <span className={cn('inline-flex text-xs font-semibold px-2 py-0.5 rounded mb-1', catStyle)}>{cat.name}</span>
                        <p className="text-xs text-muted-foreground">{count} sermon{count !== 1 ? 's' : ''}</p>
                      </div>
                      {actions.canManageMedia && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => { deleteCategory(cat.id); toast({ title: 'Category removed' }); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sermon Detail Dialog */}
      <Dialog open={!!detailSermon} onOpenChange={() => setDetailSermon(null)}>
        {detailSermon && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-xl leading-tight">{detailSermon.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {detailSermon.preacherId && <span className="flex items-center gap-1"><Mic2 className="w-3 h-3" />{preachers.find(p => p.id === detailSermon.preacherId)?.name}</span>}
                <span>{format(new Date(detailSermon.date), 'MMMM d, yyyy')}</span>
                {detailSermon.duration && <span>⏱ {detailSermon.duration}</span>}
                {detailSermon.scripture && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{detailSermon.scripture}</span>}
              </div>
              {detailSermon.description && <p className="text-sm text-muted-foreground">{detailSermon.description}</p>}
              {detailSermon.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {detailSermon.tags.map(t => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
              )}
              <div className="grid grid-cols-1 gap-2">
                {detailSermon.audioUrl && (
                  <a href={detailSermon.audioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Music className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium flex-1">Listen to Audio</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                )}
                {detailSermon.videoUrl && (
                  <a href={detailSermon.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Video className="w-4 h-4 text-sage-500" />
                    <span className="text-sm font-medium flex-1">Watch Video</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                )}
                {detailSermon.pdfUrl && (
                  <a href={detailSermon.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Download className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium flex-1">Download Notes (PDF)</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                )}
                {!detailSermon.audioUrl && !detailSermon.videoUrl && !detailSermon.pdfUrl && (
                  <p className="text-sm text-muted-foreground text-center py-4">No media links available.</p>
                )}
              </div>
              <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> {detailSermon.viewCount} views</span>
                {actions.canManageMedia && (
                  <div className="flex gap-2 ml-auto">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { openEdit(detailSermon); setDetailSermon(null); }}><Pencil className="w-3 h-3" /> Edit</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => { deleteSermon(detailSermon.id); setDetailSermon(null); toast({ title: 'Sermon deleted' }); }}><Trash2 className="w-3 h-3" /> Delete</Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Add/Edit Sermon Dialog */}
      <Dialog open={sermonDialog} onOpenChange={setSermonDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editingSermon ? 'Edit Sermon' : 'Add Sermon'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>Title *</Label>
              <Input value={sForm.title} onChange={e => setSForm(f => ({ ...f, title: e.target.value }))} placeholder="Sermon title" />
            </div>
            <div className="space-y-1.5">
              <Label>Preacher</Label>
              <Select value={sForm.preacherId ?? ''} onValueChange={v => setSForm(f => ({ ...f, preacherId: v || undefined }))}>
                <SelectTrigger><SelectValue placeholder="Select preacher…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {preachers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={sForm.categoryId ?? ''} onValueChange={v => setSForm(f => ({ ...f, categoryId: v || undefined }))}>
                <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={sForm.date} onChange={e => setSForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Input value={sForm.duration} onChange={e => setSForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 45 min" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Scripture Reference</Label>
              <Input value={sForm.scripture} onChange={e => setSForm(f => ({ ...f, scripture: e.target.value }))} placeholder="e.g. John 3:16" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Description</Label>
              <textarea className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring" value={sForm.description} onChange={e => setSForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Audio URL</Label>
              <Input value={sForm.audioUrl} onChange={e => setSForm(f => ({ ...f, audioUrl: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Video URL</Label>
              <Input value={sForm.videoUrl} onChange={e => setSForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://youtube.com/… or direct link" />
            </div>
            <div className="space-y-1.5">
              <Label>PDF Notes URL</Label>
              <Input value={sForm.pdfUrl} onChange={e => setSForm(f => ({ ...f, pdfUrl: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label>Thumbnail URL</Label>
              <Input value={sForm.thumbnailUrl} onChange={e => setSForm(f => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="https://…" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="faith, prayer, healing" />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input type="checkbox" id="featured" className="accent-gold-500 w-4 h-4" checked={sForm.isFeatured} onChange={e => setSForm(f => ({ ...f, isFeatured: e.target.checked }))} />
              <Label htmlFor="featured" className="cursor-pointer flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-gold-500" /> Feature this sermon</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSermonDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">{editingSermon ? 'Save Changes' : 'Add Sermon'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Preacher Dialog */}
      <Dialog open={preacherDialog} onOpenChange={setPreacherDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-2xl">Add Preacher</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pastor John" /></div>
            <div className="space-y-1.5"><Label>Title</Label><Input value={pForm.title} onChange={e => setPForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Pastor" /></div>
            <div className="space-y-1.5"><Label>Bio</Label><Input value={pForm.bio} onChange={e => setPForm(f => ({ ...f, bio: e.target.value }))} placeholder="Brief biography…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreacherDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePreacher} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-2xl">Add Category</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sunday Service" /></div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(CATEGORY_COLORS).map(c => (
                  <button key={c} className={cn('w-7 h-7 rounded-full border-2 transition-all', catForm.color === c ? 'border-white scale-110' : 'border-transparent')} style={{ backgroundColor: c }} onClick={() => setCatForm(f => ({ ...f, color: c }))} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} className="bg-white hover:bg-gray-50 text-navy-900 font-medium">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
