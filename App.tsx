
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import IssueForm from './components/IssueForm';
import HistoryTable from './components/HistoryTable';
import StockApproval from './components/StockApproval';
import MasterData from './components/MasterData';
import AssetManagement from './components/AssetManagement';
import AgriWorkOrder from './components/AgriWorkOrder';
import MaterialForecast from './components/MaterialForecast';
import AiAssistant from './components/AiAssistant';
import MROManagement from './components/MROManagement';
import MaintenancePlanning from './components/MaintenancePlanning';
import IssuePlanning from './components/IssuePlanning';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';

import { getItem, setItem, removeItem } from './services/storageService';
import { fetchAllDataFromCloud, DEFAULT_SCRIPT_URL } from './services/googleSheetsService';
import { fetchAllSupabaseData, upsertSupabaseRecord, deleteSupabaseRecord, bulkUpsertSupabaseRecords } from './services/supabaseService';
import { USERS, ITEMS, MACHINES, LOCATIONS, SECTORS, DIVISIONS, MAINTENANCE_PLANS, INITIAL_HISTORY, INITIAL_BREAKDOWNS, INITIAL_PURCHASE_ORDERS, INITIAL_TASKS, INITIAL_SCHEDULES, INITIAL_MAINTENANCE_WOS } from './constants';
import { User, Item, Machine, Location, Sector, Division, IssueRecord, MaintenancePlan, BreakdownRecord, BOMRecord, AgriOrderRecord, IrrigationLogRecord, ForecastPeriod, ForecastRecord, PurchaseOrder, MaintenanceTask, MaintenanceSchedule, MaintenanceWorkOrder, AssetTransfer, MachineTransferHistoryEntry, WarrantyRecord, WarrantyReceivingRecord, OrgStructure, FailureType, IssuePlanPeriod, IssuePlanEntry } from './types';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>(USERS);
    const [currentView, setCurrentView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [items, setItems] = useState<Item[]>(ITEMS);
    const [machines, setMachines] = useState<Machine[]>(MACHINES);
    const [locations, setLocations] = useState<Location[]>(LOCATIONS);
    const [sectors, setSectors] = useState<Sector[]>(SECTORS);
    const [divisions, setDivisions] = useState<Division[]>(DIVISIONS);
    const [plans, setPlans] = useState<MaintenancePlan[]>(MAINTENANCE_PLANS);
    const [history, setHistory] = useState<IssueRecord[]>(INITIAL_HISTORY);
    const [breakdowns, setBreakdowns] = useState<BreakdownRecord[]>(INITIAL_BREAKDOWNS);
    const [bomRecords, setBomRecords] = useState<BOMRecord[]>([]);
    const [agriOrders, setAgriOrders] = useState<AgriOrderRecord[]>([]);
    const [irrigationLogs, setIrrigationLogs] = useState<IrrigationLogRecord[]>([]);
    const [forecastPeriods, setForecastPeriods] = useState<ForecastPeriod[]>([]);
    const [forecastRecords, setForecastRecords] = useState<ForecastRecord[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);

    const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(INITIAL_TASKS);
    const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>(INITIAL_SCHEDULES);
    const [maintenanceWorkOrders, setMaintenanceWorkOrders] = useState<MaintenanceWorkOrder[]>(INITIAL_MAINTENANCE_WOS);

    const [assetTransfers, setAssetTransfers] = useState<AssetTransfer[]>([]);
    const [transferHistory, setTransferHistory] = useState<MachineTransferHistoryEntry[]>([]);
    const [warrantyRecords, setWarrantyRecords] = useState<WarrantyRecord[]>([]);
    const [warrantyReceivings, setWarrantyReceivings] = useState<WarrantyReceivingRecord[]>([]);

    const [issuePlanPeriods, setIssuePlanPeriods] = useState<IssuePlanPeriod[]>([]);
    const [issuePlanEntries, setIssuePlanEntries] = useState<IssuePlanEntry[]>([]);

    const [orgStructures, setOrgStructures] = useState<OrgStructure[]>([]);
    const [failureTypes, setFailureTypes] = useState<FailureType[]>([]);
    const [isDbConnected, setIsDbConnected] = useState(true);

    const [uploadProgress, setUploadProgress] = useState<{
        isUploading: boolean;
        current: number;
        total: number;
        batchNum: number;
        totalBatches: number;
        tableName: string;
        isCancelled?: boolean;
    } | null>(null);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const dbData = await fetchAllSupabaseData();

                if (dbData) {
                    if (dbData.items) setItems(dbData.items);
                    if (dbData.machines) setMachines(dbData.machines);
                    if (dbData.locations) setLocations(dbData.locations);
                    if (dbData.sectors) setSectors(dbData.sectors);
                    if (dbData.divisions) setDivisions(dbData.divisions);
                    if (dbData.plans) setPlans(dbData.plans);
                    if (dbData.users) {
                        const loadedUsers = dbData.users;
                        const localAdmin = USERS.find(u => u.username === 'admin');
                        if (localAdmin && !loadedUsers.some((u: User) => u.username === 'admin')) {
                            loadedUsers.push(localAdmin);
                            upsertSupabaseRecord('users', localAdmin);
                        }
                        setUsers(loadedUsers);
                    }
                    if (dbData.history) setHistory(dbData.history);
                    if (dbData.breakdowns) setBreakdowns(dbData.breakdowns);
                    if (dbData.bomRecords) setBomRecords(dbData.bomRecords);
                    if (dbData.agriOrders) setAgriOrders(dbData.agriOrders);
                    if (dbData.irrigationLogs) setIrrigationLogs(dbData.irrigationLogs);
                    if (dbData.forecastPeriods) setForecastPeriods(dbData.forecastPeriods);
                    if (dbData.forecastRecords) setForecastRecords(dbData.forecastRecords);
                    if (dbData.tasks) setMaintenanceTasks(dbData.tasks);
                    if (dbData.schedules) setMaintenanceSchedules(dbData.schedules);
                    if (dbData.workOrders) setMaintenanceWorkOrders(dbData.workOrders);
                    setAssetTransfers(dbData.assetTransfers || []);
                    setTransferHistory(dbData.transferHistory || []);
                    setWarrantyRecords(dbData.warrantyRecords || []);
                    setWarrantyReceivings(dbData.warrantyReceivings || []);

                    setIssuePlanPeriods(dbData.issuePlanPeriods || []);
                    setIssuePlanEntries(dbData.issuePlanEntries || []);

                    setOrgStructures(dbData.orgStructures || []);
                    setFailureTypes(dbData.failureTypes || []);
                } else {
                    console.warn("Supabase data load returned no data, using defaults.");
                    setIsDbConnected(false);
                }

                const u = await getItem<User>('user');
                if (u) {
                    if (dbData && dbData.users) {
                        const freshUser = dbData.users.find(dbU => dbU.username === u.username);
                        if (freshUser) {
                            console.log("Syncing user session with fresh DB data:", freshUser.username);
                            setUser(freshUser);
                            setItem('user', freshUser); 
                        } else {
                            setUser(u); 
                        }
                    } else {
                        setUser(u);
                    }
                }

            } catch (e) {
                console.error("Failed to load data from Supabase", e);
                setIsDbConnected(false);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const handleLogin = (u: User) => {
        setUser(u);
        setItem('user', u); 
        setCurrentView('dashboard'); 
    };
    const handleLogout = () => {
        setUser(null);
        removeItem('user');
    };


    const handleAddItem = (item: Item) => {
        setItems([...items, item]);
        upsertSupabaseRecord('items', item);
    };
    const handleUpdateItem = (item: Item) => {
        setItems(items.map(i => i.id === item.id ? item : i));
        upsertSupabaseRecord('items', item);
    };
    const handleDeleteItems = (ids: string[]) => {
        setItems(items.filter(i => !ids.includes(i.id)));
        ids.forEach(id => deleteSupabaseRecord('items', id));
    };

    const handleAddMachine = (m: Machine) => {
        setMachines([...machines, m]);
        upsertSupabaseRecord('machines', m);
    };
    const handleUpdateMachine = (m: Machine) => {
        setMachines(machines.map(x => x.id === m.id ? m : x));
        upsertSupabaseRecord('machines', m);
    };
    const handleDeleteMachines = (ids: string[]) => {
        setMachines(machines.filter(x => !ids.includes(x.id)));
        ids.forEach(id => deleteSupabaseRecord('machines', id));
    };

    const handleAddLocation = (l: Location) => {
        setLocations([...locations, l]);
        upsertSupabaseRecord('locations', l);
    };
    const handleUpdateLocation = (l: Location) => {
        setLocations(locations.map(x => x.id === l.id ? l : x));
        upsertSupabaseRecord('locations', l);
    };
    const handleDeleteLocations = (ids: string[]) => {
        setLocations(locations.filter(x => !ids.includes(x.id)));
        ids.forEach(id => deleteSupabaseRecord('locations', id));
    };

    const handleAddSector = (s: Sector) => {
        setSectors([...sectors, s]);
        upsertSupabaseRecord('sectors', s);
    };
    const handleUpdateSector = (s: Sector) => {
        setSectors(sectors.map(x => x.id === s.id ? s : x));
        upsertSupabaseRecord('sectors', s);
    };
    const handleDeleteSectors = (ids: string[]) => {
        setSectors(sectors.filter(x => !ids.includes(x.id)));
        ids.forEach(id => deleteSupabaseRecord('sectors', id));
    };

    const handleAddDivision = (d: Division) => {
        setDivisions([...divisions, d]);
        upsertSupabaseRecord('divisions', d);
    };
    const handleUpdateDivision = (d: Division) => {
        setDivisions(divisions.map(x => x.id === d.id ? d : x));
        upsertSupabaseRecord('divisions', d);
    };
    const handleDeleteDivisions = (ids: string[]) => {
        setDivisions(divisions.filter(x => !ids.includes(x.id)));
        ids.forEach(id => deleteSupabaseRecord('divisions', id));
    };

    const handleAddPlan = (p: MaintenancePlan) => {
        setPlans([...plans, p]);
        upsertSupabaseRecord('plans', p);
    };
    const handleUpdatePlan = (p: MaintenancePlan) => {
        setPlans(plans.map(x => x.id === p.id ? p : x));
        upsertSupabaseRecord('plans', p);
    };
    const handleDeletePlans = (ids: string[]) => {
        setPlans(plans.filter(x => !ids.includes(x.id)));
        ids.forEach(id => deleteSupabaseRecord('plans', id));
    };

    const handleAddOrgStructure = (os: OrgStructure) => {
        setOrgStructures([...orgStructures, os]);
        upsertSupabaseRecord('orgStructures', os);
    };
    const handleUpdateOrgStructure = (os: OrgStructure) => {
        setOrgStructures(orgStructures.map(x => x.id === os.id ? os : x));
        upsertSupabaseRecord('orgStructures', os);
    };
    const handleDeleteOrgStructures = (ids: string[]) => {
        setOrgStructures(orgStructures.filter(x => !ids.includes(x.id)));
        ids.forEach(id => deleteSupabaseRecord('orgStructures', id));
    };

    const handleAddFailureType = (ft: FailureType) => {
        setFailureTypes([...failureTypes, ft]);
        upsertSupabaseRecord('failureTypes', ft);
    };
    const handleUpdateFailureType = (ft: FailureType) => {
        setFailureTypes(failureTypes.map(x => x.code === ft.code ? ft : x));
        upsertSupabaseRecord('failureTypes', ft);
    };
    const handleDeleteFailureTypes = (codes: string[]) => {
        setFailureTypes(failureTypes.filter(x => !codes.includes(x.code)));
        codes.forEach(code => deleteSupabaseRecord('failureTypes', code));
    };

    const handleAddUser = (u: User) => {
        setUsers([...users, u]);
        upsertSupabaseRecord('users', u);
    };
    const handleUpdateUser = (u: User) => {
        setUsers(users.map(x => x.username === u.username ? u : x));
        upsertSupabaseRecord('users', u);
    };
    const handleDeleteUsers = (names: string[]) => {
        setUsers(users.filter(x => !names.includes(x.username)));
        names.forEach(id => deleteSupabaseRecord('users', id));
    };

    const handleAddIssue = (issue: IssueRecord) => {
        setHistory(prev => [issue, ...prev]);
        upsertSupabaseRecord('history', issue);

        const item = items.find(i => i.id === issue.itemId);
        if (item && item.stockQuantity !== undefined) {
            const newStock = Math.max(0, item.stockQuantity - issue.quantity);
            const updatedItem = { ...item, stockQuantity: newStock };
            handleUpdateItem(updatedItem);
        }
    };
    const handleUpdateIssue = (issue: IssueRecord) => {
        setHistory(history.map(x => x.id === issue.id ? issue : x));
        upsertSupabaseRecord('history', issue);
    };

    const handleAddBreakdown = (b: BreakdownRecord) => {
        setBreakdowns([b, ...breakdowns]);
        upsertSupabaseRecord('breakdowns', b);
    };
    const handleUpdateBreakdown = (b: BreakdownRecord) => {
        setBreakdowns(breakdowns.map(x => x.id === b.id ? b : x));
        upsertSupabaseRecord('breakdowns', b);
    };

    const handleAddBOM = (b: BOMRecord) => {
        setBomRecords([...bomRecords, b]);
        upsertSupabaseRecord('bomRecords', b);
    };
    const handleUpdateBOM = (b: BOMRecord) => {
        setBomRecords(bomRecords.map(x => x.id === b.id ? b : x));
        upsertSupabaseRecord('bomRecords', b);
    };
    const handleDeleteBOMs = (ids: string[]) => {
        setBomRecords(bomRecords.filter(x => !ids.includes(x.id)));
        ids.forEach(id => deleteSupabaseRecord('bomRecords', id));
    };

    const handleAddAgriOrder = (o: AgriOrderRecord) => {
        setAgriOrders([...agriOrders, o]);
        upsertSupabaseRecord('agriOrders', o);
    };
    const handleUpdateAgriOrder = (o: AgriOrderRecord) => {
        setAgriOrders(agriOrders.map(x => x.id === o.id ? o : x));
        upsertSupabaseRecord('agriOrders', o);
    };
    const handleDeleteAgriOrders = (ids: string[]) => {
        setAgriOrders(agriOrders.filter(x => !ids.includes(x.id)));
        ids.forEach(id => deleteSupabaseRecord('agriOrders', id));
    };

    const handleAddIrrigationLog = (l: IrrigationLogRecord) => {
        setIrrigationLogs([...irrigationLogs, l]);
        upsertSupabaseRecord('irrigationLogs', l);
    };
    const handleUpdateIrrigationLog = (l: IrrigationLogRecord) => {
        setIrrigationLogs(irrigationLogs.map(x => x.id === l.id ? l : x));
        upsertSupabaseRecord('irrigationLogs', l);
    };
    const handleDeleteIrrigationLogs = (ids: string[]) => {
        setIrrigationLogs(irrigationLogs.filter(x => !ids.includes(x.id)));
        ids.forEach(id => deleteSupabaseRecord('irrigationLogs', id));
    };

    const handleAddForecastPeriod = (p: ForecastPeriod) => {
        setForecastPeriods([...forecastPeriods, p]);
        upsertSupabaseRecord('forecastPeriods', p);
    };
    const handleUpdateForecastPeriod = (p: ForecastPeriod) => {
        setForecastPeriods(forecastPeriods.map(x => x.id === p.id ? p : x));
        upsertSupabaseRecord('forecastPeriods', p);
    };
    const handleUpdateForecastRecords = (newRecords: ForecastRecord[]) => {
        setForecastRecords(newRecords);
        newRecords.forEach(r => upsertSupabaseRecord('forecastRecords', r));
    };

    const handleAddPO = (po: PurchaseOrder) => {
        setPurchaseOrders([...purchaseOrders, po]);
    };

    const handleAddTask = (t: MaintenanceTask) => {
        setMaintenanceTasks([...maintenanceTasks, t]);
        upsertSupabaseRecord('tasks', t);
    };
    const handleUpdateTask = (t: MaintenanceTask) => {
        setMaintenanceTasks(maintenanceTasks.map(task => task.id === t.id ? t : task));
        upsertSupabaseRecord('tasks', t);
    };
    const handleAddSchedule = (s: MaintenanceSchedule) => {
        setMaintenanceSchedules([...maintenanceSchedules, s]);
        upsertSupabaseRecord('schedules', s);
    };
    const handleUpdateSchedule = (s: MaintenanceSchedule) => {
        setMaintenanceSchedules(maintenanceSchedules.map(sch => sch.id === s.id ? s : sch));
        upsertSupabaseRecord('schedules', s);
    };
    const handleAddWorkOrder = (wo: MaintenanceWorkOrder) => {
        setMaintenanceWorkOrders([...maintenanceWorkOrders, wo]);
        upsertSupabaseRecord('workOrders', wo);
    };
    const handleUpdateWorkOrder = (wo: MaintenanceWorkOrder) => {
        setMaintenanceWorkOrders(maintenanceWorkOrders.map(w => w.id === wo.id ? wo : w));
        upsertSupabaseRecord('workOrders', wo);
    };

    const handleAddTransfer = (t: AssetTransfer) => {
        setAssetTransfers([t, ...assetTransfers]);
        upsertSupabaseRecord('assetTransfers', t);
    };
    const handleUpdateTransfer = (t: AssetTransfer) => {
        setAssetTransfers(assetTransfers.map(x => x.id === t.id ? t : x));
        upsertSupabaseRecord('assetTransfers', t);

        if (t.status === 'Executed') {
            const fetchUpdates = async () => {
                const dbData = await fetchAllSupabaseData();
                if (dbData) {
                    if (dbData.machines) setMachines(dbData.machines);
                    if (dbData.transferHistory) setTransferHistory(dbData.transferHistory);
                }
            };
            fetchUpdates();
        }
    };
    const handleAddWarranty = (w: WarrantyRecord) => {
        setWarrantyRecords([...warrantyRecords, w]);
        upsertSupabaseRecord('warrantyRecords', w);
    };
    const handleAddWarrantyReceiving = (r: WarrantyReceivingRecord) => {
        setWarrantyReceivings([...warrantyReceivings, r]);
        upsertSupabaseRecord('warrantyReceivings', r);
    };

    const handleAddPeriod = (p: IssuePlanPeriod) => {
        setIssuePlanPeriods([...issuePlanPeriods, p]);
        upsertSupabaseRecord('issuePlanPeriods', p);
    };
    const handleUpdatePeriod = (p: IssuePlanPeriod) => {
        setIssuePlanPeriods(issuePlanPeriods.map(pr => pr.id === p.id ? p : pr));
        upsertSupabaseRecord('issuePlanPeriods', p);
    };
    const handleUpdateEntry = (e: IssuePlanEntry) => {
        const exists = issuePlanEntries.find(ent => ent.id === e.id);
        const newEntries = exists
            ? issuePlanEntries.map(ent => ent.id === e.id ? e : ent)
            : [...issuePlanEntries, e];
        setIssuePlanEntries(newEntries);
        upsertSupabaseRecord('issuePlanEntries', e);
    };
    const handleDeleteEntry = (id: string) => {
        setIssuePlanEntries(issuePlanEntries.filter(e => e.id !== id));
        deleteSupabaseRecord('issuePlanEntries', id);
    };

    const handleBulkImport = async (tab: string, added: any[], updated: any[]) => {
        if (tab === 'items') {
            const newItems = [...items];
            added.forEach(a => { newItems.push(a); });
            updated.forEach(u => {
                const idx = newItems.findIndex(i => i.id === u.id);
                if (idx > -1) newItems[idx] = u;
            });
            setItems(newItems);
        } else if (tab === 'machines') {
            const newMachines = [...machines];
            added.forEach(a => { newMachines.push(a); });
            updated.forEach(u => {
                const idx = newMachines.findIndex(m => m.id === u.id);
                if (idx > -1) newMachines[idx] = u;
            });
            setMachines(newMachines);
        } else if (tab === 'bom') {
            const newBom = [...bomRecords];
            added.forEach(a => { newBom.push(a); });
            updated.forEach(u => {
                const idx = newBom.findIndex(b => b.id === u.id);
                if (idx > -1) newBom[idx] = u;
            });
            setBomRecords(newBom);
        } else if (tab === 'breakdowns') {
            const newBreakdowns = [...breakdowns];
            added.forEach(a => { newBreakdowns.push(a); });
            updated.forEach(u => {
                const idx = newBreakdowns.findIndex(b => b.id === u.id);
                if (idx > -1) newBreakdowns[idx] = u;
            });
            setBreakdowns(newBreakdowns);
        } else if (tab === 'locations') {
            const newLocs = [...locations];
            added.forEach(a => { newLocs.push(a); });
            updated.forEach(u => {
                const idx = newLocs.findIndex(l => l.id === u.id);
                if (idx > -1) newLocs[idx] = u;
            });
            setLocations(newLocs);
        } else if (tab === 'sectors') {
            const newSecs = [...sectors];
            added.forEach(a => { newSecs.push(a); });
            updated.forEach(u => {
                const idx = newSecs.findIndex(s => s.id === u.id);
                if (idx > -1) newSecs[idx] = u;
            });
            setSectors(newSecs);
        } else if (tab === 'divisions') {
            const newDivs = [...divisions];
            added.forEach(a => { newDivs.push(a); });
            updated.forEach(u => {
                const idx = newDivs.findIndex(d => d.id === u.id);
                if (idx > -1) newDivs[idx] = u;
            });
            setDivisions(newDivs);
        } else if (tab === 'plans') {
            const newPlans = [...plans];
            added.forEach(a => { newPlans.push(a); });
            updated.forEach(u => {
                const idx = newPlans.findIndex(p => p.id === u.id);
                if (idx > -1) newPlans[idx] = u;
            });
            setPlans(newPlans);
        } else if (tab === 'users') {
            const newUsers = [...users];
            added.forEach(a => { newUsers.push(a); });
            updated.forEach(u => {
                const idx = newUsers.findIndex(usr => usr.username === u.username);
                if (idx > -1) newUsers[idx] = u;
            });
            setUsers(newUsers);
        } else if (tab === 'periods') {
            const newPeriods = [...forecastPeriods];
            added.forEach(a => { newPeriods.push(a); });
            updated.forEach(u => {
                const idx = newPeriods.findIndex(p => p.id === u.id);
                if (idx > -1) newPeriods[idx] = u;
            });
            setForecastPeriods(newPeriods);
        } else if (tab === 'history') {
            const newHistory = [...history];
            added.forEach(a => { newHistory.push(a); });
            updated.forEach(u => {
                const idx = newHistory.findIndex(h => h.id === u.id);
                if (idx > -1) newHistory[idx] = u;
            });
            setHistory(newHistory);
        } else if (tab === 'orgStructure') {
            const newOS = [...orgStructures];
            added.forEach(a => { newOS.push(a); });
            updated.forEach(u => {
                const idx = newOS.findIndex(x => x.id === u.id);
                if (idx > -1) newOS[idx] = u;
            });
            setOrgStructures(newOS);
        } else if (tab === 'failureTypes') {
            const newFT = [...failureTypes];
            added.forEach(a => { newFT.push(a); });
            updated.forEach(u => {
                const idx = newFT.findIndex(x => x.code === u.code);
                if (idx > -1) newFT[idx] = u;
            });
            setFailureTypes(newFT);
        } else if (tab === 'issue-planning-entries') {
            const newEntries = [...issuePlanEntries];
            added.forEach(a => { newEntries.push(a); });
            updated.forEach(u => {
                const idx = newEntries.findIndex(e => e.id === u.id);
                if (idx > -1) newEntries[idx] = u;
            });
            setIssuePlanEntries(newEntries);
        }

        const allRecords = [...added, ...updated];

        let tableName = '';
        if (tab === 'items') tableName = 'items';
        else if (tab === 'machines') tableName = 'machines';
        else if (tab === 'bom') tableName = 'bomRecords';
        else if (tab === 'breakdowns') tableName = 'breakdowns';
        else if (tab === 'locations') tableName = 'locations';
        else if (tab === 'sectors') tableName = 'sectors';
        else if (tab === 'divisions') tableName = 'divisions';
        else if (tab === 'plans') tableName = 'plans';
        else if (tab === 'users') tableName = 'users';
        else if (tab === 'periods') tableName = 'forecastPeriods';
        else if (tab === 'history') tableName = 'history';
        else if (tab === 'orgStructure') tableName = 'orgStructures';
        else if (tab === 'failureTypes') tableName = 'failureTypes';
        else if (tab === 'issue-planning-entries') tableName = 'issuePlanEntries';

        if (tableName && allRecords.length > 0) {
            try {
                setUploadProgress({
                    isUploading: true,
                    current: 0,
                    total: allRecords.length,
                    batchNum: 0,
                    totalBatches: Math.ceil(allRecords.length / 100),
                    tableName: tab,
                    isCancelled: false
                });

                const result = await bulkUpsertSupabaseRecords(tableName, allRecords, (current, total, batchNum, totalBatches) => {
                    setUploadProgress({
                        isUploading: true,
                        current,
                        total,
                        batchNum,
                        totalBatches,
                        tableName: tab
                    });
                });

                setUploadProgress(null);

                if (result.status === 'error') {
                    console.error("Bulk Upsert Error:", result.message);
                    if (result.message.toLowerCase().includes('fetch')) {
                        alert(`Network Error: Failed to connect to database. Please check your internet connection or if Supabase is reachable. (URL: ${import.meta.env.VITE_SUPABASE_URL})`);
                    } else {
                        alert(`Save Failed: ${result.message}`);
                    }
                } else {
                    console.log(`Successfully saved ${result.count} records to ${tableName}`);
                }
            } catch (err: any) {
                setUploadProgress(null);

                if (err.message === 'Upload cancelled by user') {
                    console.log('Upload cancelled by user');
                    return;
                }

                console.error("Unexpected Error saving data:", err);
                const msg = err.message || '';
                if (msg.toLowerCase().includes('fetch')) {
                    alert("Connectivity Error: The application cannot reach the server. Please check your network.");
                } else {
                    alert(`Unexpected Error: ${msg}`);
                }
            }
        }
    };

    const handleRestore = async () => {
        const scriptUrl = localStorage.getItem('wf_script_url_v3') || DEFAULT_SCRIPT_URL;
        const data = await fetchAllDataFromCloud(scriptUrl);
        if (data) {
            if (data.items) { setItems(data.items); data.items.forEach(i => upsertSupabaseRecord('items', i)); }
            if (data.machines) { setMachines(data.machines); data.machines.forEach(m => upsertSupabaseRecord('machines', m)); }
            if (data.history) { setHistory(data.history); data.history.forEach(h => upsertSupabaseRecord('history', h)); }
            if (data.locations) { setLocations(data.locations); data.locations.forEach(l => upsertSupabaseRecord('locations', l)); }
            if (data.sectors) { setSectors(data.sectors); data.sectors.forEach(s => upsertSupabaseRecord('sectors', s)); }
            if (data.divisions) { setDivisions(data.divisions); data.divisions.forEach(d => upsertSupabaseRecord('divisions', d)); }
            if (data.users) { setUsers(data.users); data.users.forEach(u => upsertSupabaseRecord('users', u)); }
            if (data.plans) { setPlans(data.plans); data.plans.forEach(p => upsertSupabaseRecord('plans', p)); }
            if (data.breakdowns) { setBreakdowns(data.breakdowns); data.breakdowns.forEach(b => upsertSupabaseRecord('breakdowns', b)); }
            if (data.bom) { setBomRecords(data.bom); data.bom.forEach(b => upsertSupabaseRecord('bomRecords', b)); }
            if (data.agri_orders) { setAgriOrders(data.agri_orders); data.agri_orders.forEach(o => upsertSupabaseRecord('agriOrders', o)); }
            if (data.irrigation_logs) { setIrrigationLogs(data.irrigation_logs); data.irrigation_logs.forEach(l => upsertSupabaseRecord('irrigationLogs', l)); }
            if (data.forecasts) { setForecastRecords(data.forecasts); data.forecasts.forEach(f => upsertSupabaseRecord('forecastRecords', f)); }
            if (data.org_structure) { setOrgStructures(data.org_structure); data.org_structure.forEach(os => upsertSupabaseRecord('orgStructures', os)); }
            if (data.failure_types) { setFailureTypes(data.failure_types); data.failure_types.forEach(ft => upsertSupabaseRecord('failureTypes', ft)); }
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    if (!user) {
        return <Login onLogin={handleLogin} users={users} />;
    }

    return (
        <ErrorBoundary>
            <div className="flex min-h-screen bg-gray-100 font-sans">
                <Sidebar
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    currentUser={user}
                    onLogout={handleLogout}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    isDbConnected={isDbConnected}
                />

                <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                    {/* Mobile Header */}
                    <header className="bg-white shadow-sm z-20 md:hidden flex items-center justify-between p-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600">
                            <span className="text-2xl">☰</span>
                        </button>
                        <h1 className="font-bold text-gray-800">Daltex Maintenance</h1>
                        <div className="w-8"></div>
                    </header>

                    <main className="flex-1 p-4 md:p-6 scroll-smooth overflow-auto">
                        {(() => {
                            switch (currentView) {
                                case 'dashboard':
                                    return <Dashboard history={history} items={items} machines={machines} locations={locations} breakdowns={breakdowns} setCurrentView={setCurrentView} currentUser={user} />;
                                case 'issue-form':
                                    return <IssueForm onAddIssue={handleAddIssue} items={items} machines={machines} locations={locations} sectors={sectors} divisions={divisions} maintenancePlans={plans} bomRecords={bomRecords} currentUser={user} orgStructures={orgStructures} />;
                                case 'history':
                                    return <HistoryTable history={history} locations={locations} items={items} machines={machines} onBulkImport={handleBulkImport} onUpdateIssue={handleUpdateIssue} />;
                                case 'stock-approval':
                                    if (!['admin', 'warehouse_manager', 'warehouse_supervisor'].includes(user.role)) {
                                        return <Dashboard history={history} items={items} machines={machines} locations={locations} breakdowns={breakdowns} setCurrentView={setCurrentView} currentUser={user} />;
                                    }
                                    return <StockApproval history={history} locations={locations} items={items} machines={machines} onUpdateIssue={handleUpdateIssue} />;
                                case 'master-data':
                                    if (user.role !== 'admin') return <Dashboard history={history} items={items} machines={machines} locations={locations} breakdowns={breakdowns} setCurrentView={setCurrentView} currentUser={user} />;
                                    return <MasterData
                                        history={history} items={items} machines={machines} locations={locations} sectors={sectors} divisions={divisions} plans={plans}
                                        orgStructures={orgStructures} failureTypes={failureTypes}
                                        onAddItem={handleAddItem} onAddMachine={handleAddMachine} onAddLocation={handleAddLocation} onAddSector={handleAddSector} onAddDivision={handleAddDivision} onAddPlan={handleAddPlan}
                                        onAddOrgStructure={handleAddOrgStructure} onAddFailureType={handleAddFailureType}
                                        onUpdateItem={handleUpdateItem} onUpdateMachine={handleUpdateMachine} onUpdateLocation={handleUpdateLocation} onUpdateSector={handleUpdateSector} onUpdateDivision={handleUpdateDivision} onUpdatePlan={handleUpdatePlan}
                                        onUpdateOrgStructure={handleUpdateOrgStructure} onUpdateFailureType={handleUpdateFailureType}
                                        onDeleteItems={handleDeleteItems} onDeleteMachines={handleDeleteMachines} onDeleteLocations={handleDeleteLocations} onDeleteSectors={handleDeleteSectors} onDeleteDivisions={handleDeleteDivisions} onDeletePlans={handleDeletePlans}
                                        onDeleteOrgStructures={handleDeleteOrgStructures} onDeleteFailureTypes={handleDeleteFailureTypes}
                                        onBulkImport={handleBulkImport} onRestore={handleRestore}
                                    />;
                                case 'asset-management':
                                    return <AssetManagement
                                        machines={machines} items={items} bomRecords={bomRecords} locations={locations} sectors={sectors} divisions={divisions} failureTypes={failureTypes} breakdowns={breakdowns}
                                        assetTransfers={assetTransfers} transferHistory={transferHistory} warrantyRecords={warrantyRecords} warrantyReceiving={warrantyReceivings}
                                        onAddMachine={handleAddMachine} onUpdateMachine={handleUpdateMachine} onDeleteMachines={handleDeleteMachines}
                                        onAddBreakdown={handleAddBreakdown} onUpdateBreakdown={handleUpdateBreakdown}
                                        onAddBOM={handleAddBOM} onUpdateBOM={handleUpdateBOM} onDeleteBOMs={handleDeleteBOMs}
                                        onAddTransfer={handleAddTransfer} onUpdateTransfer={handleUpdateTransfer}
                                        onAddWarranty={handleAddWarranty} onAddWarrantyReceiving={handleAddWarrantyReceiving}
                                        onBulkImport={handleBulkImport} setCurrentView={setCurrentView}
                                        currentUser={user}
                                        orgStructures={orgStructures}
                                    />;
                                case 'agri-work-order':
                                    return <AgriWorkOrder
                                        orders={agriOrders} onAddOrder={handleAddAgriOrder} onUpdateOrder={handleUpdateAgriOrder} onDeleteOrders={handleDeleteAgriOrders}
                                        irrigationLogs={irrigationLogs} onAddIrrigationLog={handleAddIrrigationLog} onUpdateIrrigationLog={handleUpdateIrrigationLog} onDeleteIrrigationLogs={handleDeleteIrrigationLogs}
                                        locations={locations} machines={machines}
                                    />;
                                case 'material-forecast':
                                    return <MaterialForecast
                                        items={items} locations={locations} sectors={sectors} divisions={divisions} history={history}
                                        machines={machines} bomRecords={bomRecords}
                                        forecastPeriods={forecastPeriods} onAddPeriod={handleAddForecastPeriod} onUpdatePeriod={handleUpdateForecastPeriod}
                                        forecastRecords={forecastRecords} onUpdateForecast={handleUpdateForecastRecords}
                                        currentUser={user}
                                        onBulkImport={handleBulkImport}
                                        orgStructures={orgStructures}
                                    />;
                                case 'mro-management':
                                    return <MROManagement
                                        items={items} onUpdateItem={handleUpdateItem}
                                        purchaseOrders={purchaseOrders} onAddPO={handleAddPO}
                                        machines={machines} locations={locations}
                                    />;
                                case 'maintenance-planning':
                                    return <MaintenancePlanning
                                        tasks={maintenanceTasks}
                                        schedules={maintenanceSchedules}
                                        workOrders={maintenanceWorkOrders}
                                        machines={machines}
                                        locations={locations}
                                        items={items}
                                        onAddTask={handleAddTask}
                                        onUpdateTask={handleUpdateTask}
                                        onAddSchedule={handleAddSchedule}
                                        onUpdateSchedule={handleUpdateSchedule}
                                        onAddWorkOrder={handleAddWorkOrder}
                                        onUpdateWorkOrder={handleUpdateWorkOrder}
                                        currentUser={user}
                                    />;
                                case 'issue-planning':
                                    return <IssuePlanning
                                        periods={issuePlanPeriods}
                                        entries={issuePlanEntries}
                                        locations={locations}
                                        sectors={sectors}
                                        divisions={divisions}
                                        items={items}
                                        machines={machines}
                                        onAddPeriod={handleAddPeriod}
                                        onUpdatePeriod={handleUpdatePeriod}
                                        onUpdateEntry={handleUpdateEntry}
                                        onDeleteEntry={handleDeleteEntry}
                                        currentUser={user}
                                        onBulkImport={handleBulkImport}
                                        orgStructures={orgStructures}
                                    />;
                                case 'ai-assistant':
                                    return <AiAssistant />;
                                case 'settings':
                                    return <Settings
                                        onRestore={handleRestore}
                                        users={users}
                                        onAddUser={handleAddUser}
                                        onUpdateUser={handleUpdateUser}
                                        onDeleteUsers={handleDeleteUsers}
                                    />;
                                default:
                                    return <Dashboard history={history} items={items} machines={machines} locations={locations} breakdowns={breakdowns} setCurrentView={setCurrentView} currentUser={user} />;
                            }
                        })()}
                    </main>
                </div>

                {/* Upload Progress Modal */}
                {uploadProgress && (
                    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in-up relative">
                            <div className="text-center">
                                <div className="mb-6">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                        <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Uploading Data</h3>
                                    <p className="text-sm text-gray-600">Please wait while we save your {uploadProgress.tableName}...</p>
                                </div>

                                <div className="mb-6">
                                    <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                                        <span>Progress</span>
                                        <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="text-gray-500 text-xs mb-1">Records</div>
                                        <div className="font-bold text-gray-900">{uploadProgress.current.toLocaleString()} / {uploadProgress.total.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="text-gray-500 text-xs mb-1">Batch</div>
                                        <div className="font-bold text-gray-900">{uploadProgress.batchNum} / {uploadProgress.totalBatches}</div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <span className="text-yellow-600 text-lg">⚠️</span>
                                        <p className="text-xs text-yellow-800 text-left">
                                            <strong>To terminate the loading, please refresh this page.</strong><br />
                                            Upload will stop if the page is refreshed or closed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};

export default App;
