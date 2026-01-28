import React, { useState } from 'react';
import { WarrantyRecord, WarrantyReceivingRecord, Machine, User } from '../types';
import SearchableSelect from './SearchableSelect';

interface WarrantyManagementTabProps {
    warrantyRecords: WarrantyRecord[];
    warrantyReceiving: WarrantyReceivingRecord[];
    machines: Machine[];
    currentUser: User;
    onAddWarranty: (w: WarrantyRecord) => void;
    onAddWarrantyReceiving: (r: WarrantyReceivingRecord) => void;
}

const WarrantyManagementTab: React.FC<WarrantyManagementTabProps> = ({
    warrantyRecords, warrantyReceiving, machines, currentUser, onAddWarranty, onAddWarrantyReceiving
}) => {
    const [showWarrantyForm, setShowWarrantyForm] = useState(false);
    const [showReceivingForm, setShowReceivingForm] = useState(false);
    const [selectedMachineId, setSelectedMachineId] = useState('');

    const [warrantyFormData, setWarrantyFormData] = useState<Partial<WarrantyRecord>>({
        warrantyStartDate: new Date().toISOString().split('T')[0],
        warrantyEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    });

    const [receivingFormData, setReceivingFormData] = useState<Partial<WarrantyReceivingRecord>>({
        receivedDate: new Date().toISOString().split('T')[0],
        condition: 'Good',
        operatingHours: 0
    });

    const calculateStatus = (endDate: string) => {
        const today = new Date();
        const end = new Date(endDate);
        return today <= end ? { label: 'Open Warranty', color: 'text-green-600 bg-green-50 border-green-200' } : { label: 'Warranty Done', color: 'text-red-600 bg-red-50 border-red-200' };
    };

    const handleAddWarrantySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddWarranty({
            id: `W-${Date.now()}`,
            machineId: warrantyFormData.machineId!,
            supplier: warrantyFormData.supplier!,
            warrantyStartDate: warrantyFormData.warrantyStartDate!,
            warrantyEndDate: warrantyFormData.warrantyEndDate!,
            warrantyType: warrantyFormData.warrantyType!,
            coverageNotes: warrantyFormData.coverageNotes
        });
        setShowWarrantyForm(false);
    };

    const handleAddReceivingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddWarrantyReceiving({
            id: `WR-${Date.now()}`,
            machineId: receivingFormData.machineId!,
            receivedDate: receivingFormData.receivedDate!,
            condition: receivingFormData.condition!,
            referenceTransferId: receivingFormData.referenceTransferId,
            operatingHours: Number(receivingFormData.operatingHours),
            firstRunDateAfterReceipt: receivingFormData.firstRunDateAfterReceipt!
        });
        setShowReceivingForm(false);
    };

    const machineOptions = machines.map(m => ({ id: m.id, label: `${m.category} (${m.machineLocalNo})` }));

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between bg-gray-50 items-start sm:items-center gap-4">
                <h3 className="font-bold text-gray-700">Warranty Management</h3>
                <div className="flex gap-2">
                    <button onClick={() => setShowReceivingForm(true)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-200 shadow-sm">Receiving Data</button>
                    <button onClick={() => setShowWarrantyForm(true)} className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition shadow-sm">+ New Warranty</button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Active Warranties */}
                <section>
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Machine Warranties</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {warrantyRecords.map(w => {
                            const machine = machines.find(m => m.id === w.machineId);
                            const status = calculateStatus(w.warrantyEndDate);
                            return (
                                <div key={w.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h5 className="font-bold text-gray-800">{machine?.category || w.machineId}</h5>
                                            <p className="text-[10px] text-gray-400">ID: {w.machineId}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black border uppercase ${status.color}`}>
                                            {status.label}
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between"><span className="text-gray-500">Supplier:</span><span className="font-semibold">{w.supplier}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Period:</span><span className="font-semibold text-gray-600">{w.warrantyStartDate} to {w.warrantyEndDate}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">Type:</span><span className="font-semibold text-purple-600">{w.warrantyType}</span></div>
                                    </div>
                                    {w.coverageNotes && (
                                        <div className="mt-3 pt-2 border-t border-gray-50 text-[11px] text-gray-500 italic">
                                            {w.coverageNotes}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {warrantyRecords.length === 0 && <div className="col-span-full py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center text-gray-400 text-sm">No warranty records yet.</div>}
                    </div>
                </section>

                {/* Receiving & Operation History */}
                <section>
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Receiving & Operation Data</h4>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                                <tr>
                                    <th className="p-3">Rec. Date</th>
                                    <th className="p-3">Machine</th>
                                    <th className="p-3">Condition</th>
                                    <th className="p-3">Op. Hours</th>
                                    <th className="p-3">First Run</th>
                                    <th className="p-3">Duration (Days)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {warrantyReceiving.map(r => {
                                    const machine = machines.find(m => m.id === r.machineId);
                                    const daysDiff = Math.floor((new Date().getTime() - new Date(r.firstRunDateAfterReceipt).getTime()) / (1000 * 3600 * 24));
                                    return (
                                        <tr key={r.id} className="hover:bg-indigo-50/30">
                                            <td className="p-3">{r.receivedDate}</td>
                                            <td className="p-3 font-bold">{machine?.category || r.machineId}</td>
                                            <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${r.condition === 'Good' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{r.condition}</span></td>
                                            <td className="p-3 font-mono">{r.operatingHours} h</td>
                                            <td className="p-3">{r.firstRunDateAfterReceipt}</td>
                                            <td className="p-3 text-indigo-600 font-bold">{daysDiff < 0 ? 0 : daysDiff} Days</td>
                                        </tr>
                                    );
                                })}
                                {warrantyReceiving.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No receiving data found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* WARRANTY FORM MODAL */}
            {showWarrantyForm && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">New Machine Warranty</h3>
                            <button onClick={() => setShowWarrantyForm(false)} className="text-gray-400 p-1 hover:bg-gray-100 rounded">✕</button>
                        </div>
                        <form onSubmit={handleAddWarrantySubmit} className="p-4 space-y-4 overflow-y-auto">
                            <SearchableSelect label="Machine ID" options={machineOptions} value={warrantyFormData.machineId || ''} onChange={val => setWarrantyFormData({ ...warrantyFormData, machineId: val })} />
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Supplier</label>
                                <input type="text" className="w-full border rounded-lg p-2 text-sm" value={warrantyFormData.supplier || ''} onChange={e => setWarrantyFormData({ ...warrantyFormData, supplier: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Start Date</label>
                                    <input type="date" className="w-full border rounded-lg p-2 text-sm" value={warrantyFormData.warrantyStartDate || ''} onChange={e => setWarrantyFormData({ ...warrantyFormData, warrantyStartDate: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">End Date</label>
                                    <input type="date" className="w-full border rounded-lg p-2 text-sm" value={warrantyFormData.warrantyEndDate || ''} onChange={e => setWarrantyFormData({ ...warrantyFormData, warrantyEndDate: e.target.value })} required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Warranty Type</label>
                                <select className="w-full border rounded-lg p-2 text-sm" value={warrantyFormData.warrantyType || ''} onChange={e => setWarrantyFormData({ ...warrantyFormData, warrantyType: e.target.value })} required>
                                    <option value="">Select Type</option>
                                    <option value="Manufacturer">Manufacturer</option>
                                    <option value="Extended">Extended</option>
                                    <option value="Service Contract">Service Contract</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Coverage Notes</label>
                                <textarea className="w-full border rounded-lg p-2 text-sm" value={warrantyFormData.coverageNotes || ''} onChange={e => setWarrantyFormData({ ...warrantyFormData, coverageNotes: e.target.value })} rows={3} placeholder="What does this warranty cover?" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                                <button type="button" onClick={() => setShowWarrantyForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-md">Save Warranty</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RECEIVING FORM MODAL */}
            {showReceivingForm && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Warranty Receiving & Operation</h3>
                            <button onClick={() => setShowReceivingForm(false)} className="text-gray-400 p-1 hover:bg-gray-100 rounded">✕</button>
                        </div>
                        <form onSubmit={handleAddReceivingSubmit} className="p-4 space-y-4 overflow-y-auto">
                            <SearchableSelect label="Machine received from warranty" options={machineOptions} value={receivingFormData.machineId || ''} onChange={val => setReceivingFormData({ ...receivingFormData, machineId: val })} />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Received Date</label>
                                    <input type="date" className="w-full border rounded-lg p-2 text-sm" value={receivingFormData.receivedDate || ''} onChange={e => setReceivingFormData({ ...receivingFormData, receivedDate: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Condition</label>
                                    <select className="w-full border rounded-lg p-2 text-sm" value={receivingFormData.condition || ''} onChange={e => setReceivingFormData({ ...receivingFormData, condition: e.target.value })} required>
                                        <option value="Good">Good / Ready</option>
                                        <option value="Fair">Fair / Needs Inspection</option>
                                        <option value="Poor">Poor / Recalibrate</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Operating Hours</label>
                                    <input type="number" className="w-full border rounded-lg p-2 text-sm" value={receivingFormData.operatingHours || 0} onChange={e => setReceivingFormData({ ...receivingFormData, operatingHours: Number(e.target.value) })} required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Reference Transfer ID</label>
                                    <input type="text" className="w-full border rounded-lg p-2 text-sm" value={receivingFormData.referenceTransferId || ''} onChange={e => setReceivingFormData({ ...receivingFormData, referenceTransferId: e.target.value })} placeholder="TR-..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">First Run Date After Receipt</label>
                                <input type="date" className="w-full border rounded-lg p-2 text-sm" value={receivingFormData.firstRunDateAfterReceipt || ''} onChange={e => setReceivingFormData({ ...receivingFormData, firstRunDateAfterReceipt: e.target.value })} required />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                                <button type="button" onClick={() => setShowReceivingForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md">Save Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarrantyManagementTab;
