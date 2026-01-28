
import React, { useState, useMemo } from 'react';
import { MaintenanceTask, MaintenanceSchedule, MaintenanceWorkOrder, Machine, Item, Location } from '../types';
import SearchableSelect from './SearchableSelect';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MaintenancePlanningProps {
    tasks: MaintenanceTask[];
    onAddTask: (task: MaintenanceTask) => void;
    schedules: MaintenanceSchedule[];
    onAddSchedule: (schedule: MaintenanceSchedule) => void;
    workOrders: MaintenanceWorkOrder[];
    onUpdateWorkOrder: (wo: MaintenanceWorkOrder) => void;
    machines: Machine[];
    items: Item[];
    locations: Location[];
}

type TabType = 'tasks' | 'schedule' | 'work-orders' | 'calendar' | 'analysis';

const MaintenancePlanning: React.FC<MaintenancePlanningProps> = ({
    tasks, onAddTask, schedules, onAddSchedule, workOrders, onUpdateWorkOrder, machines, items, locations
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('work-orders');

    const [newTask, setNewTask] = useState<Partial<MaintenanceTask>>({ status: 'Active', type: 'Preventive', priority: 'Medium' });

    const [newSchedule, setNewSchedule] = useState<Partial<MaintenanceSchedule>>({ status: 'Planned', frequency: 'Monthly', checkMroAvailability: true });

    const [woFilterStatus, setWoFilterStatus] = useState('All');
    const [woFilterLocation, setWoFilterLocation] = useState('');

    const [currentDate, setCurrentDate] = useState(new Date());

    const tasksMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
    const machinesMap = useMemo(() => new Map(machines.map(m => [m.id, m])), [machines]);
    const locationsMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);

    const getMachineName = (id: string) => machinesMap.get(id)?.category || id;
    const getLocationName = (id: string) => locationsMap.get(id) || id;
    const getTaskName = (id: string) => tasksMap.get(id)?.description || id;

    const checkStockForWorkOrder = (wo: MaintenanceWorkOrder) => {
        const task = tasks.find(t => t.id === wo.taskId);
        if (!task || !task.requiredMroItems || task.requiredMroItems.length === 0) return { status: 'OK', missing: [] };

        const missing: string[] = [];
        task.requiredMroItems.forEach(req => {
            const item = items.find(i => i.id === req.itemId);
            const currentStock = item?.stockQuantity || 0;
            if (currentStock < req.quantity) {
                missing.push(`${req.itemId} (Need ${req.quantity}, Have ${currentStock})`);
            }
        });

        return {
            status: missing.length > 0 ? 'Shortage' : 'Available',
            missing
        };
    };

    const handleCreateTask = () => {
        if (!newTask.description || !newTask.machineId) return alert("Fill required fields");
        const machine = machines.find(m => m.id === newTask.machineId);
        const task: MaintenanceTask = {
            id: `TSK-${Date.now()}`,
            description: newTask.description,
            type: newTask.type || 'Preventive',
            machineId: newTask.machineId,
            machineName: machine?.category || 'Unknown',
            requiredMroItems: newTask.requiredMroItems || [],
            standardDurationHours: Number(newTask.standardDurationHours) || 1,
            requiredSkills: newTask.requiredSkills || 'General',
            priority: newTask.priority || 'Medium',
            defaultLocationId: machine?.locationId || 'WH-001',
            status: 'Active'
        };
        onAddTask(task);
        setNewTask({ status: 'Active', type: 'Preventive', priority: 'Medium' });
    };

    const handleCreateSchedule = () => {
        if (!newSchedule.taskId || !newSchedule.plannedStartDate) return alert("Fill required fields");
        const task = tasks.find(t => t.id === newSchedule.taskId);

        const schedule: MaintenanceSchedule = {
            id: `SCH-${Date.now()}`,
            taskId: newSchedule.taskId,
            machineId: task?.machineId || '',
            locationId: task?.defaultLocationId || '',
            plannedStartDate: newSchedule.plannedStartDate,
            plannedEndDate: newSchedule.plannedStartDate, 
            frequency: newSchedule.frequency || 'Monthly',
            assignedTechnician: newSchedule.assignedTechnician || '',
            checkMroAvailability: true,
            status: 'Planned'
        };
        onAddSchedule(schedule);
        setNewSchedule({ status: 'Planned', frequency: 'Monthly', checkMroAvailability: true });
    };

    const handleReleaseWorkOrder = (wo: MaintenanceWorkOrder) => {
        const check = checkStockForWorkOrder(wo);
        if (check.status === 'Shortage') {
            if (!confirm(`⚠️ MRO SHORTAGE DETECTED:\n${check.missing.join('\n')}\n\nDo you want to force release this Work Order?`)) {
                return;
            }
        }
        onUpdateWorkOrder({ ...wo, status: 'Released' });
    };


    const renderTasksTab = () => (
        <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded border flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]"><label className="text-xs font-bold text-gray-500">Description</label><input className="w-full border rounded p-2 text-sm" value={newTask.description || ''} onChange={e => setNewTask({ ...newTask, description: e.target.value })} /></div>
                <div className="w-48"><label className="text-xs font-bold text-gray-500">Machine</label><SearchableSelect label="" options={machines.map(m => ({ id: m.id, label: m.category || m.id }))} value={newTask.machineId || ''} onChange={v => setNewTask({ ...newTask, machineId: v })} compact /></div>
                <div className="w-32"><label className="text-xs font-bold text-gray-500">Type</label><select className="w-full border rounded p-2 text-sm h-[38px]" value={newTask.type} onChange={e => setNewTask({ ...newTask, type: e.target.value as any })}><option>Preventive</option><option>Corrective</option><option>Predictive</option></select></div>
                <div className="w-24"><label className="text-xs font-bold text-gray-500">Hours</label><input type="number" className="w-full border rounded p-2 text-sm" value={newTask.standardDurationHours || ''} onChange={e => setNewTask({ ...newTask, standardDurationHours: Number(e.target.value) })} /></div>
                <button onClick={handleCreateTask} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold h-[38px]">+ Add Task</button>
            </div>
            <div className="overflow-auto border rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 font-bold"><tr><th className="p-3">ID</th><th className="p-3">Description</th><th className="p-3">Machine</th><th className="p-3">Type</th><th className="p-3">Priority</th><th className="p-3">Duration</th></tr></thead>
                    <tbody>
                        {tasks.map(t => (
                            <tr key={t.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono">{t.id}</td><td className="p-3">{t.description}</td><td className="p-3">{t.machineName}</td>
                                <td className="p-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">{t.type}</span></td>
                                <td className="p-3">{t.priority}</td><td className="p-3">{t.standardDurationHours} hrs</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderScheduleTab = () => (
        <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded border flex flex-wrap gap-3 items-end">
                <div className="flex-1"><label className="text-xs font-bold text-gray-500">Task</label><SearchableSelect label="" options={tasks.map(t => ({ id: t.id, label: t.description }))} value={newSchedule.taskId || ''} onChange={v => setNewSchedule({ ...newSchedule, taskId: v })} compact /></div>
                <div className="w-40"><label className="text-xs font-bold text-gray-500">Start Date</label><input type="date" className="w-full border rounded p-2 text-sm" value={newSchedule.plannedStartDate || ''} onChange={e => setNewSchedule({ ...newSchedule, plannedStartDate: e.target.value })} /></div>
                <div className="w-32"><label className="text-xs font-bold text-gray-500">Frequency</label><select className="w-full border rounded p-2 text-sm h-[38px]" value={newSchedule.frequency} onChange={e => setNewSchedule({ ...newSchedule, frequency: e.target.value as any })}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option></select></div>
                <button onClick={handleCreateSchedule} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold h-[38px]">Schedule</button>
            </div>
            <div className="overflow-auto border rounded-lg">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 font-bold"><tr><th className="p-3">Schedule ID</th><th className="p-3">Task</th><th className="p-3">Machine</th><th className="p-3">Planned Date</th><th className="p-3">Frequency</th><th className="p-3">Status</th></tr></thead>
                    <tbody>
                        {schedules.map(s => (
                            <tr key={s.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono">{s.id}</td><td className="p-3">{getTaskName(s.taskId)}</td><td className="p-3">{getMachineName(s.machineId)}</td>
                                <td className="p-3">{new Date(s.plannedStartDate).toLocaleDateString()}</td><td className="p-3">{s.frequency}</td>
                                <td className="p-3"><span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs">{s.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderWorkOrdersTab = () => {
        const filteredWOs = workOrders.filter(wo => {
            if (woFilterStatus !== 'All' && wo.status !== woFilterStatus) return false;
            if (woFilterLocation && wo.locationId !== woFilterLocation) return false;
            return true;
        });

        return (
            <div className="space-y-4">
                <div className="flex gap-2 mb-2">
                    <select className="border rounded p-2 text-sm" value={woFilterStatus} onChange={e => setWoFilterStatus(e.target.value)}><option value="All">All Status</option><option>Draft</option><option>Released</option><option>In Progress</option><option>Completed</option></select>
                    <select className="border rounded p-2 text-sm" value={woFilterLocation} onChange={e => setWoFilterLocation(e.target.value)}><option value="">All Locations</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                </div>
                <div className="overflow-auto border rounded-lg">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-100 font-bold"><tr><th className="p-3">WO #</th><th className="p-3">Type</th><th className="p-3">Task / Description</th><th className="p-3">Machine</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">MRO Status</th><th className="p-3 text-right">Action</th></tr></thead>
                        <tbody>
                            {filteredWOs.map(wo => {
                                const stockCheck = checkStockForWorkOrder(wo);
                                return (
                                    <tr key={wo.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-mono font-bold">{wo.id}</td>
                                        <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${wo.type === 'Corrective' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{wo.type}</span></td>
                                        <td className="p-3">{getTaskName(wo.taskId)}</td>
                                        <td className="p-3">{getMachineName(wo.machineId)}</td>
                                        <td className="p-3">{new Date(wo.plannedDate).toLocaleDateString()}</td>
                                        <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${wo.status === 'Completed' ? 'bg-green-100 text-green-800' : wo.status === 'Released' ? 'bg-purple-100 text-purple-800' : 'bg-gray-200'}`}>{wo.status}</span></td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs ${stockCheck.status === 'Shortage' ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                {stockCheck.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            {wo.status === 'Draft' && (
                                                <button onClick={() => handleReleaseWorkOrder(wo)} className="text-blue-600 font-bold hover:underline text-xs">Release</button>
                                            )}
                                            {wo.status === 'Released' && (
                                                <button onClick={() => onUpdateWorkOrder({ ...wo, status: 'Completed' })} className="text-green-600 font-bold hover:underline text-xs">Complete</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderCalendarTab = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        return (
            <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">{monthNames[month]} {year}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">◀ Prev</button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Today</button>
                        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Next ▶</button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1 font-bold text-center text-gray-500 text-sm mb-2">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
                    {days.map((day, idx) => {
                        if (!day) return <div key={idx} className="bg-gray-50 rounded"></div>;

                        const dayWOs = workOrders.filter(wo => {
                            const d = new Date(wo.plannedDate);
                            return d.getDate() === day.getDate() && d.getMonth() === month && d.getFullYear() === year;
                        });

                        return (
                            <div key={idx} className="bg-white border rounded p-1 min-h-[80px] hover:bg-gray-50 transition relative overflow-hidden group">
                                <span className={`text-xs font-bold p-1 rounded-full ${day.toDateString() === new Date().toDateString() ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>{day.getDate()}</span>
                                <div className="mt-1 space-y-1 overflow-y-auto max-h-[100px]">
                                    {dayWOs.map(wo => (
                                        <div key={wo.id} className={`text-[10px] p-1 rounded truncate border-l-2 cursor-pointer ${wo.type === 'Corrective' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-blue-50 border-blue-500 text-blue-800'}`} title={`${wo.id}: ${getTaskName(wo.taskId)}`}>
                                            {wo.type === 'Corrective' ? '🔧' : '📅'} {getMachineName(wo.machineId)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderAnalysisTab = () => {
        const total = workOrders.length;
        const completed = workOrders.filter(w => w.status === 'Completed').length;
        const compliance = total > 0 ? (completed / total) * 100 : 0;

        const machineFailureCounts: Record<string, number> = {};
        workOrders.filter(w => w.type === 'Corrective').forEach(w => {
            const name = getMachineName(w.machineId);
            machineFailureCounts[name] = (machineFailureCounts[name] || 0) + 1;
        });
        const chartData = Object.entries(machineFailureCounts).map(([name, val]) => ({ name, value: val })).slice(0, 5);

        return (
            <div className="space-y-6 overflow-y-auto h-full">
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded border shadow-sm">
                        <h4 className="text-gray-500 text-xs uppercase font-bold">Schedule Compliance</h4>
                        <p className="text-2xl font-bold text-blue-600">{compliance.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white p-4 rounded border shadow-sm">
                        <h4 className="text-gray-500 text-xs uppercase font-bold">Open Work Orders</h4>
                        <p className="text-2xl font-bold text-orange-600">{workOrders.filter(w => w.status !== 'Completed' && w.status !== 'Cancelled').length}</p>
                    </div>
                    <div className="bg-white p-4 rounded border shadow-sm">
                        <h4 className="text-gray-500 text-xs uppercase font-bold">Corrective vs Preventive</h4>
                        <p className="text-2xl font-bold text-gray-800">
                            {workOrders.filter(w => w.type === 'Corrective').length} / {workOrders.filter(w => w.type === 'Preventive').length}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded border shadow-sm">
                        <h4 className="text-gray-500 text-xs uppercase font-bold">MRO Shortage Risks</h4>
                        <p className="text-2xl font-bold text-red-600">{workOrders.filter(wo => checkStockForWorkOrder(wo).status === 'Shortage').length}</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded border shadow-sm h-80">
                    <h4 className="text-sm font-bold text-gray-700 mb-4">Top Machines by Breakdown Frequency</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#EF4444" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full space-y-4 animate-fade-in-up font-cairo">
            {/* Header Tabs */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span>📅</span> Maintenance Planning
                </h2>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg overflow-x-auto">
                    <button onClick={() => setActiveTab('work-orders')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'work-orders' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Work Orders</button>
                    <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'calendar' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Calendar</button>
                    <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'schedule' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Scheduling</button>
                    <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'tasks' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Task Master</button>
                    <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'analysis' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Analysis</button>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden min-h-0">
                {activeTab === 'tasks' && renderTasksTab()}
                {activeTab === 'schedule' && renderScheduleTab()}
                {activeTab === 'work-orders' && renderWorkOrdersTab()}
                {activeTab === 'calendar' && renderCalendarTab()}
                {activeTab === 'analysis' && renderAnalysisTab()}
            </div>
        </div>
    );
};

export default MaintenancePlanning;
