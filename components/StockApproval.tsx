import React, { useState, useMemo } from 'react';
import { IssueRecord, Location, Item, Machine } from '../types';

interface StockApprovalProps {
    history: IssueRecord[];
    locations: Location[];
    items: Item[];
    machines: Machine[];
    onUpdateIssue: (updatedRecord: IssueRecord) => void;
}

const StockApproval: React.FC<StockApprovalProps> = ({ history, locations, items, machines, onUpdateIssue }) => {
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');
    const [editedRecords, setEditedRecords] = useState<Record<string, { quantity: number; notes: string }>>({});

    const itemsMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
    const machinesMap = useMemo(() => new Map(machines.map(m => [m.id, m])), [machines]);
    const locationsMap = useMemo(() => new Map(locations.map(l => [l.id, l.name])), [locations]);

    const pendingIssues = useMemo(() => {
        return history.filter(h => {
            const isPending = h.status === 'Pending';
            const matchesLocation = selectedLocationId ? h.locationId === selectedLocationId : true;
            return isPending && matchesLocation;
        });
    }, [history, selectedLocationId]);

    const getEditedValue = (id: string, field: 'quantity' | 'notes', originalValue: any) => {
        if (editedRecords[id] && editedRecords[id][field] !== undefined) {
            return editedRecords[id][field];
        }
        return originalValue;
    };

    const handleEdit = (id: string, field: 'quantity' | 'notes', value: any) => {
        setEditedRecords(prev => {
            const baseQuantity = prev[id]?.quantity ?? pendingIssues.find(p => p.id === id)?.quantity ?? 0;
            const baseNotes = prev[id]?.notes ?? pendingIssues.find(p => p.id === id)?.notes ?? '';

            return {
                ...prev,
                [id]: {
                    quantity: field === 'quantity' ? Number(value) : baseQuantity,
                    notes: field === 'notes' ? value : baseNotes
                }
            };
        });
    };

    const processAction = (record: IssueRecord, action: 'Approved' | 'Rejected') => {
        const edits = editedRecords[record.id];
        const finalQuantity = edits?.quantity ?? record.quantity;
        const finalNotes = edits?.notes ?? record.notes ?? '';

        if (finalQuantity <= 0 && action === 'Approved') {
            alert("Quantity must be greater than 0 to approve.");
            return;
        }

        const updated: IssueRecord = {
            ...record,
            quantity: finalQuantity,
            notes: finalNotes,
            status: action
        };

        onUpdateIssue(updated);

        const newEdits = { ...editedRecords };
        delete newEdits[record.id];
        setEditedRecords(newEdits);
    };

    const totalPendingCount = history.filter(h => h.status === 'Pending').length;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">

                {/* Header & Filter */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center mr-4">
                            <span className="mr-2 text-2xl">✅</span> Pending Approvals
                        </h2>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                            {totalPendingCount} Total Pending
                        </span>
                    </div>

                    <div className="w-full md:w-64">
                        <select
                            value={selectedLocationId}
                            onChange={(e) => setSelectedLocationId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-700"
                        >
                            <option value="">All Locations</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name} ({loc.id})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {pendingIssues.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <p className="text-lg">No pending requests found.</p>
                        {selectedLocationId ? (
                            <p className="text-sm">Try selecting "All Locations" or a different warehouse zone.</p>
                        ) : (
                            <p className="text-sm">All caught up! 🎉</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-auto max-h-[70vh] rounded-lg border border-gray-200">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-gray-50 text-sm uppercase text-gray-500 font-semibold tracking-wider">
                                    <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 whitespace-nowrap">Date / ID</th>
                                    <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 whitespace-nowrap">Location / Machine</th>
                                    <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 whitespace-nowrap">Item Details</th>
                                    <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 w-32 whitespace-nowrap">Qty Request</th>
                                    <th className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-4 w-48 whitespace-nowrap">Notes</th>
                                    <th className="sticky top-0 right-0 z-20 bg-gray-50 border-b border-l border-gray-200 p-4 text-center whitespace-nowrap shadow-sm">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingIssues.map(issue => {
                                    const currentQty = getEditedValue(issue.id, 'quantity', issue.quantity);
                                    const currentNotes = getEditedValue(issue.id, 'notes', issue.notes || '');

                                    const machine = machinesMap.get(issue.machineId);
                                    const item = itemsMap.get(issue.itemId);
                                    const locationName = locationsMap.get(issue.locationId) || issue.locationId;

                                    return (
                                        <tr key={issue.id} className="group hover:bg-blue-50 transition-colors">
                                            <td className="p-4 align-middle whitespace-nowrap border-b border-gray-50">
                                                <div className="text-gray-900 font-medium">{issue.id}</div>
                                                <div className="text-xs text-gray-500">{new Date(issue.timestamp).toLocaleDateString()}</div>
                                                <div className="text-xs text-gray-400">{new Date(issue.timestamp).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-4 align-middle whitespace-nowrap border-b border-gray-50">
                                                <div className="text-sm font-medium text-gray-800">{machine?.category || issue.machineName}</div>
                                                <div className="text-xs text-gray-500">{locationName}</div>
                                            </td>
                                            <td className="p-4 align-middle whitespace-nowrap border-b border-gray-50">
                                                <div className="text-sm font-medium text-blue-700">{item?.fullName || item?.name || issue.itemName}</div>
                                                <div className="text-xs text-gray-500 font-mono">{issue.itemId}</div>
                                            </td>
                                            <td className="p-4 align-middle whitespace-nowrap border-b border-gray-50">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={currentQty}
                                                    onChange={(e) => handleEdit(issue.id, 'quantity', e.target.value)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-right font-bold text-gray-700"
                                                />
                                                {currentQty < issue.quantity && (
                                                    <div className="text-xs text-orange-600 mt-1 font-medium">Reduced</div>
                                                )}
                                            </td>
                                            <td className="p-4 align-middle whitespace-nowrap border-b border-gray-50">
                                                <textarea
                                                    placeholder="Add notes..."
                                                    rows={2}
                                                    value={currentNotes}
                                                    onChange={(e) => handleEdit(issue.id, 'notes', e.target.value)}
                                                    className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                />
                                            </td>
                                            <td className="sticky right-0 z-10 p-4 align-middle text-center space-y-2 whitespace-nowrap border-b border-gray-50 border-l border-gray-100 shadow-sm bg-white group-hover:bg-blue-50">
                                                <button
                                                    onClick={() => processAction(issue, 'Approved')}
                                                    className="w-full px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 shadow-sm transition flex items-center justify-center gap-1"
                                                >
                                                    <span>✓</span> Approve
                                                </button>
                                                <button
                                                    onClick={() => processAction(issue, 'Rejected')}
                                                    className="w-full px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 border border-red-200 transition flex items-center justify-center gap-1"
                                                >
                                                    <span>✗</span> Reject
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockApproval;
