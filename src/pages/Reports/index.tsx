import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, TrendingUp, Users, Coins, CalendarCheck, Loader2, Share2 } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, getDaysInMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const GHS = '₵';
const CHART_COLORS = ['#0B1120', '#C9A84C', '#4A7C6F', '#7090bc', '#D4B96A', '#9b59b6', '#e67e22'];

export default function Reports() {
  const { members: allMembers, attendance: allAttendance, giving: allGiving, campaigns, pledges, departments, campuses } = useData();
  const { actions, role } = useRole();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 5), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exporting, setExporting] = useState(false);
  const currentYear = new Date().getFullYear();
  const [annualYear, setAnnualYear] = useState(currentYear);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Export dialog
  const [exportOpen, setExportOpen] = useState(false);
  const [exportType, setExportType] = useState<'annual' | 'monthly' | 'period'>('annual');
  const [dlYear, setDlYear] = useState(currentYear);
  const [dlMonth, setDlMonth] = useState(new Date().getMonth() + 1);
  const [dlStart, setDlStart] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [dlEnd, setDlEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Branch Pastor is locked to their own branch; Admin can pick any or all
  const activeBranchId = role === 'Branch Pastor' ? (profile?.branchId ?? null) : (selectedBranch === 'all' ? null : selectedBranch);
  const activeBranchName = activeBranchId ? (campuses.find(c => c.id === activeBranchId)?.name ?? 'Branch') : 'All Branches';

  const members    = activeBranchId ? allMembers.filter(m => m.campusId === activeBranchId)    : allMembers;
  const giving     = activeBranchId ? allGiving.filter(g => g.campusId === activeBranchId)     : allGiving;
  const attendance = activeBranchId ? allAttendance.filter(a => a.campusId === activeBranchId) : allAttendance;

  const membershipChartRef   = useRef<HTMLDivElement>(null);
  const financialChartRef    = useRef<HTMLDivElement>(null);
  const attendanceChartRef   = useRef<HTMLDivElement>(null);
  const givingTypeChartRef   = useRef<HTMLDivElement>(null);
  const attendanceTypeChartRef = useRef<HTMLDivElement>(null);
  const deptChartRef         = useRef<HTMLDivElement>(null);

  const months = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (s > e) return [];
    return eachMonthOfInterval({ start: startOfMonth(s), end: endOfMonth(e) });
  }, [startDate, endDate]);

  const rangeStart = new Date(startDate);
  const rangeEnd   = new Date(endDate);
  const rangeGiving     = giving.filter(g => { const d = new Date(g.date); return d >= rangeStart && d <= rangeEnd; });
  const rangeAttendance = attendance.filter(a => { const d = new Date(a.date); return d >= rangeStart && d <= rangeEnd; });
  const newMembersInRange = members.filter(m => { const d = new Date(m.joinDate); return d >= rangeStart && d <= rangeEnd; });
  const totalGiving    = rangeGiving.reduce((s, g) => s + g.amount, 0);
  const avgAttendance  = rangeAttendance.length > 0
    ? Math.round(rangeAttendance.reduce((s, a) => s + a.presentMemberIds.length + a.visitorsCount, 0) / rangeAttendance.length)
    : 0;

  const membershipData = useMemo(() =>
    months.map(month => ({
      name: format(month, 'MMM yy'),
      Members: members.filter(m => new Date(m.joinDate) <= endOfMonth(month)).length,
    })), [months, members]);

  const financialData = useMemo(() =>
    months.map(month => {
      const s = startOfMonth(month); const e = endOfMonth(month);
      const recs = giving.filter(g => { const d = new Date(g.date); return d >= s && d <= e; });
      return {
        name: format(month, 'MMM yy'),
        Tithes:    recs.filter(g => g.type === 'Tithe').reduce((acc, g) => acc + g.amount, 0),
        Offerings: recs.filter(g => g.type === 'Offering').reduce((acc, g) => acc + g.amount, 0),
        Other:     recs.filter(g => g.type !== 'Tithe' && g.type !== 'Offering').reduce((acc, g) => acc + g.amount, 0),
      };
    }), [months, giving]);

  const attendanceData = useMemo(() =>
    months.map(month => {
      const s = startOfMonth(month); const e = endOfMonth(month);
      const recs = attendance.filter(a => { const d = new Date(a.date); return d >= s && d <= e; });
      const avg = recs.length > 0
        ? Math.round(recs.reduce((acc, a) => acc + a.presentMemberIds.length + a.visitorsCount, 0) / recs.length) : 0;
      return { name: format(month, 'MMM yy'), Attendance: avg, Services: recs.length };
    }), [months, attendance]);

  const givingTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    rangeGiving.forEach(g => { types[g.type] = (types[g.type] ?? 0) + g.amount; });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [rangeGiving]);

  const attendanceByType = useMemo(() => {
    const types: Record<string, { total: number; count: number }> = {};
    rangeAttendance.forEach(a => {
      if (!types[a.serviceType]) types[a.serviceType] = { total: 0, count: 0 };
      types[a.serviceType].total += a.presentMemberIds.length + a.visitorsCount;
      types[a.serviceType].count++;
    });
    return Object.entries(types).map(([name, v]) => ({ name, Avg: Math.round(v.total / v.count), Sessions: v.count }));
  }, [rangeAttendance]);

  const deptData = useMemo(() =>
    departments
      .map(d => ({ name: d.name, value: members.filter(m => m.departmentId === d.id).length }))
      .filter(d => d.value > 0),
    [departments, members]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    members.forEach(m => { counts[m.status] = (counts[m.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [members]);

  const campaignSummary = useMemo(() =>
    campaigns.map(c => {
      const cp = pledges.filter(p => p.campaignId === c.id);
      const raised = cp.reduce((s, p) => s + p.paidAmount, 0);
      const pct = c.goalAmount > 0 ? Math.min(Math.round((raised / c.goalAmount) * 100), 100) : 0;
      return { ...c, raised, pct };
    }), [campaigns, pledges]);

  const tooltipStyle = { borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: 'hsl(var(--card))' };

  const loadLogoDataUrl = (): Promise<string> =>
    fetch('/logo.png').then(r => r.blob()).then(b => new Promise<string>(res => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(b);
    }));

  const generatePeriodPDF = async (start: Date, end: Date, periodLabel: string) => {
    if (!actions.canExportReports) {
      toast({ title: 'Access denied', description: 'Your role cannot export reports.', variant: 'destructive' }); return;
    }
    setExporting(true);
    try {
      const logoDataUrl = await loadLogoDataUrl();
      const GHS = 'GHS';
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 14;
      const CW = W - M * 2;

      const pGiving     = giving.filter(g => { const d = new Date(g.date); return d >= start && d <= end; });
      const pAttendance = attendance.filter(a => { const d = new Date(a.date); return d >= start && d <= end; });
      const pNewMembers = members.filter(m => { const d = new Date(m.joinDate); return d >= start && d <= end; });
      const pTotal      = pGiving.reduce((s, g) => s + g.amount, 0);
      const pAvgAtt     = pAttendance.length > 0
        ? Math.round(pAttendance.reduce((s, a) => s + a.presentMemberIds.length + a.visitorsCount, 0) / pAttendance.length) : 0;

      let y = M;

      const paintHeader = () => {
        doc.setFillColor(11, 17, 32); doc.rect(0, 0, W, 28, 'F');
        doc.setFillColor(255, 255, 255); doc.roundedRect(M - 2, 3, 22, 22, 1, 1, 'F');
        doc.addImage(logoDataUrl, 'PNG', M - 1, 4, 20, 20);
        doc.setTextColor(201, 168, 76); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.text('Faith ChurchCare', M + 24, 12);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 190, 210); doc.text('Reports & Analytics', M + 24, 19);
        doc.setTextColor(120, 130, 150);
        doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, W - M, 19, { align: 'right' });
        doc.text(`${periodLabel} · ${activeBranchName}`, W - M, 12, { align: 'right' });
      };

      const newPage = () => { doc.addPage(); paintHeader(); y = 36; };
      const checkSpace = (n: number) => { if (y + n > H - M) newPage(); };

      paintHeader(); y = 38;

      // Summary boxes
      const stats = [
        { label: 'New Members',   value: String(pNewMembers.length) },
        { label: 'Total Giving',  value: `${GHS}${pTotal.toLocaleString()}` },
        { label: 'Services Held', value: String(pAttendance.length) },
        { label: 'Avg Attendance',value: String(pAvgAtt) },
      ];
      const bW = (CW - 6) / 4;
      stats.forEach((s, i) => {
        const x = M + i * (bW + 2);
        doc.setFillColor(245, 245, 240); doc.roundedRect(x, y, bW, 18, 3, 3, 'F');
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 17, 32);
        doc.text(s.value, x + bW / 2, y + 10, { align: 'center' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 110, 130);
        doc.text(s.label, x + bW / 2, y + 16, { align: 'center' });
      });
      y += 26;

      const sectionHead = (title: string) => {
        checkSpace(14);
        doc.setFillColor(201, 168, 76); doc.rect(M, y, 3, 10, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(11, 17, 32);
        doc.text(title, M + 6, y + 7); y += 14;
      };

      // Finance
      sectionHead('Financial Overview');
      const givingTypes: Record<string, number> = {};
      pGiving.forEach(g => { givingTypes[g.type] = (givingTypes[g.type] ?? 0) + g.amount; });
      const mColX = [M + 3, M + 50, M + 95, M + 130, M + 160];
      doc.setFillColor(11, 17, 32); doc.rect(M, y, CW, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
      ['Type', 'Amount', '', '', '%'].forEach((h, i) => doc.text(h, mColX[i], y + 5));
      y += 7;
      Object.entries(givingTypes).forEach(([type, amount], ri) => {
        checkSpace(7);
        doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248); doc.rect(M, y, CW, 7, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 60, 80);
        doc.text(type, M + 3, y + 5);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 17, 32);
        doc.text(`${GHS}${amount.toLocaleString()}`, W - M - 3, y + 5, { align: 'right' });
        const pct = pTotal > 0 ? Math.round((amount / pTotal) * 100) : 0;
        doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 130, 150);
        doc.text(`${pct}%`, W - M - 22, y + 5, { align: 'right' });
        y += 7;
      });
      checkSpace(8);
      doc.setFillColor(220, 225, 235); doc.rect(M, y, CW, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(11, 17, 32);
      doc.text('TOTAL', M + 3, y + 5.5);
      doc.text(`${GHS}${pTotal.toLocaleString()}`, W - M - 3, y + 5.5, { align: 'right' });
      y += 14;

      // Attendance
      sectionHead('Attendance Summary');
      const attByType: Record<string, { total: number; count: number }> = {};
      pAttendance.forEach(a => {
        if (!attByType[a.serviceType]) attByType[a.serviceType] = { total: 0, count: 0 };
        attByType[a.serviceType].total += a.presentMemberIds.length + a.visitorsCount;
        attByType[a.serviceType].count++;
      });
      doc.setFillColor(11, 17, 32); doc.rect(M, y, CW, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
      doc.text('Service Type', M + 3, y + 5); doc.text('Sessions', M + 110, y + 5); doc.text('Avg Attendance', M + 145, y + 5);
      y += 7;
      Object.entries(attByType).forEach(([type, v], ri) => {
        checkSpace(7);
        doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248); doc.rect(M, y, CW, 7, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 60, 80);
        doc.text(type, M + 3, y + 5); doc.text(String(v.count), M + 110, y + 5);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 17, 32);
        doc.text(String(Math.round(v.total / v.count)), M + 145, y + 5);
        y += 7;
      });
      if (Object.keys(attByType).length === 0) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120, 130, 150);
        doc.text('No attendance records for this period.', M + 3, y + 5); y += 10;
      }
      y += 6;

      // Membership
      sectionHead('Membership');
      const statusCounts: Record<string, number> = {};
      members.forEach(m => { statusCounts[m.status] = (statusCounts[m.status] ?? 0) + 1; });
      doc.setFillColor(11, 17, 32); doc.rect(M, y, CW, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
      doc.text('Status', M + 3, y + 5); doc.text('Count', M + 110, y + 5); doc.text('Share', M + 150, y + 5);
      y += 7;
      Object.entries(statusCounts).forEach(([status, count], ri) => {
        checkSpace(7);
        doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248); doc.rect(M, y, CW, 7, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 60, 80);
        doc.text(status, M + 3, y + 5); doc.text(String(count), M + 110, y + 5);
        const pct = members.length > 0 ? Math.round((count / members.length) * 100) : 0;
        doc.text(`${pct}%`, M + 150, y + 5); y += 7;
      });
      checkSpace(8);
      doc.setFillColor(220, 225, 235); doc.rect(M, y, CW, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(11, 17, 32);
      doc.text('TOTAL MEMBERS', M + 3, y + 5.5); doc.text(String(members.length), M + 110, y + 5.5);
      doc.text('100%', M + 150, y + 5.5); y += 14;

      // New members this period
      if (pNewMembers.length > 0) {
        sectionHead(`New Members This Period (${pNewMembers.length})`);
        doc.setFillColor(11, 17, 32); doc.rect(M, y, CW, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
        doc.text('Name', M + 3, y + 5); doc.text('Join Date', M + 110, y + 5); doc.text('Status', M + 150, y + 5);
        y += 7;
        pNewMembers.slice(0, 20).forEach((m, ri) => {
          checkSpace(7);
          doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248); doc.rect(M, y, CW, 7, 'F');
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 60, 80);
          doc.text(`${m.firstName} ${m.lastName}`.slice(0, 35), M + 3, y + 5);
          doc.text(format(new Date(m.joinDate), 'MMM d, yyyy'), M + 110, y + 5);
          doc.text(m.status, M + 150, y + 5); y += 7;
        });
        if (pNewMembers.length > 20) {
          doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 130, 150);
          doc.text(`…and ${pNewMembers.length - 20} more`, M + 3, y + 4); y += 8;
        }
      }

      // Page footers
      const totalPages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(7); doc.setTextColor(160, 170, 185);
        doc.text('Faith ChurchCare — Confidential', M, ph - 6);
        doc.text(`Page ${p} of ${totalPages}`, W - M, ph - 6, { align: 'right' });
      }

      const filename = `FaithChurchCare_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${activeBranchName.replace(/\s/g, '_')}.pdf`;
      doc.save(filename);
      toast({ title: 'Report downloaded', description: filename });
    } catch (err) {
      console.error(err);
      toast({ title: 'Export failed', description: 'Could not generate PDF.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    setExportOpen(false);
    if (exportType === 'annual') {
      handleAnnualReportPDF(dlYear);
    } else if (exportType === 'monthly') {
      const start = new Date(dlYear, dlMonth - 1, 1);
      const end = new Date(dlYear, dlMonth - 1, getDaysInMonth(start));
      generatePeriodPDF(start, end, format(start, 'MMMM yyyy'));
    } else {
      generatePeriodPDF(new Date(dlStart), new Date(dlEnd), `${format(new Date(dlStart), 'MMM d')} – ${format(new Date(dlEnd), 'MMM d, yyyy')}`);
    }
  };

  const handleShare = async () => {
    if (!actions.canExportReports) {
      toast({ title: 'Access denied', description: 'Your role cannot share reports.', variant: 'destructive' }); return;
    }
    const text = `ChurchCare Report (${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')})\n\nNew Members: ${newMembersInRange.length}\nTotal Giving: ${GHS}${totalGiving.toLocaleString()}\nServices Held: ${rangeAttendance.length}\nAvg Attendance: ${avgAttendance}`;
    if (navigator.share) {
      await navigator.share({ title: 'ChurchCare Report', text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied to clipboard', description: 'Report summary copied. Paste into any app.' });
    }
  };

  const handleAnnualReportPDF = async (year: number) => {
    if (!actions.canExportReports) {
      toast({ title: 'Access denied', description: 'Your role cannot export reports.', variant: 'destructive' }); return;
    }
    setExporting(true);
    try {
      const logoDataUrl = await loadLogoDataUrl();
      // jsPDF built-in fonts only support Latin-1; use ISO code instead of ₵
      const GHS = 'GHS'; // eslint-disable-line @typescript-eslint/no-shadow
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 14;
      const CW = W - M * 2;

      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      const yearGiving = giving.filter(g => { const d = new Date(g.date); return d >= yearStart && d <= yearEnd; });
      const yearAttendance = attendance.filter(a => { const d = new Date(a.date); return d >= yearStart && d <= yearEnd; });
      const yearNewMembers = members.filter(m => { const d = new Date(m.joinDate); return d >= yearStart && d <= yearEnd; });
      const yearTotalGiving = yearGiving.reduce((s, g) => s + g.amount, 0);
      const yearAvgAtt = yearAttendance.length > 0
        ? Math.round(yearAttendance.reduce((s, a) => s + a.presentMemberIds.length + a.visitorsCount, 0) / yearAttendance.length)
        : 0;

      // ── Cover Page ───────────────────────────────────────────────────────────
      doc.setFillColor(11, 17, 32);
      doc.rect(0, 0, W, H, 'F');
      doc.setFillColor(201, 168, 76);
      doc.rect(0, 0, W, 2, 'F');
      doc.rect(0, H - 2, W, 2, 'F');

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(W / 2 - 25, H / 2 - 68, 50, 50, 3, 3, 'F');
      doc.addImage(logoDataUrl, 'PNG', W / 2 - 24, H / 2 - 67, 48, 48);

      doc.setFontSize(72);
      doc.setTextColor(255, 255, 255);
      doc.text(String(year), W / 2, H / 2 + 18, { align: 'center' });

      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(201, 168, 76);
      doc.text('ANNUAL REPORT', W / 2, H / 2 + 32, { align: 'center' });

      doc.setDrawColor(201, 168, 76);
      doc.setLineWidth(0.4);
      doc.line(M + 20, H / 2 + 39, W - M - 20, H / 2 + 39);

      doc.setFontSize(9);
      doc.setTextColor(160, 170, 190);
      doc.text(`Prepared: ${format(new Date(), 'MMMM d, yyyy')}`, W / 2, H / 2 + 48, { align: 'center' });
      doc.text(`Total Members: ${members.length}`, W / 2, H / 2 + 56, { align: 'center' });

      // ── Content Pages ────────────────────────────────────────────────────────
      doc.addPage();
      let y = M;

      const paintHeader = () => {
        doc.setFillColor(11, 17, 32);
        doc.rect(0, 0, W, 24, 'F');
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(M - 2, 2, 20, 20, 1, 1, 'F');
        doc.addImage(logoDataUrl, 'PNG', M - 1, 3, 18, 18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(201, 168, 76);
        doc.text('Faith ChurchCare', M + 22, 12);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 170, 190);
        doc.text(`${year} Annual Report · ${activeBranchName}`, M + 22, 19);
        doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy')}`, W - M, 19, { align: 'right' });
      };

      const newPage = () => { doc.addPage(); paintHeader(); y = 32; };
      const checkSpace = (needed: number) => { if (y + needed > H - M) newPage(); };

      paintHeader();
      y = 32;

      // Executive Summary boxes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(11, 17, 32);
      doc.text('Executive Summary', M, y);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 130, 150);
      doc.text(`January 1 – December 31, ${year}`, M, y + 6);
      doc.setDrawColor(201, 168, 76);
      doc.setLineWidth(0.4);
      doc.line(M, y + 9, W - M, y + 9);
      y += 16;

      const summaryStats = [
        { label: 'Total Giving', value: `${GHS}${yearTotalGiving.toLocaleString()}` },
        { label: 'New Members', value: String(yearNewMembers.length) },
        { label: 'Services Held', value: String(yearAttendance.length) },
        { label: 'Avg Attendance', value: String(yearAvgAtt) },
      ];
      const bW = (CW - 4.5) / 4;
      summaryStats.forEach((s, i) => {
        const x = M + i * (bW + 1.5);
        doc.setFillColor(245, 245, 240);
        doc.roundedRect(x, y, bW, 20, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(11, 17, 32);
        doc.text(s.value, x + bW / 2, y + 11, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 110, 130);
        doc.text(s.label, x + bW / 2, y + 17, { align: 'center' });
      });
      y += 28;

      const sectionHead = (title: string) => {
        checkSpace(14);
        doc.setFillColor(201, 168, 76);
        doc.rect(M, y, 3, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(11, 17, 32);
        doc.text(title, M + 6, y + 7);
        y += 14;
      };

      // ── Finance ──────────────────────────────────────────────────────────────
      sectionHead('Financial Overview');
      const givingTypes: Record<string, number> = {};
      yearGiving.forEach(g => { givingTypes[g.type] = (givingTypes[g.type] ?? 0) + g.amount; });
      Object.entries(givingTypes).forEach(([type, amount], ri) => {
        checkSpace(7);
        doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248);
        doc.rect(M, y, CW, 7, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(50, 60, 80);
        doc.text(type, M + 3, y + 5);
        const pct = yearTotalGiving > 0 ? Math.round((amount / yearTotalGiving) * 100) : 0;
        doc.setTextColor(120, 130, 150);
        doc.text(`${pct}%`, W - M - 30, y + 5, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(11, 17, 32);
        doc.text(`${GHS}${amount.toLocaleString()}`, W - M - 3, y + 5, { align: 'right' });
        y += 7;
      });
      checkSpace(8);
      doc.setFillColor(220, 225, 235);
      doc.rect(M, y, CW, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(11, 17, 32);
      doc.text('TOTAL', M + 3, y + 5.5);
      doc.text(`${GHS}${yearTotalGiving.toLocaleString()}`, W - M - 3, y + 5.5, { align: 'right' });
      y += 14;

      // Monthly giving table
      sectionHead('Monthly Giving Breakdown');
      const mColX = [M + 3, M + 42, M + 82, M + 122, M + 155];
      doc.setFillColor(11, 17, 32);
      doc.rect(M, y, CW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      ['Month', 'Tithe', 'Offering', 'Other', 'Total'].forEach((h, i) => doc.text(h, mColX[i], y + 5));
      y += 7;

      const yearMonths = eachMonthOfInterval({ start: yearStart, end: yearEnd });
      const annTitheTotal = { t: 0, o: 0, x: 0 };
      yearMonths.forEach((month, ri) => {
        checkSpace(6);
        const ms = startOfMonth(month); const me = endOfMonth(month);
        const recs = yearGiving.filter(g => { const d = new Date(g.date); return d >= ms && d <= me; });
        const t = recs.filter(g => g.type === 'Tithe').reduce((s, g) => s + g.amount, 0);
        const o = recs.filter(g => g.type === 'Offering').reduce((s, g) => s + g.amount, 0);
        const x = recs.filter(g => g.type !== 'Tithe' && g.type !== 'Offering').reduce((s, g) => s + g.amount, 0);
        annTitheTotal.t += t; annTitheTotal.o += o; annTitheTotal.x += x;
        doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248);
        doc.rect(M, y, CW, 6, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(50, 60, 80);
        doc.text(format(month, 'MMMM'), mColX[0], y + 4);
        doc.text(`${GHS}${t.toLocaleString()}`, mColX[1], y + 4);
        doc.text(`${GHS}${o.toLocaleString()}`, mColX[2], y + 4);
        doc.text(`${GHS}${x.toLocaleString()}`, mColX[3], y + 4);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(11, 17, 32);
        doc.text(`${GHS}${(t + o + x).toLocaleString()}`, mColX[4], y + 4);
        y += 6;
      });
      checkSpace(8);
      doc.setFillColor(220, 225, 235);
      doc.rect(M, y, CW, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(11, 17, 32);
      doc.text('TOTAL', mColX[0], y + 5.5);
      doc.text(`${GHS}${annTitheTotal.t.toLocaleString()}`, mColX[1], y + 5.5);
      doc.text(`${GHS}${annTitheTotal.o.toLocaleString()}`, mColX[2], y + 5.5);
      doc.text(`${GHS}${annTitheTotal.x.toLocaleString()}`, mColX[3], y + 5.5);
      doc.text(`${GHS}${yearTotalGiving.toLocaleString()}`, mColX[4], y + 5.5);
      y += 14;

      // ── Attendance ───────────────────────────────────────────────────────────
      sectionHead('Attendance Summary');
      const aColX = [M + 3, M + 60, M + 105, M + 150];
      doc.setFillColor(11, 17, 32);
      doc.rect(M, y, CW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      ['Month', 'Services', 'Total Attendance', 'Avg / Service'].forEach((h, i) => doc.text(h, aColX[i], y + 5));
      y += 7;
      yearMonths.forEach((month, ri) => {
        checkSpace(6);
        const ms = startOfMonth(month); const me = endOfMonth(month);
        const recs = yearAttendance.filter(a => { const d = new Date(a.date); return d >= ms && d <= me; });
        const total = recs.reduce((s, a) => s + a.presentMemberIds.length + a.visitorsCount, 0);
        const avg = recs.length > 0 ? Math.round(total / recs.length) : 0;
        doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248);
        doc.rect(M, y, CW, 6, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(50, 60, 80);
        doc.text(format(month, 'MMMM'), aColX[0], y + 4);
        doc.text(String(recs.length), aColX[1], y + 4);
        doc.text(String(total), aColX[2], y + 4);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(11, 17, 32);
        doc.text(String(avg), aColX[3], y + 4);
        y += 6;
      });
      y += 6;

      // ── Membership ───────────────────────────────────────────────────────────
      sectionHead('Membership Summary');
      const statusCounts: Record<string, number> = {};
      members.forEach(m => { statusCounts[m.status] = (statusCounts[m.status] ?? 0) + 1; });
      doc.setFillColor(11, 17, 32);
      doc.rect(M, y, CW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('Status', M + 3, y + 5);
      doc.text('Count', M + 110, y + 5);
      doc.text('Share', M + 150, y + 5);
      y += 7;
      [...Object.entries(statusCounts), ['New This Year', yearNewMembers.length] as [string, number]].forEach(([status, count], ri) => {
        checkSpace(7);
        doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248);
        doc.rect(M, y, CW, 7, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(50, 60, 80);
        doc.text(String(status), M + 3, y + 5);
        doc.text(String(count), M + 110, y + 5);
        const pct = members.length > 0 ? Math.round(((count as number) / members.length) * 100) : 0;
        doc.text(`${pct}%`, M + 150, y + 5);
        y += 7;
      });
      checkSpace(8);
      doc.setFillColor(220, 225, 235);
      doc.rect(M, y, CW, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(11, 17, 32);
      doc.text('TOTAL MEMBERS', M + 3, y + 5.5);
      doc.text(String(members.length), M + 110, y + 5.5);
      doc.text('100%', M + 150, y + 5.5);
      y += 14;

      // ── Campaigns ────────────────────────────────────────────────────────────
      if (campaignSummary.length > 0) {
        sectionHead('Campaigns & Pledges');
        campaignSummary.forEach((c, ri) => {
          checkSpace(9);
          doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248);
          doc.rect(M, y, CW, 9, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(11, 17, 32);
          doc.text(c.title.slice(0, 42), M + 3, y + 4);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 90, 110);
          doc.setFontSize(7);
          doc.text(`Goal: ${GHS}${c.goalAmount.toLocaleString()}  ·  Raised: ${GHS}${c.raised.toLocaleString()}  ·  Progress: ${c.pct}%`, M + 3, y + 8);
          y += 9;
        });
      }

      // Page footers (skip cover page)
      const totalPages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages.length - 1;
      for (let p = 2; p <= totalPages; p++) {
        doc.setPage(p);
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.setTextColor(160, 170, 185);
        doc.text('ChurchCare — Confidential Annual Report', M, ph - 6);
        doc.text(`Page ${p - 1} of ${totalPages - 1}`, W - M, ph - 6, { align: 'right' });
      }

      doc.save(`FaithChurchCare_Annual_Report_${year}_${activeBranchName.replace(/\s/g, '_')}.pdf`);
      toast({ title: 'Annual Report generated', description: `Annual Report ${year} downloaded.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Export failed', description: 'Could not generate report. Please try again.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream mb-1">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Finance, attendance, and membership insights.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2" disabled={exporting}>
            <Share2 className="w-4 h-4" /> Share
          </Button>
          <Button size="sm" onClick={() => setExportOpen(true)} disabled={exporting || !actions.canExportReports}
            className="gap-2 bg-navy-900 hover:bg-navy-800 text-gold-400 font-medium dark:bg-navy-700">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Generating…' : 'Export Report'}
          </Button>
        </div>
      </div>

      {/* Export dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              {(['annual', 'monthly', 'period'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExportType(opt)}>
                  <input type="radio" name="export-type" value={opt} checked={exportType === opt} onChange={() => setExportType(opt)} className="accent-navy-900 w-4 h-4" />
                  <span className="font-medium text-sm">{opt === 'annual' ? 'Annual Report' : opt === 'monthly' ? 'Monthly Report' : 'Specific Period'}</span>
                </label>
              ))}
            </div>

            {exportType === 'annual' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <Select value={String(dlYear)} onValueChange={v => setDlYear(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 2, currentYear - 1, currentYear].map(yr => (
                      <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {exportType === 'monthly' && (
              <div className="flex gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs">Month</Label>
                  <Select value={String(dlMonth)} onValueChange={v => setDlMonth(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={String(m)}>{format(new Date(2024, m - 1, 1), 'MMMM')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 w-28">
                  <Label className="text-xs">Year</Label>
                  <Select value={String(dlYear)} onValueChange={v => setDlYear(Number(v))}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 2, currentYear - 1, currentYear].map(yr => (
                        <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {exportType === 'period' && (
              <div className="flex gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={dlStart} onChange={e => setDlStart(e.target.value)} />
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={dlEnd} onChange={e => setDlEnd(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button onClick={handleDownload} className="gap-2 bg-navy-900 hover:bg-navy-800 text-gold-400">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date range */}
      <div className="glass rounded-xl p-4 border border-border/40 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input type="date" className="w-[160px]" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input type="date" className="w-[160px]" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setStartDate(format(subMonths(new Date(), 5), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); }}>
          Reset
        </Button>
        {role === 'Administrator' && campuses.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Branch</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {campuses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {role === 'Branch Pastor' && activeBranchName !== 'All Branches' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Branch</Label>
            <p className="text-sm font-medium h-9 flex items-center px-3 rounded-md border border-border/40 bg-muted/30">{activeBranchName}</p>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Full year:</span>
          {[currentYear - 1, currentYear].map(yr => (
            <Button key={yr} variant={annualYear === yr ? 'default' : 'outline'} size="sm"
              className={`h-7 px-2.5 text-xs ${annualYear === yr ? 'bg-navy-900 text-gold-400 dark:bg-navy-700' : ''}`}
              onClick={() => { setAnnualYear(yr); setStartDate(`${yr}-01-01`); setEndDate(`${yr}-12-31`); }}>
              {yr}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground self-center">Showing {months.length} month{months.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'New Members',   value: newMembersInRange.length,                     icon: Users,         color: 'text-sage-500' },
          { label: 'Total Giving',  value: `${GHS}${totalGiving.toLocaleString()}`,       icon: Coins,         color: 'text-gold-500' },
          { label: 'Services Held', value: rangeAttendance.length,                        icon: CalendarCheck, color: 'text-navy-500 dark:text-navy-300' },
          { label: 'Avg Attendance',value: avgAttendance,                                  icon: TrendingUp,    color: 'text-gold-500' },
        ].map(card => (
          <Card key={card.label} className="glass border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabbed reports */}
      <Tabs defaultValue="finance">
        <TabsList className="mb-6">
          <TabsTrigger value="finance"    className="gap-2"><Coins className="w-4 h-4" /> Finance</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2"><CalendarCheck className="w-4 h-4" /> Attendance</TabsTrigger>
          <TabsTrigger value="members"    className="gap-2"><Users className="w-4 h-4" /> Members</TabsTrigger>
        </TabsList>

        {/* ── Finance ── */}
        <TabsContent value="finance" className="space-y-6 mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Monthly Giving Breakdown</CardTitle>
              <CardDescription>Tithes, Offerings, and other contributions per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]" ref={financialChartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `${GHS}${v}`} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} formatter={(v: unknown) => [`${GHS}${(v as number).toLocaleString()}`, undefined]} />
                    <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                    <Bar dataKey="Tithes"    stackId="a" fill="#0B1120" radius={[0, 0, 4, 4]} maxBarSize={40} />
                    <Bar dataKey="Offerings" stackId="a" fill="#C9A84C" maxBarSize={40} />
                    <Bar dataKey="Other"     stackId="a" fill="#4A7C6F" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Giving type breakdown pie */}
            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <CardTitle>Giving by Type</CardTitle>
                <CardDescription>Distribution for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]" ref={givingTypeChartRef}>
                  {givingTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={givingTypeData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={4} dataKey="value">
                          {givingTypeData.map((_e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${GHS}${(v as number).toLocaleString()}`, undefined]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No giving records in this period.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Campaign progress */}
            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <CardTitle>Campaign Progress</CardTitle>
                <CardDescription>{campaigns.length} total campaigns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[260px] overflow-y-auto">
                {campaignSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No campaigns yet. Add them in Pledges & Campaigns.</p>
                ) : campaignSummary.map(c => (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate mr-2">{c.title}</span>
                      <span className="text-muted-foreground shrink-0">{c.pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-sage-500 transition-all" style={{ width: `${c.pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{GHS}{c.raised.toLocaleString()} raised of {GHS}{c.goalAmount.toLocaleString()} goal</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Monthly financial table */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Monthly Financial Detail</CardTitle>
              <CardDescription>Row-by-row giving summary</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/20">
                      {['Month', 'Tithes', 'Offerings', 'Other', 'Total'].map((h, i) => (
                        <th key={h} className={`px-4 py-2.5 text-xs font-medium text-muted-foreground ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialData.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No data for the selected period.</td></tr>
                    ) : financialData.map((row, i) => {
                      const rowTotal = row.Tithes + row.Offerings + row.Other;
                      return (
                        <tr key={row.name} className={`border-b border-border/20 last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                          <td className="px-4 py-2.5 font-medium">{row.name}</td>
                          <td className="px-4 py-2.5 text-right">{GHS}{row.Tithes.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right">{GHS}{row.Offerings.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{GHS}{row.Other.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gold-600 dark:text-gold-400">{GHS}{rowTotal.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {financialData.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-border/60 bg-muted/30 font-bold">
                        <td className="px-4 py-2.5 text-xs uppercase tracking-wider">Total</td>
                        <td className="px-4 py-2.5 text-right">{GHS}{financialData.reduce((s, r) => s + r.Tithes, 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right">{GHS}{financialData.reduce((s, r) => s + r.Offerings, 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right">{GHS}{financialData.reduce((s, r) => s + r.Other, 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-gold-600 dark:text-gold-400">{GHS}{totalGiving.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Attendance ── */}
        <TabsContent value="attendance" className="space-y-6 mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Monthly Attendance Trend</CardTitle>
              <CardDescription>Average attendance per service and total services held</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]" ref={attendanceChartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                    <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                    <Bar dataKey="Attendance" fill="#4A7C6F" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Services"   fill="#C9A84C" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Attendance by Service Type</CardTitle>
              <CardDescription>Average headcount per service type in the period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]" ref={attendanceTypeChartRef}>
                {attendanceByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceByType} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={120} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="Avg" name="Avg Attendance" fill="#0B1120" radius={[0, 4, 4, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No attendance records in this period.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance by type table */}
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Service Type Summary</CardTitle>
              <CardDescription>Sessions and average attendance per type</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Service Type</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Sessions</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Avg Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceByType.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No attendance records in this period.</td></tr>
                  ) : attendanceByType.map((row, i) => (
                    <tr key={row.name} className={`border-b border-border/20 last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                      <td className="px-4 py-2.5 font-medium">{row.name}</td>
                      <td className="px-4 py-2.5 text-right">{row.Sessions}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{row.Avg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Members ── */}
        <TabsContent value="members" className="space-y-6 mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader>
              <CardTitle>Membership Growth</CardTitle>
              <CardDescription>Cumulative member count over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]" ref={membershipChartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={membershipData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="Members" stroke="#C9A84C" strokeWidth={3}
                      dot={{ r: 5, fill: '#0B1120', stroke: '#C9A84C', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department distribution */}
            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
                <CardDescription>Members per department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]" ref={deptChartRef}>
                  {deptData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={deptData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={4} dataKey="value">
                          {deptData.map((_e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v as number} members`, undefined]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No departments configured.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Member status breakdown */}
            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <CardTitle>Member Status</CardTitle>
                <CardDescription>{members.length} total members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {statusData.map((s, i) => {
                  const pct = members.length > 0 ? Math.round((s.value / members.length) * 100) : 0;
                  return (
                    <div key={s.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">{s.value} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
