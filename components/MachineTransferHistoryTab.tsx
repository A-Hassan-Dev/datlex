import React, { useState, useMemo } from 'react';
import { MachineTransferHistoryEntry, Machine, Location } from '../types';

interface MachineTransferHistoryTabProps {
    history: MachineTransferHistoryEntry[];
    machines: Machine[];
    locations: Location[];
}

const MachineTransferHistoryTab: React.FC<MachineTransferHistoryTabProps> = ({
    history, machines, locations
}) => {
    const [selectedMachineId, setSelectedMachineId] = useState('');

    const filteredHistory = useMemo(() => {
        let list = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (selectedMachineId) {
            list = list.filter(h => h.machineId === selectedMachineId);
        }
        return list;
    }, [history, selectedMachineId]);

    const machineOptions = machines.map(m => ({ id: m.id, label: `${m.category} (${m.machineLocalNo})` }));

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between bg-gray-50 items-start sm:items-center gap-4">
                <h3 className="font-bold text-gray-700">Machine Transfer History (Immutable Log)</h3>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-500">Filter by Machine:</label>
                    <select
                        className="border rounded px-2 py-1 text-xs bg-white"
                        value={selectedMachineId}
                        onChange={e => setSelectedMachineId(e.target.value)}
                    >
                        <option value="">All Machines</option>
                        {machineOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <div className="relative border-l-2 border-amber-200 ml-4 pl-8 space-y-8">
                    {filteredHistory.map((h, idx) => {
                        const machine = machines.find(m => m.id === h.machineId);
                        const fromLoc = locations.find(l => l.id === h.fromLocationId);
                        const toLoc = locations.find(l => l.id === h.toLocationId);
                        return (
                            <div key={h.id} className="relative">
                                {/* Dot on timeline */}
                                <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm"></div>

                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-800">{machine?.category || h.machineId}</span>
                                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">{h.transferType}</span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono">{h.date}</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mt-2">
                                        <div>
                                            <p className="text-gray-400 mb-0.5">From</p>
                                            <p className="font-semibold text-gray-700">{fromLoc?.name || h.fromLocationId}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 mb-0.5">To Target</p>
                                            <p className="font-semibold text-gray-700">{toLoc?.name || h.toLocationId}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 mb-0.5">Requested By</p>
                                            <p className="font-semibold text-gray-700">{h.requestedBy}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 mb-0.5">Approved By</p>
                                            <p className="font-semibold text-gray-700">{h.approvedBy || '-'}</p>
                                        </div>
                                    </div>

                                    {h.notes && (
                                        <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-100 text-[11px] text-gray-600">
                                            <strong>Notes:</strong> {h.notes}
                                        </div>
                                    )}

                                    <div className="mt-2 text-[10px] text-gray-400 flex justify-between">
                                        <span>Ref: {h.referenceChangeId}</span>
                                        <span>Audit ID: {h.id}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredHistory.length === 0 && (
                        <div className="text-center py-20 text-gray-400">
                            No transfer history found for the selected machine.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MachineTransferHistoryTab;
