import { useState, useEffect, useCallback } from 'react';
import type { Sermon, SermonCategory, Preacher } from '@/types';
import { supabase } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapPreacher = (r: any): Preacher => ({
  id: r.id, name: r.name, title: r.title ?? undefined,
  bio: r.bio ?? undefined, avatarUrl: r.avatar_url ?? undefined,
});
const toPreachers = (p: Preacher) => ({
  id: p.id, name: p.name, title: p.title ?? null,
  bio: p.bio ?? null, avatar_url: p.avatarUrl ?? null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapCategory = (r: any): SermonCategory => ({
  id: r.id, name: r.name, color: r.color ?? '#4A7C6F',
});
const toCategory = (c: SermonCategory) => ({ id: c.id, name: c.name, color: c.color });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapSermon = (r: any): Sermon => ({
  id: r.id, title: r.title,
  preacherId: r.preacher_id ?? undefined, categoryId: r.category_id ?? undefined,
  scripture: r.scripture ?? undefined, description: r.description ?? undefined,
  date: r.date, audioUrl: r.audio_url ?? undefined, videoUrl: r.video_url ?? undefined,
  pdfUrl: r.pdf_url ?? undefined, thumbnailUrl: r.thumbnail_url ?? undefined,
  tags: r.tags ?? [], duration: r.duration ?? undefined,
  isFeatured: r.is_featured ?? false, viewCount: r.view_count ?? 0,
  createdAt: r.created_at ?? new Date().toISOString(),
});
const toSermonRow = (s: Sermon) => ({
  id: s.id, title: s.title,
  preacher_id: s.preacherId ?? null, category_id: s.categoryId ?? null,
  scripture: s.scripture ?? null, description: s.description ?? null,
  date: s.date, audio_url: s.audioUrl ?? null, video_url: s.videoUrl ?? null,
  pdf_url: s.pdfUrl ?? null, thumbnail_url: s.thumbnailUrl ?? null,
  tags: s.tags, duration: s.duration ?? null,
  is_featured: s.isFeatured, view_count: s.viewCount,
});

export function useMedia() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [categories, setCategories] = useState<SermonCategory[]>([]);
  const [preachers, setPreachers] = useState<Preacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: c }, { data: p }] = await Promise.all([
        supabase.from('sermons').select('*').order('date', { ascending: false }),
        supabase.from('sermon_categories').select('*'),
        supabase.from('preachers').select('*'),
      ]);
      setSermons(s?.map(mapSermon) ?? []);
      setCategories(c?.map(mapCategory) ?? []);
      setPreachers(p?.map(mapPreacher) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const addSermon = useCallback((sermon: Sermon) => {
    setSermons(prev => [sermon, ...prev]);
    supabase.from('sermons').insert(toSermonRow(sermon)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const updateSermon = useCallback((updated: Sermon) => {
    setSermons(prev => prev.map(s => s.id === updated.id ? updated : s));
    supabase.from('sermons').update(toSermonRow(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const deleteSermon = useCallback((id: string) => {
    setSermons(prev => prev.filter(s => s.id !== id));
    supabase.from('sermons').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const incrementView = useCallback((id: string) => {
    setSermons(prev => prev.map(s => s.id === id ? { ...s, viewCount: s.viewCount + 1 } : s));
    const sermon = sermons.find(s => s.id === id);
    if (sermon) {
      supabase.from('sermons').update({ view_count: sermon.viewCount + 1 }).eq('id', id).then(() => undefined);
    }
  }, [sermons]);

  const addPreacher = useCallback((preacher: Preacher) => {
    setPreachers(prev => [...prev, preacher]);
    supabase.from('preachers').insert(toPreachers(preacher)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const updatePreacher = useCallback((updated: Preacher) => {
    setPreachers(prev => prev.map(p => p.id === updated.id ? updated : p));
    supabase.from('preachers').update(toPreachers(updated)).eq('id', updated.id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const deletePreacher = useCallback((id: string) => {
    setPreachers(prev => prev.filter(p => p.id !== id));
    supabase.from('preachers').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const addCategory = useCallback((cat: SermonCategory) => {
    setCategories(prev => [...prev, cat]);
    supabase.from('sermon_categories').insert(toCategory(cat)).then(({ error }) => { if (error) console.error(error); });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    supabase.from('sermon_categories').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
  }, []);

  return {
    sermons, categories, preachers, loading,
    addSermon, updateSermon, deleteSermon, incrementView,
    addPreacher, updatePreacher, deletePreacher,
    addCategory, deleteCategory,
  };
}
