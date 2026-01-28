import React, { useEffect, useState, useMemo } from 'react';
import { IssueRecord, User, Machine, Location, Item, BreakdownRecord } from '../types';
import { generateDashboardInsights } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SearchableSelect from './SearchableSelect';
import StockValueHistogram from './StockValueHistogram';
import KPICards from './KPICards';

interface DashboardProps {
  history: IssueRecord[];
  items: Item[]; 
  machines: Machine[];
  locations: Location[];
  breakdowns: BreakdownRecord[]; 
  setCurrentView: (view: string) => void;
  currentUser: User;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const STATUS_COLORS = {
  'Working': '#10B981', 
  'Not Working': '#EF4444', 
  'Outside Maintenance': '#F59E0B' 
};

const QUICK_NAV_ITEMS = [
  {
    id: 'maintenance-planning',
    label: 'Maintenance Planning',
    icon: '📅',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    roles: ['admin', 'maintenance_manager', 'maintenance_engineer']
  },
  {
    id: 'issue-planning',
    label: 'Issue Planning', 
    icon: '📝',
    color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
    roles: ['admin', 'maintenance_manager', 'warehouse_manager']
  },
  {
    id: 'asset-management',
    label: 'Asset Management',
    icon: '🏗️',
    color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    roles: ['admin', 'maintenance_manager', 'maintenance_engineer']
  },
  {
    id: 'mro-management',
    label: 'MRO Management',
    icon: '📦',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
    roles: ['admin', 'warehouse_manager', 'maintenance_manager', 'maintenance_engineer', 'warehouse_supervisor']
  },
  {
    id: 'material-forecast',
    label: 'Forecast Planning',
    icon: '🔮',
    color: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
    roles: ['admin', 'warehouse_manager', 'maintenance_manager', 'maintenance_engineer']
  },
  {
    id: 'agri-work-order',
    label: 'Work Orders',
    icon: '🚜',
    color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    roles: ['admin', 'warehouse_manager', 'maintenance_manager', 'user']
  },
  {
    id: 'issue-form',
    label: 'Issue Requests',
    icon: '🛠️',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    roles: ['admin', 'user', 'maintenance_manager', 'maintenance_engineer']
  },
  {
    id: 'history',
    label: 'Inventory',
    icon: '📋',
    color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    roles: ['admin', 'user', 'warehouse_manager', 'maintenance_manager', 'maintenance_engineer', 'warehouse_supervisor']
  },
  {
    id: 'stock-approval',
    label: 'Approvals',
    icon: '✅',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    roles: ['admin', 'warehouse_manager', 'warehouse_supervisor']
  },
  {
    id: 'ai-assistant',
    label: 'Maintenance AI',
    icon: '✨',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    roles: ['admin', 'warehouse_manager', 'maintenance_manager']
  },
  {
    id: 'master-data',
    label: 'Master Data',
    icon: '🗄️',
    color: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    roles: ['admin']
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
    roles: ['admin', 'warehouse_manager', 'maintenance_manager', 'warehouse_supervisor', 'user']
  },
];

const Dashboard: React.FC<DashboardProps> = ({ history, items, machines, locations, breakdowns, setCurrentView, currentUser }) => {
  const [insights, setInsights] = useState<string>('Generating AI insights...');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedMachineName, setSelectedMachineName] = useState<string>('');
  const [selectedBrandName, setSelectedBrandName] = useState<string>('');

  useEffect(() => {
    if (history.length > 0) {
      setLoadingInsights(true);
      generateDashboardInsights(history)
        .then(setInsights)
        .finally(() => setLoadingInsights(false));
    }
  }, [history.length]);

  useEffect(() => {
    setSelectedMachineName('');
    setSelectedBrandName('');
  }, [selectedLocationId]);

  useEffect(() => {
    setSelectedBrandName('');
  }, [selectedMachineName]);

  const metrics = useMemo(() => {
    const totalIssues = history.length;
    const itemCounts: Record<string, number> = {};
    const machineCounts: Record<string, number> = {};
    let todayCount = 0;
    const now = new Date();

    history.forEach(h => {
      itemCounts[h.itemName] = (itemCounts[h.itemName] || 0) + h.quantity;
      machineCounts[h.machineName] = (machineCounts[h.machineName] || 0) + 1;

      const issueDate = new Date(h.timestamp);
      if (now.getTime() - issueDate.getTime() < 24 * 60 * 60 * 1000) {
        todayCount++;
      }
    });

    const sortedItems = items
      .filter(i => (i.stockQuantity || 0) > 0)
      .sort((a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0));

    const sortedMachines = Object.entries(machineCounts).sort((a, b) => b[1] - a[1]);

    return {
      totalIssues,
      topItem: sortedItems[0]?.name || 'N/A',
      topMachine: sortedMachines[0]?.[0] || 'N/A',
      todayCount,
      itemData: sortedItems.slice(0, 5).map(i => ({ name: i.name, value: i.stockQuantity || 0 })),
      machineData: sortedMachines.slice(0, 5).map(([name, val]) => ({ name, value: val }))
    };
  }, [history, items]);

  const machinesInLocation = useMemo(() => {
    if (!selectedLocationId) return machines;
    return machines.filter(m => {
      const locName = locations.find(l => l.id === selectedLocationId)?.name;
      return m.locationId === selectedLocationId || m.locationId === locName;
    });
  }, [machines, selectedLocationId, locations]);

  const availableMachineOptions = useMemo(() => {
    const names = new Set(machinesInLocation.map(m => m.category).filter(Boolean));
    return Array.from(names).sort().map(name => ({
      id: name as string,
      label: name as string
    }));
  }, [machinesInLocation]);

  const availableBrandOptions = useMemo(() => {
    const relevantMachines = selectedMachineName
      ? machinesInLocation.filter(m => m.category === selectedMachineName)
      : machinesInLocation;

    const brands = new Set(relevantMachines.map(m => m.brand).filter(Boolean));
    return Array.from(brands).sort().map(brand => ({
      id: brand as string,
      label: brand as string
    }));
  }, [machinesInLocation, selectedMachineName]);

  const machineStats = useMemo(() => {
    let finalFilteredMachines = machinesInLocation;

    if (selectedMachineName) {
      finalFilteredMachines = finalFilteredMachines.filter(m => m.category === selectedMachineName);
    }

    if (selectedBrandName) {
      finalFilteredMachines = finalFilteredMachines.filter(m => m.brand === selectedBrandName);
    }

    const getStatus = (s?: string) => {
      if (!s) return 'Unknown';
      const lower = s.toLowerCase();
      if (lower.includes('not working')) return 'Not Working';
      if (lower.includes('working')) return 'Working';
      if (lower.includes('maintenance')) return 'Outside Maintenance';
      return 'Unknown';
    };

    let working = 0;
    let notWorking = 0;
    let maintenance = 0;

    finalFilteredMachines.forEach(m => {
      const s = getStatus(m.status);
      if (s === 'Working') working++;
      else if (s === 'Not Working') notWorking++;
      else if (s === 'Outside Maintenance') maintenance++;
    });

    const total = finalFilteredMachines.length;

    const chartData = [
      { name: 'Working', value: working, color: STATUS_COLORS['Working'] },
      { name: 'Not Working', value: notWorking, color: STATUS_COLORS['Not Working'] },
      { name: 'Maintenance', value: maintenance, color: STATUS_COLORS['Outside Maintenance'] }
    ].filter(d => d.value > 0);

    return { total, working, notWorking, maintenance, chartData };
  }, [machinesInLocation, selectedMachineName, selectedBrandName]);

  const visibleNavItemsMemo = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return QUICK_NAV_ITEMS.filter(item => item.roles.includes('admin'));
    }

    if (!currentUser?.allowedMenus || currentUser.allowedMenus.length === 0) {
      return [];
    }

    return QUICK_NAV_ITEMS.filter(item => currentUser.allowedMenus?.includes(item.id));
  }, [currentUser]);

  const visibleNavItems = visibleNavItemsMemo;

  if (visibleNavItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center space-y-4 animate-fade-in-up">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">👋</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Hello, {currentUser.name}!</h2>
        <p className="text-gray-500 max-w-md">
          Welcome to Daltex Maintenance. Your account is active, but you currently have no access to any modules.
        </p>
        <p className="text-sm text-gray-400 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
          Please contact your System Administrator to enable access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* 1. Navigation Menu Section */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">🚀</span> Quick Access
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`
                          flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 transform hover:-translate-y-1 hover:shadow-md
                          ${item.color}
                      `}
            >
              <span className="text-3xl mb-2">{item.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wide text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. KPI Section - Now Includes MTTR/MTBF */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">📊</span> Operational KPIs
        </h2>
        <KPICards breakdowns={breakdowns} />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Issues</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{metrics.totalIssues}</h3>
            </div>
            <div className="mt-4 text-xs text-gray-400">Lifetime records</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Issued Today</p>
              <h3 className="text-3xl font-bold text-blue-600 mt-2">{metrics.todayCount}</h3>
            </div>
            <div className="mt-4 text-xs text-gray-400">Last 24 hours</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Top Item</p>
              <h3 className="text-lg font-bold text-gray-800 mt-2 truncate" title={metrics.topItem}>{metrics.topItem}</h3>
            </div>
            <div className="mt-4 text-xs text-gray-400">Highest Quantity</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition">
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Top Machine</p>
              <h3 className="text-lg font-bold text-gray-800 mt-2 truncate" title={metrics.topMachine}>{metrics.topMachine}</h3>
            </div>
            <div className="mt-4 text-xs text-gray-400">Most Frequent</div>
          </div>
        </div>
      </section>

      {/* 3. Financial & Status Analysis */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Stock Histogram */}
          <div>
            <StockValueHistogram items={items} locations={locations} />
          </div>

          {/* Right: Machine Status with Filters */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 uppercase">Machines Filter</h3>
              <div className="w-full md:w-auto flex flex-col md:flex-row gap-2">
                <div className="w-full md:w-32">
                  <select
                    className="w-full h-9 pl-2 pr-6 rounded border border-gray-300 focus:ring-1 focus:ring-blue-500 text-xs bg-white"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                  >
                    <option value="">Loc: All</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-32">
                  <SearchableSelect
                    label=""
                    options={availableMachineOptions}
                    value={selectedMachineName}
                    onChange={setSelectedMachineName}
                    placeholder="Machine: All"
                    compact={true}
                    disabled={availableMachineOptions.length === 0}
                  />
                </div>
                <div className="w-full md:w-32">
                  <SearchableSelect
                    label=""
                    options={availableBrandOptions}
                    value={selectedBrandName}
                    onChange={setSelectedBrandName}
                    placeholder="Brand: All"
                    compact={true}
                    disabled={availableBrandOptions.length === 0}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col lg:flex-row">
              {/* Summary Stats */}
              <div className="p-4 flex flex-col gap-4 justify-center lg:w-1/3 bg-gray-50 border-r border-gray-100">
                <div className="flex justify-between items-center"><span className="text-sm text-gray-500">Total</span> <span className="font-bold">{machineStats.total}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-green-600">Working</span> <span className="font-bold text-green-700">{machineStats.working}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-red-600">Stopped</span> <span className="font-bold text-red-700">{machineStats.notWorking}</span></div>
                <div className="flex justify-between items-center"><span className="text-sm text-amber-600">Maint.</span> <span className="font-bold text-amber-700">{machineStats.maintenance}</span></div>
              </div>

              {/* Pie Chart */}
              <div className="p-4 flex-1 h-[250px]">
                {machineStats.total > 0 && machineStats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={machineStats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {machineStats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-xs text-center p-4">
                    No Data for selected filters
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Charts & AI Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Charts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Top 5 Items (Quantity)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.itemData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Issues by Machine</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.machineData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {metrics.machineData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gemini AI Insights */}
        <div className="lg:col-span-2 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-2xl">✨</span>
            <h3 className="text-lg font-bold text-indigo-900">AI Operational Insights</h3>
          </div>
          {loadingInsights ? (
            <div className="flex items-center space-x-3 text-indigo-500 animate-pulse">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing warehouse patterns with Gemini...</span>
            </div>
          ) : (
            <div className="prose prose-indigo max-w-none">
              <div className="whitespace-pre-line text-indigo-800 leading-relaxed font-medium">
                {insights}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
