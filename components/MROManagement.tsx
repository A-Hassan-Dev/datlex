
import React, { useState, useMemo } from 'react';
import { Item, PurchaseOrder, Machine, Location } from '../types';
import SearchableSelect from './SearchableSelect';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

interface MROManagementProps {
    items: Item[];
    onUpdateItem: (item: Item) => void;
    purchaseOrders: PurchaseOrder[];
    onAddPO: (po: PurchaseOrder) => void;
    machines: Machine[];
    locations: Location[];
}

type TabType = 'master' | 'open-po' | 'analysis';

const ITEMS_PER_PAGE = 100;

const MROManagement: React.FC<MROManagementProps> = ({ items, onUpdateItem, purchaseOrders, onAddPO, machines, locations }) => {
    const [activeTab, setActiveTab] = useState<TabType>('master');

    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [newPO, setNewPO] = useState<Partial<PurchaseOrder>>({ status: 'Open' });

    const [filterLocation, setFilterLocation] = useState('');

    const mroItems = useMemo(() => {
        return items.filter(i =>
            i.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [items, searchTerm]);

    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const paginatedMroItems = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return mroItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [mroItems, currentPage]);

    const totalPages = Math.ceil(mroItems.length / ITEMS_PER_PAGE);

    const renderPaginationControl = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-between items-center p-3 border-t bg-gray-50 text-xs mt-auto shrink-0">
                <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 border rounded bg-white disabled:opacity-50 hover:bg-gray-100 transition"
                >
                    Previous
                </button>
                <span className="font-semibold text-gray-600">
                    Page {currentPage} of {totalPages} ({mroItems.length} items)
                </span>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 border rounded bg-white disabled:opacity-50 hover:bg-gray-100 transition"
                >
                    Next
                </button>
            </div>
        );
    };

    const analysisData = useMemo(() => {
        const report = items.map(item => {
            const inTransit = purchaseOrders
                .filter(po => po.itemId === item.id && po.status === 'Open')
                .reduce((sum, po) => sum + po.orderedQuantity, 0);

            const currentStock = item.stockQuantity || 0;
            const availableStock = currentStock + inTransit;

            const reorderPoint = item.reorderPoint || 0;
            const maxStock = item.maxStock || 0;

            let status = 'OK';
            let suggestedOrder = 0;

            if (reorderPoint > 0 && availableStock <= reorderPoint) {
                status = 'Reorder';
                suggestedOrder = maxStock > 0 ? (maxStock - availableStock) : (reorderPoint * 2 - availableStock); 
                if (suggestedOrder < 0) suggestedOrder = 0;
            } else if (maxStock > 0 && currentStock > maxStock) {
                status = 'Excess';
            }

            return {
                ...item,
                inTransit,
                availableStock,
                status,
                suggestedOrder
            };
        });

        return report;
    }, [items, purchaseOrders]);

    const reorderItems = analysisData.filter(i => i.status === 'Reorder');
    const excessItems = analysisData.filter(i => i.status === 'Excess');

    const calculateABC = () => {
        const sorted = [...items].map(i => ({
            ...i,
            usageValue: (i.annualUsage || 0) * (i.unitCost || 0)
        })).sort((a, b) => b.usageValue - a.usageValue);

        const totalValue = sorted.reduce((sum, i) => sum + i.usageValue, 0);
        let cumulative = 0;

        const updatedItems = sorted.map(item => {
            cumulative += item.usageValue;
            const percentage = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;
            let abcClass: 'A' | 'B' | 'C' = 'C';

            if (percentage <= 80) abcClass = 'A'; 
            else if (percentage <= 95) abcClass = 'B'; 
            else abcClass = 'C'; 

            return { ...item, abcClass };
        });

        updatedItems.forEach(u => {
            const original = items.find(i => i.id === u.id);
            if (original && original.abcClass !== u.abcClass) {
                onUpdateItem(u);
            }
        });
        alert("ABC Classification Recalculated based on Annual Usage Value.");
    };

    const handleSaveItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            onUpdateItem(editingItem);
            setEditingItem(null);
        }
    };

    const handleCreatePO = () => {
        if (!newPO.supplier || !newPO.itemId || !newPO.orderedQuantity) {
            alert("Fill required fields");
            return;
        }
        const po: PurchaseOrder = {
            id: `PO-${Date.now()}`,
            supplier: newPO.supplier,
            itemId: newPO.itemId,
            orderedQuantity: Number(newPO.orderedQuantity),
            expectedDeliveryDate: newPO.expectedDeliveryDate || new Date().toISOString().slice(0, 10),
            status: 'Open'
        };
        onAddPO(po);
        setNewPO({ status: 'Open' });
    };

    const exportReorderReport = () => {
        const data = reorderItems.map(i => ({
            'Item Code': i.id,
            'Description': i.name,
            'Supplier': i.preferredSupplier,
            'Current Stock': i.stockQuantity,
            'In Transit': i.inTransit,
            'Reorder Point': i.reorderPoint,
            'Max Stock': i.maxStock,
            'Suggested Qty': i.suggestedOrder
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Reorder Report");
        XLSX.writeFile(wb, "MRO_Reorder_Report.xlsx");
    };

    const renderMasterTab = () => (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <div className="relative w-64">
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute left-2.5 top-2.5 text-gray-400">🔍</span>
                </div>
                <div className="flex gap-2 text-sm text-gray-500 items-center">
                    <span>Displaying {paginatedMroItems.length} of {mroItems.length} items</span>
                    <button onClick={calculateABC} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-bold hover:bg-purple-200 text-sm ml-2">
                        🔄 Recalc ABC
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg bg-gray-50">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-100 text-gray-700 sticky top-0 shadow-sm z-10">
                        <tr>
                            <th className="p-3 border-b">Item Code</th>
                            <th className="p-3 border-b">Description</th>
                            <th className="p-3 border-b">Category</th>
                            <th className="p-3 text-center border-b">Min</th>
                            <th className="p-3 text-center border-b">Max</th>
                            <th className="p-3 text-center border-b">Reorder Pt</th>
                            <th className="p-3 text-center border-b">Stock</th>
                            <th className="p-3 text-center border-b">Pipeline</th>
                            <th className="p-3 text-center border-b">Annual Usage</th>
                            <th className="p-3 border-b">ABC</th>
                            <th className="p-3 border-b">Criticality</th>
                            <th className="p-3 text-right border-b">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {paginatedMroItems.map(item => {
                            const stats = analysisData.find(d => d.id === item.id) || { inTransit: 0 };

                            return (
                                <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="p-3 font-mono font-bold text-gray-600 border-r">{item.id}</td>
                                    <td className="p-3 border-r max-w-xs truncate" title={item.name}>{item.name}</td>
                                    <td className="p-3 text-gray-500 border-r">{item.category}</td>
                                    <td className="p-3 text-center text-xs border-r">{item.minStock || 0}</td>
                                    <td className="p-3 text-center text-xs border-r">{item.maxStock || 0}</td>
                                    <td className="p-3 text-center font-bold text-orange-600 border-r">{item.reorderPoint || '-'}</td>
                                    <td className="p-3 text-center font-bold border-r">{item.stockQuantity}</td>
                                    <td className="p-3 text-center text-blue-600 font-bold border-r">{stats.inTransit || 0}</td>
                                    <td className="p-3 text-center text-gray-500 border-r">{item.annualUsage || 0}</td>
                                    <td className="p-3 text-center border-r">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.abcClass === 'A' ? 'bg-green-100 text-green-800' : item.abcClass === 'B' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {item.abcClass || '-'}
                                        </span>
                                    </td>
                                    <td className="p-3 border-r">
                                        <span className={`px-2 py-1 rounded text-xs ${item.criticality === 'High' ? 'bg-red-100 text-red-800' : 'text-gray-600'}`}>
                                            {item.criticality || '-'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => setEditingItem(item)} className="text-blue-600 hover:underline text-xs font-bold">Edit</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {paginatedMroItems.length === 0 && (
                            <tr>
                                <td colSpan={12} className="p-8 text-center text-gray-400">No items found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {renderPaginationControl()}

            {
                editingItem && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg">Edit MRO Data: {editingItem.id}</h3>
                                <button onClick={() => setEditingItem(null)} className="text-gray-500 hover:text-gray-800">✕</button>
                            </div>
                            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto grid grid-cols-2 gap-4">
                                {/* Left Column */}
                                <div className="space-y-3">
                                    <div><label className="block text-xs font-bold text-gray-500">Description</label><input className="w-full border rounded p-2" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Category</label><input className="w-full border rounded p-2" value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })} /></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="block text-xs font-bold text-gray-500">Min Stock</label><input type="number" className="w-full border rounded p-2" value={editingItem.minStock || ''} onChange={e => setEditingItem({ ...editingItem, minStock: Number(e.target.value) })} /></div>
                                        <div><label className="block text-xs font-bold text-gray-500">Max Stock</label><input type="number" className="w-full border rounded p-2" value={editingItem.maxStock || ''} onChange={e => setEditingItem({ ...editingItem, maxStock: Number(e.target.value) })} /></div>
                                    </div>
                                    <div><label className="block text-xs font-bold text-gray-500">Reorder Point</label><input type="number" className="w-full border rounded p-2 bg-orange-50" value={editingItem.reorderPoint || ''} onChange={e => setEditingItem({ ...editingItem, reorderPoint: Number(e.target.value) })} /></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Preferred Supplier</label><input className="w-full border rounded p-2" value={editingItem.preferredSupplier || ''} onChange={e => setEditingItem({ ...editingItem, preferredSupplier: e.target.value })} /></div>
                                </div>
                                {/* Right Column */}
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500">Related Machine</label>
                                        <select className="w-full border rounded p-2" value={editingItem.relatedMachineId || ''} onChange={e => setEditingItem({ ...editingItem, relatedMachineId: e.target.value })}>
                                            <option value="">None</option>
                                            {machines.map(m => <option key={m.id} value={m.id}>{m.category} ({m.id})</option>)}
                                        </select>
                                    </div>
                                    <div><label className="block text-xs font-bold text-gray-500">Location / Aisle</label><input className="w-full border rounded p-2" value={editingItem.locationZone || ''} onChange={e => setEditingItem({ ...editingItem, locationZone: e.target.value })} /></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500">Criticality</label>
                                            <select className="w-full border rounded p-2" value={editingItem.criticality || 'Low'} onChange={e => setEditingItem({ ...editingItem, criticality: e.target.value as any })}>
                                                <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500">ABC Class</label>
                                            <select className="w-full border rounded p-2" value={editingItem.abcClass || 'C'} onChange={e => setEditingItem({ ...editingItem, abcClass: e.target.value as any })}>
                                                <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="block text-xs font-bold text-gray-500">Unit Cost ($)</label><input type="number" className="w-full border rounded p-2" value={editingItem.unitCost || ''} onChange={e => setEditingItem({ ...editingItem, unitCost: Number(e.target.value) })} /></div>
                                        <div><label className="block text-xs font-bold text-gray-500">Annual Usage</label><input type="number" className="w-full border rounded p-2" value={editingItem.annualUsage || ''} onChange={e => setEditingItem({ ...editingItem, annualUsage: Number(e.target.value) })} /></div>
                                    </div>
                                </div>
                                <div className="col-span-2 pt-4 border-t flex justify-end gap-2">
                                    <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 border rounded">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );

    const renderPOTab = () => (
        <div className="flex flex-col h-full gap-4">
            {/* Create PO Bar */}
            <div className="bg-gray-50 p-4 rounded-lg border flex flex-wrap gap-3 items-end">
                <div><label className="block text-xs font-bold text-gray-500">Supplier</label><input className="border rounded p-2 text-sm w-48" placeholder="Supplier Name" value={newPO.supplier || ''} onChange={e => setNewPO({ ...newPO, supplier: e.target.value })} /></div>
                <div className="flex-1 min-w-[200px]"><label className="block text-xs font-bold text-gray-500">Item</label><SearchableSelect label="" placeholder="Select Item..." options={items.map(i => ({ id: i.id, label: i.id, subLabel: i.name }))} value={newPO.itemId || ''} onChange={v => setNewPO({ ...newPO, itemId: v })} compact /></div>
                <div><label className="block text-xs font-bold text-gray-500">Qty</label><input type="number" className="border rounded p-2 text-sm w-24" value={newPO.orderedQuantity || ''} onChange={e => setNewPO({ ...newPO, orderedQuantity: Number(e.target.value) })} /></div>
                <div><label className="block text-xs font-bold text-gray-500">Expected Date</label><input type="date" className="border rounded p-2 text-sm" value={newPO.expectedDeliveryDate || ''} onChange={e => setNewPO({ ...newPO, expectedDeliveryDate: e.target.value })} /></div>
                <button onClick={handleCreatePO} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold h-[38px]">+ Create PO</button>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-700 sticky top-0 shadow-sm">
                        <tr>
                            <th className="p-3">PO Number</th>
                            <th className="p-3">Supplier</th>
                            <th className="p-3">Item</th>
                            <th className="p-3">Ordered Qty</th>
                            <th className="p-3">Expected Date</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {purchaseOrders.map(po => (
                            <tr key={po.id} className="hover:bg-gray-50">
                                <td className="p-3 font-mono">{po.id}</td>
                                <td className="p-3">{po.supplier}</td>
                                <td className="p-3 font-bold">{po.itemId}</td>
                                <td className="p-3">{po.orderedQuantity}</td>
                                <td className="p-3">{po.expectedDeliveryDate}</td>
                                <td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{po.status}</span></td>
                            </tr>
                        ))}
                        {purchaseOrders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No open Purchase Orders.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAnalysisTab = () => (
        <div className="flex flex-col h-full gap-4 overflow-y-auto">
            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 h-64">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h4 className="text-sm font-bold text-gray-600 mb-2">ABC Classification Summary</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'A (High Value)', value: analysisData.filter(i => i.abcClass === 'A').length },
                                    { name: 'B (Medium)', value: analysisData.filter(i => i.abcClass === 'B').length },
                                    { name: 'C (Low Value)', value: analysisData.filter(i => i.abcClass === 'C').length },
                                ]}
                                cx="50%" cy="50%" innerRadius={40} outerRadius={80} fill="#8884d8" dataKey="value" label
                            >
                                <Cell fill="#10B981" /> <Cell fill="#FBBF24" /> <Cell fill="#9CA3AF" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h4 className="text-sm font-bold text-gray-600 mb-2">Inventory Health</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { name: 'Reorder Needed', value: reorderItems.length },
                            { name: 'Healthy', value: analysisData.filter(i => i.status === 'OK').length },
                            { name: 'Excess Stock', value: excessItems.length },
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8884d8">
                                <Cell fill="#EF4444" /> <Cell fill="#10B981" /> <Cell fill="#F59E0B" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Reorder Table */}
            <div className="flex-1 bg-white border rounded-lg flex flex-col min-h-[300px]">
                <div className="p-3 bg-red-50 border-b border-red-100 flex justify-between items-center">
                    <h3 className="font-bold text-red-800 flex items-center gap-2">
                        <span>⚠️</span> Reorder Requirements ({reorderItems.length})
                    </h3>
                    <button onClick={exportReorderReport} className="px-3 py-1 bg-white border border-red-200 text-red-700 rounded text-xs font-bold hover:bg-red-50">
                        ⬇️ Export Report
                    </button>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-700 sticky top-0 shadow-sm">
                            <tr>
                                <th className="p-3">Item Code</th>
                                <th className="p-3">Description</th>
                                <th className="p-3 text-center">In Transit</th>
                                <th className="p-3 text-center">Total Available</th>
                                <th className="p-3 text-center text-red-600">Reorder Pt</th>
                                <th className="p-3 text-center text-gray-500">Max Stock</th>
                                <th className="p-3 text-center font-bold bg-green-50 text-green-800 border-l border-green-200">Suggested Order</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reorderItems.map(item => (
                                <tr key={item.id} className="hover:bg-red-50">
                                    <td className="p-3 font-mono font-bold">{item.id}</td>
                                    <td className="p-3">{item.name}</td>
                                    <td className="p-3 text-center">{item.inTransit}</td>
                                    <td className="p-3 text-center font-bold">{item.availableStock}</td>
                                    <td className="p-3 text-center text-red-600 font-bold">{item.reorderPoint}</td>
                                    <td className="p-3 text-center text-gray-500">{item.maxStock}</td>
                                    <td className="p-3 text-center font-extrabold text-green-700 bg-green-50 border-l border-green-200">
                                        {item.suggestedOrder}
                                    </td>
                                </tr>
                            ))}
                            {reorderItems.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-green-600 font-bold">All stock levels are healthy! No reorders needed.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-4 animate-fade-in-up font-cairo">
            {/* Header Tabs */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span>🛠️</span> MRO Management
                </h2>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('master')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'master' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Master Data</button>
                    <button onClick={() => setActiveTab('open-po')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'open-po' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Open PO / In Transit</button>
                    <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'analysis' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Analysis & Reorder</button>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden min-h-0">
                {activeTab === 'master' && renderMasterTab()}
                {activeTab === 'open-po' && renderPOTab()}
                {activeTab === 'analysis' && renderAnalysisTab()}
            </div>
        </div>
    );
};

export default MROManagement;
