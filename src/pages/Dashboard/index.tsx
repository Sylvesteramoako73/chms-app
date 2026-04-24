import { motion } from 'framer-motion';
import { useData } from '@/context/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, TrendingUp, Calendar, Coins, Cake, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths, isAfter, subDays, addDays, getMonth, getDate } from 'date-fns';

export default function Dashboard() {
  const { members, attendance, giving, events, departments } = useData();

  // Metrics calculation
  const totalMembers = members.length;
  
  const oneMonthAgo = subMonths(new Date(), 1);
  const newMembersThisMonth = members.filter(m => isAfter(new Date(m.joinDate), oneMonthAgo)).length;

  const thisMonthGiving = giving
    .filter(g => isAfter(new Date(g.date), oneMonthAgo))
    .reduce((sum, record) => sum + record.amount, 0);

  const upcomingEvents = [...events]
    .filter(e => isAfter(new Date(e.date), subDays(new Date(), 1)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Chart data
  const attendanceData = [...attendance]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-4)
    .map(a => ({
      name: format(new Date(a.date), 'MMM d'),
      Total: a.presentMemberIds.length + a.visitorsCount,
      Members: a.presentMemberIds.length,
      Visitors: a.visitorsCount
    }));

  const COLORS = ['#0B1120', '#C9A84C', '#4A7C6F', '#7090bc', '#D4B96A'];

  const today = new Date();
  const inSevenDays = addDays(today, 7);
  const isWithinNext7Days = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const thisYear = new Date(today.getFullYear(), getMonth(d), getDate(d));
    return thisYear >= today && thisYear <= inSevenDays;
  };
  const upcomingBirthdays = members.filter(m => m.dateOfBirth && isWithinNext7Days(m.dateOfBirth));
  const upcomingAnniversaries = members.filter(m => m.joinDate && isWithinNext7Days(m.joinDate) && new Date(m.joinDate).getFullYear() < today.getFullYear());
  
  const departmentData = departments.map(d => ({
    name: d.name,
    value: members.filter(m => m.departmentId === d.id).length
  })).filter(d => d.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-4xl font-display font-bold text-navy-900 dark:text-cream-100 mb-2">Dashboard</h1>
        <p className="text-navy-600 dark:text-navy-300">Overview of your church's health and activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-navy-600 dark:text-navy-300">Total Members</CardTitle>
            <Users className="w-4 h-4 text-navy-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900 dark:text-cream-100">{totalMembers}</div>
            <p className="text-xs text-navy-500 mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-sage-500" />
              <span className="text-sage-500 font-medium">+{newMembersThisMonth}</span> this month
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-navy-600 dark:text-navy-300">Avg. Attendance</CardTitle>
            <Calendar className="w-4 h-4 text-navy-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900 dark:text-cream-100">
              {attendanceData.length > 0 ? Math.round(attendanceData.reduce((acc, curr) => acc + curr.Total, 0) / attendanceData.length) : 0}
            </div>
            <p className="text-xs text-navy-500 mt-1">Over last 4 services</p>
          </CardContent>
        </Card>

        <Card className="glass border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-navy-600 dark:text-navy-300">Monthly Giving</CardTitle>
            <Coins className="w-4 h-4 text-navy-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-navy-900 dark:text-cream-100">₵{thisMonthGiving.toLocaleString()}</div>
            <p className="text-xs text-navy-500 mt-1">Tithes & Offerings</p>
          </CardContent>
        </Card>

        <Card className="glass border-none shadow-sm bg-gradient-to-br from-gold-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gold-700 dark:text-gold-400">Next Event</CardTitle>
            <Calendar className="w-4 h-4 text-gold-600" />
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <>
                <div className="text-lg font-bold text-navy-900 dark:text-cream-100 truncate">{upcomingEvents[0].title}</div>
                <p className="text-sm font-medium text-gold-600 mt-1">{format(new Date(upcomingEvents[0].date), 'MMM d, yyyy')} • {upcomingEvents[0].time}</p>
              </>
            ) : (
              <p className="text-sm text-navy-500">No upcoming events</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>Total attendance over the last 4 services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="Total" stroke="#0B1120" strokeWidth={3} dot={{r: 4, fill: '#0B1120'}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="Members" stroke="#C9A84C" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Visitors" stroke="#4A7C6F" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-none shadow-sm">
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Member distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {departmentData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Birthday & Anniversary Widget */}
      {(upcomingBirthdays.length > 0 || upcomingAnniversaries.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingBirthdays.length > 0 && (
            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Cake className="w-4 h-4 text-gold-500" /> Upcoming Birthdays</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingBirthdays.map(m => (
                  <div key={m.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{m.firstName} {m.lastName}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(new Date().getFullYear(), getMonth(new Date(m.dateOfBirth!)), getDate(new Date(m.dateOfBirth!))), 'MMM d')}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {upcomingAnniversaries.length > 0 && (
            <Card className="glass border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Heart className="w-4 h-4 text-sage-500" /> Join Anniversaries</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingAnniversaries.map(m => {
                  const years = today.getFullYear() - new Date(m.joinDate).getFullYear();
                  return (
                    <div key={m.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{m.firstName} {m.lastName}</span>
                      <span className="text-xs text-muted-foreground">{years} year{years !== 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </motion.div>
  );
}
