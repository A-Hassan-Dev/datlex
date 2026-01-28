import React, { useState } from 'react';
import { AssetTransfer, Machine, Location, User } from '../types';
import SearchableSelect from './SearchableSelect';

interface AssetTransferTabProps {
    transfers: AssetTransfer[];
    machines: Machine[];
    locations: Location[];
    currentUser: User;
    onAddTransfer: (t: AssetTransfer) => void;
    onUpdateTransfer: (t: AssetTransfer) => void;
}

const AssetTransferTab: React.FC<AssetTransferTabProps> = ({
    transfers, machines, locations, currentUser, onAddTransfer, onUpdateTransfer
}) => {
    const [showForm, setShowForm] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState<AssetTransfer | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [formData, setFormData] = useState<Partial<AssetTransfer>>({
        status: 'Draft',
        transferType: 'Internal',
        effectiveDate: new Date().toISOString().split('T')[0]
    });

    const canApprove = ['admin', 'maintenance_manager'].includes(currentUser.role);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newTransfer: AssetTransfer = {
            id: `TR-${Date.now()}`,
            machineId: formData.machineId!,
            currentLocationId: formData.currentLocationId!,
            targetLocationId: formData.targetLocationId!,
            transferType: formData.transferType as any,
            requestedBy: currentUser.username,
            reasonCode: formData.reasonCode || '',
            effectiveDate: formData.effectiveDate!,
            status: 'Draft',
            ...formData
        } as AssetTransfer;

        onAddTransfer(newTransfer);
        setShowForm(false);
        setFormData({ status: 'Draft', transferType: 'Internal', effectiveDate: new Date().toISOString().split('T')[0] });
    };

    const handleReject = () => {
        if (!showRejectModal || !rejectionReason) return;
        onUpdateTransfer({
            ...showRejectModal,
            status: 'Draft', // Send back to draft or a specific 'Rejected' status? Requirement says status: Draft → Submitted → Approved → Executed → Closed. 
            rejectionReason: rejectionReason
        });
        setShowRejectModal(null);
        setRejectionReason('');
    };

    const handleStatusChange = (transfer: AssetTransfer, newStatus: AssetTransfer['status']) => {
        if (newStatus === 'Approved') {
            if (!canApprove) {
                alert("Only Maintenance Manager or Admin can approve transfers.");
                return;
            }
            if (transfer.transferType === 'External maintenance' && currentUser.role !== 'maintenance_manager' && currentUser.role !== 'admin') {
                alert("External maintenance requires Maintenance Manager approval.");
                return;
            }
            onUpdateTransfer({
                ...transfer,
                status: 'Approved',
                approvedBy: currentUser.username,
                approvalTimestamp: new Date().toISOString()
            });
        } else if (newStatus === 'Executed') {
            if (transfer.status !== 'Approved') {
                alert("Cannot execute a transfer that is not approved.");
                return;
            }
            onUpdateTransfer({ ...transfer, status: 'Executed' });
        } else if (newStatus === 'Submitted') {
            onUpdateTransfer({ ...transfer, status: 'Submitted' });
        } else if (newStatus === 'Closed') {
            onUpdateTransfer({ ...transfer, status: 'Closed' });
        }
    };

    const machineOptions = machines.map(m => ({ id: m.id, label: `${m.category} (${m.machineLocalNo})`, subLabel: m.id }));
    const locationOptions = locations.map(l => ({ id: l.id, label: l.name }));

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex justify-between bg-gray-50 items-center">
                <h3 className="font-bold text-gray-700">Asset Transfers</h3>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow-sm">+ New Transfer</button>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-gray-100 text-gray-700 sticky top-0 border-b border-gray-200">
                        <tr>
                            <th className="p-2">ID</th>
                            <th className="p-2">Machine</th>
                            <th className="p-2">From</th>
                            <th className="p-2">To</th>
                            <th className="p-2">Type</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">Status</th>
                            <th className="p-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transfers.map(t => {
                            const machine = machines.find(m => m.id === t.machineId);
                            const fromLoc = locations.find(l => l.id === t.currentLocationId);
                            const toLoc = locations.find(l => l.id === t.targetLocationId);
                            return (
                                <tr key={t.id} className="hover:bg-emerald-50">
                                    <td className="p-2 font-mono text-gray-500">{t.id}</td>
                                    <td className="p-2 font-bold">{machine?.category || t.machineId}</td>
                                    <td className="p-2">{fromLoc?.name || t.currentLocationId}</td>
                                    <td className="p-2">{toLoc?.name || t.targetLocationId}</td>
                                    <td className="p-2">{t.transferType}</td>
                                    <td className="p-2">{t.effectiveDate}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'Draft' ? 'bg-gray-100 text-gray-600' :
                                            t.status === 'Submitted' ? 'bg-blue-100 text-blue-600' :
                                                t.status === 'Approved' ? 'bg-green-100 text-green-600' :
                                                    t.status === 'Executed' ? 'bg-emerald-100 text-emerald-600' :
                                                        'bg-gray-200 text-gray-700'
                                            }`}>{t.status}</span>
                                    </td>
                                    <td className="p-2 text-right space-x-2">
                                        {t.status === 'Draft' && <button onClick={() => handleStatusChange(t, 'Submitted')} className="text-blue-600 hover:underline">Submit</button>}
                                        {t.status === 'Submitted' && canApprove && (
                                            <>
                                                <button onClick={() => handleStatusChange(t, 'Approved')} className="text-green-600 hover:underline font-bold px-2">Approve</button>
                                                <button onClick={() => setShowRejectModal(t)} className="text-red-600 hover:underline px-2">Reject</button>
                                            </>
                                        )}
                                        {t.status === 'Approved' && (currentUser.role === 'admin' || currentUser.username === t.requestedBy) && <button onClick={() => handleStatusChange(t, 'Executed')} className="text-emerald-600 hover:underline font-bold">Execute</button>}
                                        {t.status === 'Executed' && <button onClick={() => handleStatusChange(t, 'Closed')} className="text-gray-500 hover:underline">Close</button>}
                                    </td>
                                </tr>
                            );
                        })}
                        {transfers.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-400">No transfers found.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* REJECT MODAL */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4">
                        <h4 className="font-bold text-gray-900 mb-2">Rejection Reason</h4>
                        <textarea
                            className="w-full border rounded p-2 text-sm mb-4"
                            rows={3}
                            placeholder="Enter reason for rejection..."
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowRejectModal(null)} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectionReason}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded font-bold disabled:opacity-50"
                            > Confirm Rejection</button>
                        </div>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">New Asset Transfer</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Transfer Type</label>
                                    <select
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={formData.transferType}
                                        onChange={e => setFormData({ ...formData, transferType: e.target.value as any })}
                                    >
                                        <option value="Internal">Internal (between sites)</option>
                                        <option value="External maintenance">External maintenance (supplier)</option>
                                    </select>
                                </div>

                                <SearchableSelect
                                    label="Machine / Serial No"
                                    options={machineOptions}
                                    value={formData.machineId || ''}
                                    onChange={val => {
                                        const m = machines.find(mac => mac.id === val);
                                        setFormData({ ...formData, machineId: val, currentLocationId: m?.locationId });
                                    }}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Current Location</label>
                                        <input type="text" className="w-full border rounded-lg p-2 text-sm bg-gray-50" value={locations.find(l => l.id === formData.currentLocationId)?.name || formData.currentLocationId || ''} readOnly />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Target Location</label>
                                        <select
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={formData.targetLocationId}
                                            onChange={e => setFormData({ ...formData, targetLocationId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Location</option>
                                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {formData.transferType === 'External maintenance' && (
                                    <div className="space-y-4 border-l-4 border-orange-400 pl-4 bg-orange-50/50 py-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Supplier Name *</label>
                                            <input type="text" className="w-full border rounded-lg p-2 text-sm" value={formData.supplierName || ''} onChange={e => setFormData({ ...formData, supplierName: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Expected Return Date *</label>
                                            <input type="date" className="w-full border rounded-lg p-2 text-sm" value={formData.expectedReturnDate || ''} onChange={e => setFormData({ ...formData, expectedReturnDate: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">Work Scope Notes</label>
                                            <textarea className="w-full border rounded-lg p-2 text-sm" value={formData.workScopeNotes || ''} onChange={e => setFormData({ ...formData, workScopeNotes: e.target.value })} rows={2} />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Reason Code / Notes</label>
                                    <input type="text" className="w-full border rounded-lg p-2 text-sm" value={formData.reasonCode || ''} onChange={e => setFormData({ ...formData, reasonCode: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Effective Date</label>
                                        <input type="date" className="w-full border rounded-lg p-2 text-sm" value={formData.effectiveDate || ''} onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">Requested By</label>
                                        <input type="text" className="w-full border rounded-lg p-2 text-sm bg-gray-50" value={currentUser.name} readOnly />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
                                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-md">Create Draft</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetTransferTab;
