import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import { useRole } from '@/context/RoleContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Download, TrendingUp, Users, Coins, CalendarCheck, Loader2, Share2, BookOpen } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const GHS = '₵';
const CHART_COLORS = ['#0B1120', '#C9A84C', '#4A7C6F', '#7090bc', '#D4B96A', '#9b59b6', '#e67e22'];

export default function Reports() {
  const { members, attendance, giving, campaigns, pledges, departments } = useData();
  const { actions } = useRole();
  const { toast } = useToast();

  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 5), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exporting, setExporting] = useState(false);
  const currentYear = new Date().getFullYear();
  const [annualYear, setAnnualYear] = useState(currentYear);

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

  const captureElement = async (el: HTMLElement): Promise<string> => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
    return canvas.toDataURL('image/png');
  };

  const handleExportPDF = async () => {
    if (!actions.canExportReports) {
      toast({ title: 'Access denied', description: 'Your role cannot export reports.', variant: 'destructive' }); return;
    }
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentW = pageW - margin * 2;
      let y = margin;

      const paintHeader = () => {
        doc.setFillColor(11, 17, 32);
        doc.rect(0, 0, pageW, 28, 'F');
        doc.setTextColor(201, 168, 76);
        doc.setFontSize(20); doc.setFont('helvetica', 'bold');
        doc.text('ChurchCare', margin, 12);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 190, 210);
        doc.text('Reports & Analytics', margin, 19);
        doc.setTextColor(120, 130, 150);
        doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, pageW - margin, 19, { align: 'right' });
        doc.text(`Period: ${format(rangeStart, 'MMM d, yyyy')} – ${format(rangeEnd, 'MMM d, yyyy')}`, pageW - margin, 12, { align: 'right' });
      };

      const newPage = () => { doc.addPage(); paintHeader(); y = 35; };
      const checkSpace = (needed: number) => { if (y + needed > pageH - margin) newPage(); };

      paintHeader(); y = 38;

      // Summary stat boxes
      const stats = [
        { label: 'New Members', value: String(newMembersInRange.length) },
        { label: 'Total Giving',  value: `${GHS}${totalGiving.toLocaleString()}` },
        { label: 'Services Held', value: String(rangeAttendance.length) },
        { label: 'Avg Attendance',value: String(avgAttendance) },
      ];
      const boxW = (contentW - 6) / 4;
      stats.forEach((s, i) => {
        const x = margin + i * (boxW + 2);
        doc.setFillColor(245, 245, 240); doc.roundedRect(x, y, boxW, 18, 3, 3, 'F');
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 17, 32);
        doc.text(s.value, x + boxW / 2, y + 10, { align: 'center' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 110, 130);
        doc.text(s.label, x + boxW / 2, y + 16, { align: 'center' });
      });
      y += 26;

      const sectionHeader = (title: string, desc: string) => {
        checkSpace(18);
        doc.setFillColor(230, 234, 240); doc.rect(margin, y, contentW, 0.4, 'F'); y += 5;
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 17, 32);
        doc.text(title, margin, y);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 130, 150);
        doc.text(desc, margin, y + 5); y += 12;
      };

      const addChart = async (ref: React.RefObject<HTMLDivElement | null>, title: string, desc: string, imgH = 52) => {
        if (!ref.current) return;
        const imgData = await captureElement(ref.current);
        checkSpace(imgH + 20); sectionHeader(title, desc);
        doc.addImage(imgData, 'PNG', margin, y, contentW, imgH); y += imgH + 8;
      };

      // ── Finance ──────────────────────────────────────────────────────────
      await addChart(financialChartRef,  'Monthly Giving Breakdown', 'Tithes, Offerings and other contributions per month');
      await addChart(givingTypeChartRef, 'Giving by Type', `Distribution of ${GHS}${totalGiving.toLocaleString()} total giving`);

      // Financial table
      sectionHeader('Monthly Financial Detail', 'Month-by-month giving breakdown');
      const colW = [30, 38, 38, 38, 38];
      const hdrs = ['Month', 'Tithes', 'Offerings', 'Other', 'Total'];
      doc.setFillColor(11, 17, 32); doc.rect(margin, y, contentW, 7, 'F');
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      let cx = margin + 2;
      hdrs.forEach((h, i) => { doc.text(h, cx, y + 5); cx += colW[i]; });
      y += 7;
      financialData.forEach((row, ri) => {
        checkSpace(6);
        doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248); doc.rect(margin, y, contentW, 6, 'F');
        doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 60, 80);
        cx = margin + 2;
        const tot = row.Tithes + row.Offerings + row.Other;
        [row.name, `${GHS}${row.Tithes.toLocaleString()}`, `${GHS}${row.Offerings.toLocaleString()}`, `${GHS}${row.Other.toLocaleString()}`, `${GHS}${tot.toLocaleString()}`]
          .forEach((v, i) => { doc.text(v, cx, y + 4); cx += colW[i]; });
        y += 6;
      });
      // Totals footer row
      checkSpace(7);
      doc.setFillColor(220, 225, 235); doc.rect(margin, y, contentW, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setTextColor(11, 17, 32); cx = margin + 2;
      const totTithes = financialData.reduce((s, r) => s + r.Tithes, 0);
      const totOff    = financialData.reduce((s, r) => s + r.Offerings, 0);
      const totOther  = financialData.reduce((s, r) => s + r.Other, 0);
      ['TOTAL', `${GHS}${totTithes.toLocaleString()}`, `${GHS}${totOff.toLocaleString()}`, `${GHS}${totOther.toLocaleString()}`, `${GHS}${totalGiving.toLocaleString()}`]
        .forEach((v, i) => { doc.text(v, cx, y + 5); cx += colW[i]; });
      y += 12;

      // Campaigns
      if (campaignSummary.length > 0) {
        sectionHeader('Campaigns & Pledges', 'Fundraising campaign progress');
        campaignSummary.forEach((c, ri) => {
          checkSpace(8);
          doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248); doc.rect(margin, y, contentW, 8, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(11, 17, 32);
          doc.text(c.title.slice(0, 38), margin + 2, y + 5);
          doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 90, 110);
          doc.text(`Goal: ${GHS}${c.goalAmount.toLocaleString()}`, margin + 90, y + 5);
          doc.text(`Raised: ${GHS}${c.raised.toLocaleString()}`, margin + 125, y + 5);
          doc.text(`${c.pct}%`, margin + 158, y + 5);
          y += 8;
        });
        y += 4;
      }

      // ── Attendance ────────────────────────────────────────────────────────
      await addChart(attendanceChartRef,     'Monthly Attendance', 'Average attendance and services held per month');
      await addChart(attendanceTypeChartRef, 'Attendance by Service Type', 'Average headcount per service type');

      // Attendance by type table
      if (attendanceByType.length > 0) {
        sectionHeader('Service Type Summary', 'Sessions and average attendance per type');
        doc.setFillColor(11, 17, 32); doc.rect(margin, y, contentW, 7, 'F');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
        doc.text('Service Type', margin + 2, y + 5); doc.text('Sessions', margin + 110, y + 5); doc.text('Avg Attendance', margin + 140, y + 5);
        y += 7;
        attendanceByType.forEach((row, ri) => {
          checkSpace(6);
          doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248); doc.rect(margin, y, contentW, 6, 'F');
          doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 60, 80);
          doc.text(row.name, margin + 2, y + 4);
          doc.text(String(row.Sessions), margin + 110, y + 4);
          doc.text(String(row.Avg), margin + 140, y + 4);
          y += 6;
        });
        y += 6;
      }

      // ── Members ───────────────────────────────────────────────────────────
      await addChart(membershipChartRef, 'Membership Growth', 'Cumulative member count over the selected period');
      await addChart(deptChartRef, 'Department Distribution', 'Member count per department');

      // Status table
      sectionHeader('Membership by Status', `Total: ${members.length} members`);
      statusData.forEach((s, ri) => {
        checkSpace(6);
        const pct = members.length > 0 ? Math.round((s.value / members.length) * 100) : 0;
        doc.setFillColor(ri % 2 === 0 ? 250 : 245, 250, 248); doc.rect(margin, y, contentW, 6, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(50, 60, 80);
        doc.text(s.name, margin + 2, y + 4);
        doc.text(String(s.value), margin + 80, y + 4);
        doc.text(`${pct}%`, margin + 110, y + 4);
        y += 6;
      });

      // Page footers
      const totalPages = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages.length - 1;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const ph = doc.internal.pageSize.getHeight();
        doc.setFontSize(7); doc.setTextColor(160, 170, 185);
        doc.text('ChurchCare — Confidential', margin, ph - 6);
        doc.text(`Page ${p} of ${totalPages}`, pageW - margin, ph - 6, { align: 'right' });
      }

      const filename = `ChurchCare_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);
      toast({ title: 'PDF exported', description: `${filename} downloaded.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Export failed', description: 'Could not generate PDF. Please try again.', variant: 'destructive' });
    } finally {
      setExporting(false);
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

  const handleAnnualReportPDF = async () => {
    if (!actions.canExportReports) {
      toast({ title: 'Access denied', description: 'Your role cannot export reports.', variant: 'destructive' }); return;
    }
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 14;
      const CW = W - M * 2;

      const yearStart = new Date(annualYear, 0, 1);
      const yearEnd = new Date(annualYear, 11, 31);
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

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(201, 168, 76);
      doc.text('ChurchCare', W / 2, H / 2 - 32, { align: 'center' });

      doc.setFontSize(72);
      doc.setTextColor(255, 255, 255);
      doc.text(String(annualYear), W / 2, H / 2 + 18, { align: 'center' });

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
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(201, 168, 76);
        doc.text('ChurchCare', M, 13);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 170, 190);
        doc.text(`${annualYear} Annual Report`, M, 20);
        doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy')}`, W - M, 20, { align: 'right' });
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
      doc.text(`January 1 – December 31, ${annualYear}`, M, y + 6);
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

      doc.save(`ChurchCare_Annual_Report_${annualYear}.pdf`);
      toast({ title: 'Annual Report generated', description: `ChurchCare_Annual_Report_${annualYear}.pdf downloaded.` });
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
          <Button size="sm" onClick={handleExportPDF} disabled={exporting || !actions.canExportReports} className="gap-2 bg-white hover:bg-gray-50 text-navy-900 font-medium">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Generating…' : 'Export PDF'}
          </Button>
          <Button size="sm" onClick={handleAnnualReportPDF} disabled={exporting || !actions.canExportReports}
            className="gap-2 bg-navy-900 hover:bg-navy-800 text-gold-400 font-medium dark:bg-navy-700">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            Annual Report
          </Button>
        </div>
      </div>

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
