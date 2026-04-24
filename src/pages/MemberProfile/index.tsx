import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMemberAbsenceStreak, getMemberAttendanceRate } from '@/utils/attendanceUtils';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ArrowLeft, Printer, Mail, Phone, MapPin, Users, TrendingUp, CalendarCheck, Coins, AlertTriangle, CheckCircle, Lock, Heart, Briefcase, ExternalLink } from 'lucide-react';
import type { MemberStatus } from '@/types';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const STATUS_COLORS: Record<MemberStatus, string> = {
  Active: 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/50',
  Inactive: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50',
  'New Convert': 'bg-gold-500/10 text-gold-700 dark:text-gold-400 border-gold-200 dark:border-gold-800/50',
  Visitor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
};

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { members, departments, smallGroups, campuses, attendance, giving, prayerRequests, pastoralVisits } = useData();

  const member = members.find(m => m.id === id);

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Member not found.</p>
        <Button variant="outline" onClick={() => navigate('/members')}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Members</Button>
      </div>
    );
  }

  const dept = departments.find(d => d.id === member.departmentId);
  const group = smallGroups.find(g => g.id === member.smallGroupId);
  const campus = campuses.find(c => c.id === member.campusId);

  const memberGiving = giving.filter(g => g.memberId === member.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalGiving = memberGiving.reduce((s, g) => s + g.amount, 0);
  const thisYearTotal = memberGiving.filter(g => new Date(g.date).getFullYear() === new Date().getFullYear()).reduce((s, g) => s + g.amount, 0);

  const attendanceRate = getMemberAttendanceRate(member.id, attendance);
  const absenceStreak = getMemberAbsenceStreak(member.id, attendance);
  const yearsAsMember = differenceInYears(new Date(), parseISO(member.joinDate));

  const memberPrayers = prayerRequests.filter(r => r.memberId === member.id);
  const memberVisits = pastoralVisits.filter(v => v.memberId === member.id);

  const recentSundays = [...attendance]
    .filter(a => a.serviceType === 'Sunday First Service')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12);

  const handlePrintReceipt = () => {
    const year = new Date().getFullYear();
    const records = memberGiving.filter(g => new Date(g.date).getFullYear() === year);
    const total = records.reduce((s, g) => s + g.amount, 0);
    const byType = records.reduce<Record<string, number>>((acc, g) => { acc[g.type] = (acc[g.type] ?? 0) + g.amount; return acc; }, {});
    const rows = records.map(g => `<tr><td>${format(new Date(g.date), 'MMM d, yyyy')}</td><td>${g.type}</td><td>${g.paymentMethod}</td><td style="text-align:right">$${g.amount.toLocaleString()}</td></tr>`).join('');
    const summary = Object.entries(byType).map(([t, a]) => `<tr><td colspan="3">${t}</td><td style="text-align:right">$${a.toLocaleString()}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Giving Statement ${year}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;color:#111;padding:40px;max-width:700px;margin:auto}h1{font-size:24px;color:#0B1120;margin-bottom:4px}h2{font-size:18px;color:#444;margin-bottom:20px}.info{margin-bottom:24px;line-height:2}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f3f4f6;padding:10px 12px;text-align:left;font-size:13px;border-bottom:2px solid #e5e7eb}td{padding:9px 12px;font-size:13px;border-bottom:1px solid #e5e7eb}.total-row td{font-weight:bold;border-top:2px solid #0B1120;background:#f9fafb}.footer{margin-top:32px;font-size:11px;color:#888;text-align:center}</style></head><body><h1>Grace Cathedral</h1><h2>Annual Giving Statement — ${year}</h2><div class="info"><p><strong>Member:</strong> ${member.firstName} ${member.lastName}</p><p><strong>Email:</strong> ${member.email}</p><p><strong>Date Issued:</strong> ${format(new Date(), 'MMMM d, yyyy')}</p></div><table><thead><tr><th>Date</th><th>Type</th><th>Payment Method</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:#888">No contributions this year.</td></tr>'}</tbody></table>${summary ? `<br/><table><thead><tr><th colspan="3">Summary by Type</th><th style="text-align:right">Total</th></tr></thead><tbody>${summary}</tbody><tfoot><tr class="total-row"><td colspan="3">Grand Total</td><td style="text-align:right">$${total.toLocaleString()}</td></tr></tfoot></table>` : ''}<p class="footer">This statement is for your personal records. Thank you for your faithful giving to Grace Cathedral.</p></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/members')} className="gap-2 text-muted-foreground hover:text-foreground -ml-2">
        <ArrowLeft className="w-4 h-4" /> Back to Members
      </Button>

      {/* Header Card */}
      <Card className="glass border-none shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-20 h-20 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center shrink-0 border-2 border-navy-200 dark:border-navy-700">
              <span className="text-2xl font-bold text-navy-700 dark:text-navy-200">{member.firstName[0]}{member.lastName[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-3xl font-display font-bold text-navy-900 dark:text-cream">{member.firstName} {member.lastName}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${STATUS_COLORS[member.status]}`}>{member.status}</span>
                {absenceStreak >= 3 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50">
                    <AlertTriangle className="w-3 h-3" /> Away {absenceStreak}+
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{member.email}</span>
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{member.phone}</span>
                {dept && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{dept.name}</span>}
                {campus && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{campus.name}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2 self-start">
              <Button onClick={handlePrintReceipt} variant="outline" size="sm" className="gap-2">
                <Printer className="w-4 h-4" /> Print Receipt
              </Button>
              {member.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
                  onClick={() => {
                    const number = member.phone.replace(/\D/g, '');
                    window.open(`https://wa.me/${number}`, '_blank');
                  }}
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  WhatsApp
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Giving', value: `$${totalGiving.toLocaleString()}`, sub: `$${thisYearTotal.toLocaleString()} this year`, icon: Coins, color: 'text-gold-500' },
          { label: 'Attendance Rate', value: `${attendanceRate}%`, sub: 'Sunday services', icon: CalendarCheck, color: 'text-sage-500' },
          { label: 'Years as Member', value: yearsAsMember > 0 ? `${yearsAsMember}yr` : '<1yr', sub: format(parseISO(member.joinDate), 'MMM d, yyyy'), icon: TrendingUp, color: 'text-navy-500 dark:text-navy-300' },
          { label: 'Prayer Requests', value: memberPrayers.length, sub: `${memberPrayers.filter(r => r.isAnswered).length} answered`, icon: Heart, color: 'text-purple-500' },
        ].map(s => (
          <Card key={s.label} className="glass border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="giving">Giving ({memberGiving.length})</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="care">Prayer & Care ({memberPrayers.length + memberVisits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: 'Gender', value: member.gender },
                { label: 'Date of Birth', value: member.dateOfBirth ? format(parseISO(member.dateOfBirth), 'MMMM d, yyyy') : '—' },
                { label: 'Marital Status', value: member.maritalStatus },
                { label: 'Occupation', value: member.occupation ?? '—' },
                { label: 'Small Group', value: group?.name ?? '—' },
                { label: 'Baptism Date', value: member.baptismDate ? format(parseISO(member.baptismDate), 'MMMM d, yyyy') : '—' },
                { label: 'Phone', value: member.phone },
                { label: 'Email', value: member.email },
                { label: 'Campus', value: campus?.name ?? '—' },
                { label: 'Address', value: member.address || '—' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                  <p className="text-sm font-medium break-words">{item.value}</p>
                </div>
              ))}
              {member.notes && (
                <div className="sm:col-span-2 p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{member.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="giving" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Giving History</CardTitle>
              <CardDescription>All-time: ${totalGiving.toLocaleString()} · This year: ${thisYearTotal.toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="pl-6">Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Method</TableHead>
                    <TableHead className="text-right pr-6">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberGiving.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">No giving records found.</TableCell></TableRow>
                  )}
                  {memberGiving.map(g => (
                    <TableRow key={g.id} className="hover:bg-muted/20 border-border/30">
                      <TableCell className="pl-6 text-sm">{format(new Date(g.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-sm">{g.type}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{g.paymentMethod}</TableCell>
                      <TableCell className="text-right pr-6 font-bold text-gold-600 dark:text-gold-400">${g.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-0">
          <Card className="glass border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attendance Record</CardTitle>
              <CardDescription>Last {recentSundays.length} Sunday services · {attendanceRate}% rate{absenceStreak >= 3 ? ` · ⚠ ${absenceStreak} consecutive absences` : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentSundays.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No service records available.</p>}
              {recentSundays.map(rec => {
                const present = rec.presentMemberIds.includes(member.id);
                return (
                  <div key={rec.id} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{format(new Date(rec.date), 'EEEE, MMM d, yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{rec.serviceType}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${present ? 'bg-sage-500/10 text-sage-700 dark:text-sage-400 border-sage-200 dark:border-sage-800/50' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50'}`}>
                      {present ? <><CheckCircle className="w-3 h-3" /> Present</> : <><AlertTriangle className="w-3 h-3" /> Absent</>}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="care" className="mt-0 space-y-4">
          <Card className="glass border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Heart className="w-4 h-4 text-red-400" /> Prayer Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {memberPrayers.length === 0 && <p className="text-sm text-muted-foreground">No prayer requests from this member.</p>}
              {memberPrayers.map(r => (
                <div key={r.id} className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold">{r.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.isPrivate && <Lock className="w-3 h-3 text-muted-foreground" />}
                      {r.isAnswered && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sage-600 dark:text-sage-400"><CheckCircle className="w-3 h-3" /> Answered</span>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{r.category} · {format(new Date(r.createdAt), 'MMM d, yyyy')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="glass border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Briefcase className="w-4 h-4 text-blue-400" /> Pastoral Visits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {memberVisits.length === 0 && <p className="text-sm text-muted-foreground">No pastoral visits recorded for this member.</p>}
              {memberVisits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(v => (
                <div key={v.id} className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{v.visitType}</span>
                    <div className="flex items-center gap-2">
                      {v.followUpComplete && <span className="text-[10px] font-bold text-sage-600 dark:text-sage-400">✓ Follow-up done</span>}
                      <span className="text-xs text-muted-foreground">{format(new Date(v.date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">By {v.conductedBy}</p>
                  {v.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.notes}</p>}
                  {v.followUpDate && !v.followUpComplete && (
                    <p className="text-[10px] text-gold-600 dark:text-gold-400 mt-1">Follow-up due: {format(new Date(v.followUpDate), 'MMM d, yyyy')}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
