import React, { useState, useMemo } from 'react';
import {
    IssuePlanPeriod, IssuePlanEntry, Location, Sector, Division, Item, Machine, OrgStructure
} from '../types';
import { Search, Upload, Plus, Trash, Save, Filter, FileText, BarChart2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { upsertSupabaseRecord, deleteSupabaseRecord } from '../services/supabaseService';
import SearchableSelect from './SearchableSelect';

interface IssuePlanningProps {
    periods: IssuePlanPeriod[];
    entries: IssuePlanEntry[];
    locations: Location[];
    sectors: Sector[];
    divisions: Division[];
    items: Item[];
    machines: Machine[];
    onAddPeriod: (p: IssuePlanPeriod) => void;
    onUpdatePeriod: (p: IssuePlanPeriod) => void;
    onUpdateEntry: (e: IssuePlanEntry) => void;
    onDeleteEntry: (id: string) => void;
    currentUser: any;
    onBulkImport: (tab: string, added: any[], updated: any[]) => void;
    orgStructures?: OrgStructure[];
}

const IssuePlanning: React.FC<IssuePlanningProps> = ({
    periods, entries, locations, sectors, divisions, items, machines,
    onAddPeriod, onUpdatePeriod, onUpdateEntry, onDeleteEntry, currentUser, onBulkImport, orgStructures = []
}) => {
    const [activeTab, setActiveTab] = useState<'entry' | 'aggregation' | 'analysis'>('entry');
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [selectedLocId, setSelectedLocId] = useState<string>('');
    const [selectedSectorId, setSelectedSectorId] = useState<string>('');
    const [selectedDivId, setSelectedDivId] = useState<string>('');

    const [newItemId, setNewItemId] = useState('');
    const [newMachineName, setNewMachineName] = useState(''); // Use strictly name string for planning flexibility
    const [newBrand, setNewBrand] = useState('');
    const [newModel, setNewModel] = useState('');
    const [newPcPerMc, setNewPcPerMc] = useState<number>(1);
    const [newMachineCount, setNewMachineCount] = useState<number>(0);
    const [newForecast, setNewForecast] = useState<number>(0);
    const [newNotes, setNewNotes] = useState('');

    const openPeriods = useMemo(() => periods.filter(p => p.status === 'Open'), [periods]);

    const currentPeriod = useMemo(() => periods.find(p => p.id === selectedPeriodId), [periods, selectedPeriodId]);

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            const periodMatch = selectedPeriodId ? e.periodId === selectedPeriodId : true;
            const locMatch = selectedLocId ? e.locationId === selectedLocId : true;
            const sectorMatch = selectedSectorId ? e.sectorId === selectedSectorId : true;
            const divMatch = selectedDivId ? e.divisionId === selectedDivId : true;
            return periodMatch && locMatch && sectorMatch && divMatch;
        });
    }, [entries, selectedPeriodId, selectedLocId, selectedSectorId, selectedDivId]);

    const availableSectors = useMemo(() => {
        if (!selectedLocId) return sectors;
        const orgMatch = orgStructures.filter(os => os.locationId === selectedLocId);
        if (orgMatch.length > 0) {
            const allowedIds = new Set(orgMatch.map(os => os.sectorId));
            return sectors.filter(s => allowedIds.has(s.id));
        }
        return sectors;
    }, [selectedLocId, sectors, orgStructures]);

    const availableDivisions = useMemo(() => {
        if (!selectedSectorId) return divisions;
        const orgMatch = orgStructures.filter(os =>
            os.locationId === selectedLocId && os.sectorId === selectedSectorId
        );
        if (orgMatch.length > 0) {
            const allowedIds = new Set(orgMatch.map(os => os.divisionId));
            return divisions.filter(d => allowedIds.has(d.id));
        }
        return divisions.filter(d => d.sectorId === selectedSectorId);
    }, [selectedLocId, selectedSectorId, divisions, orgStructures]);


    const handleCreatePeriod = () => {
        const name = prompt("Enter Period Name (e.g. 2025-Q1):");
        if (!name) return;
        const newPeriod: IssuePlanPeriod = {
            id: `PER-${Date.now()}`,
            name,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            status: 'Open'
        };
        onAddPeriod(newPeriod);
        setSelectedPeriodId(newPeriod.id);
    };

    const handleAddEntry = () => {
        if (!selectedPeriodId) { alert("Please select a Period first."); return; }
        if (!selectedLocId) { alert("Please select a Location."); return; }
        if (!newItemId) { alert("Please select an Item."); return; }


        const selectedItem = items.find(i => i.id === newItemId);
        const actualQty = selectedItem?.stockQuantity || 0;

        const calculatedForecast = newForecast > 0 ? newForecast : (newMachineCount * newPcPerMc);

        const newEntry: IssuePlanEntry = {
            id: `PLAN-${Date.now()}`,
            periodId: selectedPeriodId,
            locationId: selectedLocId,
            sectorId: selectedSectorId,
            divisionId: selectedDivId,
            itemId: newItemId,
            machineCount: newMachineCount,
            actualQuantity: actualQty,
            forecastQuantity: calculatedForecast,
            notes: newNotes,
            updatedBy: currentUser.username,
            lastUpdated: new Date().toISOString()
        };

        onUpdateEntry(newEntry);

        setNewItemId('');
        setNewMachineCount(0);
        setNewForecast(0);
        setNewNotes('');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsName = wb.SheetNames[0];
            const ws = wb.Sheets[wsName];
            const data = XLSX.utils.sheet_to_json(ws);

            if (!selectedPeriodId) {
                alert("Please select a target Period first.");
                return;
            }

            const importedEntries: IssuePlanEntry[] = [];

            data.forEach((row: any) => {
                const loc = locations.find(l => l.name === row['Location'] || l.id === row['Location']);
                const item = items.find(i => i.id === row['ItemCode'] || i.name === row['ItemName']);

                if (loc && item) {
                    importedEntries.push({
                        id: `PLAN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        periodId: selectedPeriodId,
                        locationId: loc.id,
                        sectorId: '',
                        divisionId: '',
                        itemId: item.id,
                        machineCount: Number(row['MachineCount']) || 0,
                        actualQuantity: item.stockQuantity || 0,
                        forecastQuantity: Number(row['Forecast']) || 0,
                        notes: row['Notes'] || 'Imported',
                        updatedBy: currentUser.username,
                        lastUpdated: new Date().toISOString()
                    });
                }
            });

            if (importedEntries.length > 0) {
                onBulkImport('issuePlanEntries', importedEntries, []); // Pass to bulk import wrapper if available or loop
                importedEntries.forEach(ent => onUpdateEntry(ent));
                alert(`Imported ${importedEntries.length} entries.`);
            } else {
                alert("No valid entries found. Check column names: Location, ItemCode, MachineCount, Forecast");
            }
        };
        reader.readAsBinaryString(file);
    };

    const aggregatedData = useMemo(() => {
        const agg: Record<string, any> = {};
        filteredEntries.forEach(e => {
            const key = `${e.locationId}-${e.itemId}`;
            if (!agg[key]) {
                const item = items.find(i => i.id === e.itemId);
                const loc = locations.find(l => l.id === e.locationId);
                agg[key] = {
                    locationName: loc?.name || 'Unknown',
                    itemName: item?.name || 'Unknown',
                    itemCode: item?.id || '',
                    totalForecast: 0,
                    totalActual: 0,
                    count: 0
                };
            }
            agg[key].totalForecast += Number(e.forecastQuantity);
            agg[key].totalActual += Number(e.actualQuantity);
            agg[key].count++;
        });
        return Object.values(agg);
    }, [filteredEntries, items, locations]);

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header & Period Selection */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <FileText className="mr-2 h-6 w-6 text-teal-600" /> Issue Planning
                    </h2>
                    <p className="text-sm text-gray-500">Plan material requirements per machine and location.</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="h-10 border border-gray-300 rounded-lg px-3 focus:ring-2 focus:ring-teal-500 outline-none"
                        value={selectedPeriodId}
                        onChange={(e) => setSelectedPeriodId(e.target.value)}
                    >
                        <option value="">Select Period...</option>
                        {periods.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                        ))}
                    </select>
                    <button onClick={handleCreatePeriod} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600" title="New Period">
                        <Plus className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('entry')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'entry' ? 'border-b-2 border-teal-500 text-teal-700 bg-teal-50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Data Entry
                    </button>
                    <button
                        onClick={() => setActiveTab('aggregation')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'aggregation' ? 'border-b-2 border-teal-500 text-teal-700 bg-teal-50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Aggregation Hub
                    </button>
                    <button
                        onClick={() => setActiveTab('analysis')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'analysis' ? 'border-b-2 border-teal-500 text-teal-700 bg-teal-50' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Variance Analysis
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1">
                    {activeTab === 'entry' && (
                        <div className="space-y-6">
                            {/* 1. Global Filters/Context for Entry */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="w-full md:w-64">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Target Location</label>
                                    <select
                                        className="w-full h-10 border border-gray-300 rounded-lg px-3 bg-white"
                                        value={selectedLocId}
                                        onChange={(e) => { setSelectedLocId(e.target.value); setSelectedSectorId(''); setSelectedDivId(''); }}
                                    >
                                        <option value="">Select Location...</option>
                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div className="w-full md:w-64">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Target Sector</label>
                                    <select
                                        className="w-full h-10 border border-gray-300 rounded-lg px-3 bg-white"
                                        value={selectedSectorId}
                                        onChange={(e) => { setSelectedSectorId(e.target.value); setSelectedDivId(''); }}
                                    >
                                        <option value="">Select Sector...</option>
                                        {availableSectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="w-full md:w-64">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Target Division</label>
                                    <select
                                        className="w-full h-10 border border-gray-300 rounded-lg px-3 bg-white"
                                        value={selectedDivId}
                                        onChange={(e) => setSelectedDivId(e.target.value)}
                                    >
                                        <option value="">Select Division...</option>
                                        {availableDivisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1 flex items-end justify-end">
                                    <label className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition shadow-sm">
                                        <Upload className="h-4 w-4 mr-2" />
                                        <span>Import Excel</span>
                                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            </div>

                            {/* 2. Single Entry Form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg border-dashed">
                                <div className="col-span-1 md:col-span-2">
                                    <SearchableSelect
                                        label="Item (Description/Code)"
                                        options={items.map(i => ({ id: i.id, label: `${i.id} - ${i.name}` }))}
                                        value={newItemId}
                                        onChange={setNewItemId}
                                        placeholder="Search Item..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Machine Count</label>
                                    <input type="number" className="w-full h-10 border border-gray-300 rounded-lg px-3"
                                        value={newMachineCount} onChange={e => setNewMachineCount(Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Forecast Qty</label>
                                    <input type="number" className="w-full h-10 border border-gray-300 rounded-lg px-3"
                                        value={newForecast} onChange={e => setNewForecast(Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleAddEntry} className="w-full h-10 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium">Add Entry</button>
                                </div>
                            </div>

                            {/* 3. Data Table */}
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3">Location</th>
                                            <th className="px-4 py-3">Item</th>
                                            <th className="px-4 py-3 text-center">Machine Count</th>
                                            <th className="px-4 py-3 text-center">Forecast</th>
                                            <th className="px-4 py-3 text-center">Actual (Stock)</th>
                                            <th className="px-4 py-3">Notes</th>
                                            <th className="px-4 py-3 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredEntries.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-8 text-gray-400">No entries for this period/location.</td></tr>
                                        ) : (
                                            filteredEntries.map(entry => {
                                                const loc = locations.find(l => l.id === entry.locationId);
                                                const item = items.find(i => i.id === entry.itemId);
                                                return (
                                                    <tr key={entry.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium text-gray-800">{loc?.name || entry.locationId}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-gray-900">{item?.name}</div>
                                                            <div className="text-xs text-gray-500">{item?.id}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">{entry.machineCount}</td>
                                                        <td className="px-4 py-3 text-center font-bold text-teal-600">{entry.forecastQuantity}</td>
                                                        <td className="px-4 py-3 text-center text-gray-600">{entry.actualQuantity}</td>
                                                        <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{entry.notes}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button onClick={() => onDeleteEntry(entry.id)} className="text-red-400 hover:text-red-600">
                                                                <Trash className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'aggregation' && (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3">Location</th>
                                        <th className="px-4 py-3">Item Code</th>
                                        <th className="px-4 py-3">Item Name</th>
                                        <th className="px-4 py-3 text-right">Total Forecast</th>
                                        <th className="px-4 py-3 text-right">Total Stored (Actual)</th>
                                        <th className="px-4 py-3 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {aggregatedData.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">{row.locationName}</td>
                                            <td className="px-4 py-3 font-mono text-gray-500">{row.itemCode}</td>
                                            <td className="px-4 py-3 font-medium">{row.itemName}</td>
                                            <td className="px-4 py-3 text-right font-bold text-teal-700">{row.totalForecast}</td>
                                            <td className="px-4 py-3 text-right text-gray-700">{row.totalActual}</td>
                                            <td className={`px-4 py-3 text-right font-bold ${row.totalActual >= row.totalForecast ? 'text-green-600' : 'text-red-600'}`}>
                                                {row.totalActual - row.totalForecast}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'analysis' && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <BarChart2 className="h-16 w-16 mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-600">Variance Analysis</h3>
                            <p className="max-w-md text-center mt-2">
                                This module will provide detailed charts comparing Actual vs. Forecasted consumption over time.
                                Currently under development.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IssuePlanning;
