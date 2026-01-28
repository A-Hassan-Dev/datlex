import React from 'react';
import { IssueRecord } from '../types';

interface PrintLayoutProps {
    batch: IssueRecord[];
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ batch }) => {
    if (!batch || batch.length === 0) return null;
    const first = batch[0];
    const isMulti = batch.some(b => b.machineId !== first.machineId);

    return (
        <div className="hidden print:block fixed inset-0 bg-white z-[100] p-10 h-screen w-screen overflow-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                        D
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-widest text-blue-900">Daltex Maintenance</h1>
                        <p className="text-sm text-gray-600 font-semibold">Reliability & Engineering Excellence</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-800">MATERIAL ISSUE REQUEST</h2>
                    <p className="text-xs text-gray-500">Form: MR-DALTEX-2026</p>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8 text-sm md:text-base">
                <div className="space-y-1">
                    <p><span className="font-bold w-32 inline-block">Request ID:</span> {first.id}</p>
                    <p><span className="font-bold w-32 inline-block">Date:</span> {new Date(first.timestamp).toLocaleString()}</p>
                    <p><span className="font-bold w-32 inline-block">Location Name:</span> {first.locationName || first.locationId}</p>
                    <p><span className="font-bold w-32 inline-block">Sector:</span> {first.sectorName || '-'}</p>
                    <p><span className="font-bold w-32 inline-block">Division:</span> {first.divisionName || '-'}</p>
                </div>
                <div className="space-y-1">
                    {!isMulti && (
                        <>
                            <p><span className="font-bold w-32 inline-block">Asset ID:</span> {first.machineId}</p>
                            <p><span className="font-bold w-32 inline-block">Category:</span> {first.machineName}</p>
                            <p><span className="font-bold w-32 inline-block">Machine Local No:</span> {first.machineLocalNo || '-'}</p>
                        </>
                    )}
                    {isMulti && <p><span className="font-bold w-32 inline-block">Mode:</span> Multi-Machine Request</p>}
                    <p><span className="font-bold w-32 inline-block">Maintenance Type:</span> {first.maintenancePlan || 'None'}</p>
                    <p><span className="font-bold w-32 inline-block">Requester:</span> {first.requesterName || first.requesterEmail || 'Unknown'}</p>
                </div>
            </div>

            {/* Table */}
            <table className="w-full text-left border-collapse border border-black mb-12 text-sm">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2">Item Code</th>
                        <th className="border border-black p-2">Description</th>
                        <th className="border border-black p-2 text-center">Unit</th>
                        {isMulti && <th className="border border-black p-2">Machine Local No</th>}
                        <th className="border border-black p-2 text-right">Qty</th>
                        <th className="border border-black p-2 text-right">Cost (Est)</th>
                    </tr>
                </thead>
                <tbody>
                    {batch.map(item => (
                        <tr key={item.id}>
                            <td className="border border-black p-2 font-mono">{item.itemId}</td>
                            <td className="border border-black p-2">{item.itemName}</td>
                            <td className="border border-black p-2 text-center">{item.unit || 'pcs'}</td>
                            {isMulti && <td className="border border-black p-2">{item.machineLocalNo || item.machineName}</td>}
                            <td className="border border-black p-2 text-right font-bold">{item.quantity}</td>
                            <td className="border border-black p-2 text-right">
                                {item.calculatedTotalCost ? `$${item.calculatedTotalCost.toLocaleString()}` : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={isMulti ? 4 : 3} className="border border-black p-2 text-right font-bold">Total Items:</td>
                        <td className="border border-black p-2 text-right font-bold">{batch.reduce((sum, i) => sum + i.quantity, 0)}</td>
                        <td className="border border-black p-2 text-right font-bold">
                            ${batch.reduce((sum, i) => sum + (i.calculatedTotalCost || 0), 0).toLocaleString()}
                        </td>
                    </tr>
                </tfoot>
            </table>

            {/* Footer Signatures */}
            <div className="grid grid-cols-2 gap-16 mt-16 pt-8 break-inside-avoid">
                <div className="space-y-12">
                    <div className="border-t border-black pt-2 text-sm font-bold flex flex-col gap-1">
                        <span>Requester Name: {first.requesterName || first.requesterEmail}</span>
                        <span className="text-xs text-gray-400 mt-8">(Signature)</span>
                    </div>
                    <div className="border-t border-black pt-2 text-sm font-bold flex flex-col gap-1">
                        <span>Sector & Division Manager</span>
                        <span className="text-xs text-gray-400 mt-8">(Signature)</span>
                    </div>
                </div>
                <div className="space-y-12">
                    <div className="border-t border-black pt-2 text-sm font-bold flex flex-col gap-1">
                        <span>Maintenance Manager Approval</span>
                        <span className="text-xs text-gray-400 mt-8">(Signature)</span>
                    </div>
                    <div className="border-t border-black pt-2 text-sm font-bold flex flex-col gap-1">
                        <span>Warehouse Issuer</span>
                        <span className="text-xs text-gray-400 mt-8">(Signature)</span>
                    </div>
                </div>
            </div>


            <div className="text-center text-xs mt-12 text-gray-400 print:fixed print:bottom-4 print:w-full">
                Generated by Daltex Maintenance System | {new Date().toISOString()}
            </div>
        </div>
    );
};

export default PrintLayout;
