import React, { useState, useEffect } from 'react';
import { AgriOrderRecord, IrrigationLogRecord, Location, Machine } from '../types';
import * as XLSX from 'xlsx';
import { backupTabToSheet, DEFAULT_SCRIPT_URL } from '../services/googleSheetsService';

interface AgriWorkOrderProps {
  orders: AgriOrderRecord[];
  onAddOrder: (order: AgriOrderRecord) => void;
  onUpdateOrder: (order: AgriOrderRecord) => void;
  onDeleteOrders: (ids: string[]) => void;
  
  irrigationLogs: IrrigationLogRecord[];
  onAddIrrigationLog: (log: IrrigationLogRecord) => void;
  onUpdateIrrigationLog: (log: IrrigationLogRecord) => void;
  onDeleteIrrigationLogs: (ids: string[]) => void;

  locations: Location[];
  machines: Machine[];
}

const AgriWorkOrder: React.FC<AgriWorkOrderProps> = ({ 
  orders, onAddOrder, onUpdateOrder, onDeleteOrders, 
  irrigationLogs, onAddIrrigationLog, onUpdateIrrigationLog, onDeleteIrrigationLogs,
  locations, machines 
}) => {
  const [activeTab, setActiveTab] = useState<'agri' | 'irrigation'>('agri');
  const [syncLoading, setSyncLoading] = useState(false);

  const [agriFormData, setAgriFormData] = useState<Partial<AgriOrderRecord>>({
    date: new Date().toISOString().slice(0, 10),
    unitType: 'يومية',
    timeSpent: 1,
    startCounter: 0,
    endCounter: 0,
    achievement: 1,
    actualOrReturn: 0,
    calculated: 0,
    pivot: '',
    branch: '',
    tractor: '',
    machineLocalNo: '1',
    attached: '',
    attachedLocalNo: '1',
    driver: '',
    department: 'الادارة',
    notes: ''
  });
  const [selectedAgriId, setSelectedAgriId] = useState<string | null>(null);

  const [irrigationFormData, setIrrigationFormData] = useState<Partial<IrrigationLogRecord>>({
    date: new Date().toISOString().slice(0, 10),
    locationName: '',
    generatorModel: '',
    engineStart: 0,
    engineEnd: 0,
    totalHours: 0,
    notes: ''
  });
  const [selectedIrrigationId, setSelectedIrrigationId] = useState<string | null>(null);

  const attachedOptions = ["مقطورة_سطحة", "معدة ذاتية_باليومية", "مقطورة حصاد", "اوتومايزر_بدلة", "ماكينة فوج", "مقطورة كسح"];
  const driverOptions = ["درويش شحاته شحاته درويش", "عادل طلبه السيد الشرقاوي", "محمد فرجاني عبدالقادر فرجاني", "عبدالرازق محمد عبد السلام حسين", "سائق أهالي", "بدون_سائق"];
  const unitTypes = ["يومية", "فدان", "ساعة"];
  const pivotOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  
  useEffect(() => {
     const calc = (agriFormData.endCounter || 0) - (agriFormData.startCounter || 0);
     if (calc > 0 && agriFormData.startCounter && agriFormData.endCounter) {
         setAgriFormData(prev => ({ ...prev, calculated: calc }));
     }
  }, [agriFormData.startCounter, agriFormData.endCounter]);

  useEffect(() => {
    const total = (irrigationFormData.engineEnd || 0) - (irrigationFormData.engineStart || 0);
    if (total > 0 && irrigationFormData.engineStart && irrigationFormData.engineEnd) {
        setIrrigationFormData(prev => ({ ...prev, totalHours: parseFloat(total.toFixed(2)) }));
    }
  }, [irrigationFormData.engineStart, irrigationFormData.engineEnd]);

  const handleAgriChange = (field: keyof AgriOrderRecord, value: any) => {
    setAgriFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateAgri = () => {
      if (!agriFormData.branch || !agriFormData.tractor) {
          alert("Please fill required fields (Branch, Tractor)");
          return;
      }
      const newId = orders.length > 0 ? String(Math.max(...orders.map(o => Number(o.id))) + 1) : "1250";
      const newRecord: AgriOrderRecord = {
          id: newId,
          date: agriFormData.date || new Date().toISOString().slice(0, 10),
          branch: agriFormData.branch || "",
          tractor: agriFormData.tractor || "",
          machineLocalNo: agriFormData.machineLocalNo || "",
          attached: agriFormData.attached || "",
          attachedLocalNo: agriFormData.attachedLocalNo || "",
          department: agriFormData.department || "",
          pivot: agriFormData.pivot || "",
          driver: agriFormData.driver || "",
          startCounter: Number(agriFormData.startCounter) || 0,
          endCounter: Number(agriFormData.endCounter) || 0,
          rowNumber: agriFormData.rowNumber || "",
          unitType: agriFormData.unitType || "يومية",
          achievement: Number(agriFormData.achievement) || 0,
          actualOrReturn: Number(agriFormData.actualOrReturn) || 0,
          calculated: Number(agriFormData.calculated) || 0,
          timeSpent: Number(agriFormData.timeSpent) || 0,
          notes: agriFormData.notes || "",
          sector: "قطاع شمال", 
          services: "532"
      };
      onAddOrder(newRecord);
      handleResetAgri();
  };

  const handleUpdateAgri = () => {
      if (!selectedAgriId) {
          alert("No record selected for update.");
          return;
      }
      const updatedRecord: AgriOrderRecord = {
          ...agriFormData as AgriOrderRecord,
          id: selectedAgriId
      };
      onUpdateOrder(updatedRecord);
      alert("Agri Record Updated");
      handleResetAgri();
  };

  const handleResetAgri = () => {
      setAgriFormData({
        date: new Date().toISOString().slice(0, 10),
        unitType: 'يومية',
        timeSpent: 1,
        startCounter: 0,
        endCounter: 0,
        achievement: 1,
        actualOrReturn: 0,
        calculated: 0,
        department: 'الادارة',
        machineLocalNo: '1',
        attachedLocalNo: '1',
        pivot: '',
        branch: '',
        tractor: '',
        attached: '',
        driver: '',
        rowNumber: '',
        notes: ''
      });
      setSelectedAgriId(null);
  };

  const handleDeleteAgri = () => {
      if (selectedAgriId) {
          if (confirm("Delete this record?")) {
              onDeleteOrders([selectedAgriId]);
              handleResetAgri();
          }
      } else {
          alert("Select a record first.");
      }
  };

  const handleIrrigationChange = (field: keyof IrrigationLogRecord, value: any) => {
    setIrrigationFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateIrrigation = () => {
      if (!irrigationFormData.locationName || !irrigationFormData.generatorModel) {
          alert("Please fill required fields (Location, Generator)");
          return;
      }
      const newId = irrigationLogs.length > 0 ? String(Math.max(...irrigationLogs.map(l => Number(l.id))) + 1) : "5000";
      const newRecord: IrrigationLogRecord = {
          id: newId,
          date: irrigationFormData.date || new Date().toISOString().slice(0, 10),
          locationName: irrigationFormData.locationName || "",
          generatorModel: irrigationFormData.generatorModel || "",
          engineStart: Number(irrigationFormData.engineStart) || 0,
          engineEnd: Number(irrigationFormData.engineEnd) || 0,
          totalHours: Number(irrigationFormData.totalHours) || 0,
          notes: irrigationFormData.notes || ""
      };
      onAddIrrigationLog(newRecord);
      handleResetIrrigation();
  };

  const handleUpdateIrrigation = () => {
      if (!selectedIrrigationId) {
          alert("No record selected for update.");
          return;
      }
      const updatedRecord: IrrigationLogRecord = {
          ...irrigationFormData as IrrigationLogRecord,
          id: selectedIrrigationId
      };
      onUpdateIrrigationLog(updatedRecord);
      alert("Irrigation Record Updated");
      handleResetIrrigation();
  };

  const handleResetIrrigation = () => {
      setIrrigationFormData({
        date: new Date().toISOString().slice(0, 10),
        locationName: '',
        generatorModel: '',
        engineStart: 0,
        engineEnd: 0,
        totalHours: 0,
        notes: ''
      });
      setSelectedIrrigationId(null);
  };

  const handleDeleteIrrigation = () => {
      if (selectedIrrigationId) {
          if (confirm("Delete this record?")) {
              onDeleteIrrigationLogs([selectedIrrigationId]);
              handleResetIrrigation();
          }
      } else {
          alert("Select a record first.");
      }
  };


  const handleExcelExport = () => {
    const wb = XLSX.utils.book_new();
    
    if (activeTab === 'agri') {
        const ws = XLSX.utils.json_to_sheet(orders);
        XLSX.utils.book_append_sheet(wb, ws, "AgriOrders");
        XLSX.writeFile(wb, "AgriWorkOrders.xlsx");
    } else {
        const ws = XLSX.utils.json_to_sheet(irrigationLogs);
        XLSX.utils.book_append_sheet(wb, ws, "IrrigationLogs");
        XLSX.writeFile(wb, "IrrigationLogs.xlsx");
    }
  };

  const handleBackup = async () => {
    const scriptUrl = localStorage.getItem('wf_script_url_v3') || DEFAULT_SCRIPT_URL;
    if (!scriptUrl) {
        alert("Please configure Web App URL in Settings first.");
        return;
    }

    if (!confirm("Back up Agri Orders & Irrigation Logs to Google Sheet? This will overwrite the tabs in the sheet.")) return;

    setSyncLoading(true);
    try {
        if (orders.length > 0) {
            const agriHeaders = ["ID", "Date", "Branch", "Tractor", "Local No", "Attached", "Attached Local", "Pivot", "Driver", "Start", "End", "Row", "Unit", "Achievement", "Actual/Return", "Calculated", "Time", "Notes"];
            const agriKeys = ["id", "date", "branch", "tractor", "machineLocalNo", "attached", "attachedLocalNo", "pivot", "driver", "startCounter", "endCounter", "rowNumber", "unitType", "achievement", "actualOrReturn", "calculated", "timeSpent", "notes"];
            const agriRows = orders.map(o => agriKeys.map(k => (o as any)[k] || ""));
            await backupTabToSheet(scriptUrl, 'agri_orders', [agriHeaders, ...agriRows]);
        }

        if (irrigationLogs.length > 0) {
            const irrHeaders = ["ID", "Date", "Location", "Generator", "Start", "End", "Total Hours", "Notes"];
            const irrKeys = ["id", "date", "locationName", "generatorModel", "engineStart", "engineEnd", "totalHours", "notes"];
            const irrRows = irrigationLogs.map(l => irrKeys.map(k => (l as any)[k] || ""));
            await backupTabToSheet(scriptUrl, 'irrigation_logs', [irrHeaders, ...irrRows]);
        }

        alert("Backup Successful!");
    } catch (e) {
        console.error(e);
        alert("Backup Failed. Check console.");
    } finally {
        setSyncLoading(false);
    }
  };

  const labelStyle = "bg-[#00695c] text-white font-bold text-sm flex items-center justify-center px-1 h-8 whitespace-nowrap min-w-[110px] border border-[#004d40] rounded-sm shadow-sm";
  const inputStyle = "border border-gray-400 px-2 h-8 text-right font-bold w-full text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded-sm";
  const rowStyle = "flex items-center gap-2 mb-2";

  return (
    <div className="p-4 bg-gray-100 min-h-screen font-sans">
        
        {/* TAB NAVIGATION */}
        <div className="flex gap-2 mb-6 border-b border-gray-300 pb-2">
            <button 
                onClick={() => setActiveTab('agri')}
                className={`px-6 py-2 rounded-t-lg font-bold text-sm transition-all ${activeTab === 'agri' ? 'bg-[#00695c] text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
                Agri Work Order
            </button>
            <button 
                onClick={() => setActiveTab('irrigation')}
                className={`px-6 py-2 rounded-t-lg font-bold text-sm transition-all ${activeTab === 'irrigation' ? 'bg-[#00695c] text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
                Irrigation Run Times
            </button>
        </div>

        {/* AGRI TAB CONTENT */}
        {activeTab === 'agri' && (
            <div className="animate-fade-in-up" dir="rtl">
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                   <div className="w-full lg:w-48 flex flex-col gap-3 pt-6 lg:pt-8">
                       <div className="flex items-center gap-1">
                           <input type="number" className={inputStyle} value={agriFormData.endCounter} onChange={e => handleAgriChange('endCounter', e.target.value)} />
                           <div className={labelStyle}>نهاية العداد</div>
                       </div>
                       <div className="flex items-center gap-1">
                           <input type="number" className={inputStyle} value={agriFormData.startCounter} onChange={e => handleAgriChange('startCounter', e.target.value)} />
                           <div className={labelStyle}>بداية العداد</div>
                       </div>
                       <div className="flex items-center gap-1">
                           <input type="text" className={inputStyle} value={agriFormData.rowNumber || ''} onChange={e => handleAgriChange('rowNumber', e.target.value)} />
                           <div className={labelStyle}>رقم الصف</div>
                       </div>
                       <div className="flex items-center gap-1">
                           <input type="number" className={`${inputStyle} bg-pink-200 border-pink-300`} />
                           <div className={labelStyle}>عدد النسخ</div>
                       </div>
                   </div>

                   <div className="flex-1 w-full bg-gray-50 p-2 rounded border border-gray-300 relative mt-4 lg:mt-0">
                       <span className="absolute -top-3 left-3 bg-gray-100 px-2 text-sm font-bold text-gray-700 border border-gray-300 rounded">Enter Details</span>
                       
                       <div className="flex flex-col lg:flex-row gap-4 pt-3">
                           <div className="flex-1">
                               <div className={rowStyle}>
                                    <div className={`${inputStyle} bg-white flex items-center justify-center`}>{agriFormData.date}</div>
                                    <div className={labelStyle}>التاريخ</div>
                               </div>
                               <div className={rowStyle}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm text-gray-600">ساعة</span>
                                        <input className={`${inputStyle} w-20`} value={agriFormData.timeSpent} onChange={e => handleAgriChange('timeSpent', e.target.value)} />
                                    </div>
                                    <div className="flex-1 flex justify-end gap-1">
                                         <select className={`${inputStyle} w-24`} value={agriFormData.machineLocalNo} onChange={e => handleAgriChange('machineLocalNo', e.target.value)}>
                                             {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                                         </select>
                                         <div className={labelStyle}>محلي رقم</div>
                                    </div>
                               </div>
                               <div className={rowStyle}>
                                    <div className="flex-1 flex justify-end gap-1">
                                         <select className={`${inputStyle} w-24`} value={agriFormData.attachedLocalNo} onChange={e => handleAgriChange('attachedLocalNo', e.target.value)}>
                                             {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                                         </select>
                                         <div className={labelStyle}>محلي رقم</div>
                                    </div>
                               </div>
                               <div className={rowStyle}>
                                    <div className="flex-1 flex gap-1">
                                         <select className={`${inputStyle} bg-yellow-50 w-24 text-center`} value={agriFormData.unitType} onChange={e => handleAgriChange('unitType', e.target.value)}>
                                             {unitTypes.map(u => <option key={u} value={u}>{u}</option>)}
                                         </select>
                                         <input className={inputStyle} value={agriFormData.achievement} onChange={e => handleAgriChange('achievement', e.target.value)} />
                                         <div className={labelStyle}>الإنجاز الحسابي</div>
                                    </div>
                               </div>
                               <div className={rowStyle}>
                                    <div className="flex-1 flex gap-1">
                                         <input className={`${inputStyle} bg-yellow-50 w-24`} disabled value={0} />
                                         <input className={inputStyle} value={agriFormData.actualOrReturn} onChange={e => handleAgriChange('actualOrReturn', e.target.value)} />
                                         <div className={labelStyle}>الإعادة أو الفعلي</div>
                                    </div>
                               </div>
                           </div>

                           <div className="flex-1">
                               <div className={rowStyle}>
                                   <select className={inputStyle} value={agriFormData.branch} onChange={e => handleAgriChange('branch', e.target.value)}>
                                       <option value="">اختر الفرع...</option>
                                       {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                                   </select>
                                   <div className={labelStyle}>اسم الفرع</div>
                               </div>
                               <div className={rowStyle}>
                                   <select className={inputStyle} value={agriFormData.tractor} onChange={e => handleAgriChange('tractor', e.target.value)}>
                                       <option value="">اختر موديل الجرار...</option>
                                       {machines.filter(m => m.category?.includes('جرار') || true).map(m => (
                                           <option key={m.id} value={m.category || m.id}>{m.category || m.id}</option>
                                       ))}
                                   </select>
                                   <div className={labelStyle}>موديل الجرار</div>
                               </div>
                               <div className={rowStyle}>
                                   <select className={inputStyle} value={agriFormData.attached} onChange={e => handleAgriChange('attached', e.target.value)}>
                                       <option value="">المعدة الملحقة...</option>
                                       {attachedOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                   </select>
                                   <div className={labelStyle}>المعدة الملحقة</div>
                               </div>
                               <div className={rowStyle}>
                                   <select className={inputStyle} value={agriFormData.pivot} onChange={e => handleAgriChange('pivot', e.target.value)}>
                                       <option value="">رقم البيفوت...</option>
                                       {pivotOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                   </select>
                                   <div className={labelStyle}>رقم البيفوت</div>
                               </div>
                               <div className={rowStyle}>
                                   <select className={inputStyle} value={agriFormData.driver} onChange={e => handleAgriChange('driver', e.target.value)}>
                                       <option value="">اختر السائق...</option>
                                       {driverOptions.map(d => <option key={d} value={d}>{d}</option>)}
                                   </select>
                                   <div className={labelStyle}>اسم السائق</div>
                               </div>
                           </div>
                       </div>

                       <div className="flex gap-1 mt-2">
                            <input className={`${inputStyle} border-purple-300`} placeholder="الملاحظات" value={agriFormData.notes} onChange={e => handleAgriChange('notes', e.target.value)} />
                            <div className={labelStyle}>الملاحظات</div>
                       </div>
                   </div>

                   <div className="w-full lg:w-48 bg-white p-2 border border-gray-300 rounded shadow-sm">
                        <div className="text-center font-bold text-gray-600 mb-2 border-b pb-1">Data Out</div>
                        <div className="space-y-2 text-sm">
                             <div className="flex justify-between border-b border-gray-100 pb-1">
                                 <span className="text-gray-500">الخدمات</span>
                                 <span className="font-bold">{agriFormData.services || '532'}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-100 pb-1">
                                 <span className="text-gray-500">الادارة</span>
                                 <span className="font-bold">{agriFormData.department}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-100 pb-1">
                                 <span className="text-gray-500">القطاع</span>
                                 <span className="font-bold">{agriFormData.sector || 'قطاع شمال'}</span>
                             </div>
                        </div>
                   </div>
                </div>

                <div className="flex justify-center gap-4 mt-6 py-4 border-t border-b bg-white rounded shadow-sm">
                    <button onClick={handleCreateAgri} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </div>
                        <span className="text-sm font-bold">إضافة</span>
                    </button>
                    <button onClick={handleResetAgri} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </div>
                        <span className="text-sm font-bold">استرجاع</span>
                    </button>
                    <button onClick={handleUpdateAgri} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </div>
                        <span className="text-sm font-bold">تعديل</span>
                    </button>
                    <button onClick={handleDeleteAgri} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <span className="text-sm font-bold">حذف</span>
                    </button>
                    <button onClick={handleExcelExport} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <span className="text-sm font-bold">اكسل</span>
                    </button>
                    <button onClick={handleBackup} disabled={syncLoading} className="flex flex-col items-center text-indigo-700 hover:text-indigo-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-indigo-600 flex items-center justify-center mb-1 group-hover:bg-indigo-50">
                            {syncLoading ? <span className="animate-spin text-sm">↻</span> : <span className="text-lg">☁️</span>}
                        </div>
                        <span className="text-sm font-bold">نسخ احتياطي</span>
                    </button>
                </div>

                <div className="bg-white border border-gray-300 rounded relative shadow-sm mt-4 overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 border-b font-bold text-gray-700 flex justify-between items-center">
                        <span>Database</span>
                        <span className="text-xs text-gray-400 font-normal">{orders.length} Records</span>
                    </div>
                    <div className="overflow-x-auto h-64">
                        <table className="w-full text-right text-sm border-collapse">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    {["م", "التاريخ", "الفرع", "موديل الجرار", "محلي", "المعدة الملحقة", "محلي2", "البيفوت", "اسم السائق", "حسابي", "الاعادة", "الانجاز", "الوحدة", "الزمن"].map(h => (
                                        <th key={h} className="border p-2 font-bold whitespace-nowrap text-gray-700">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr><td colSpan={14} className="text-center p-4 text-gray-400">No records found</td></tr>
                                ) : (
                                    orders.map(o => (
                                        <tr 
                                            key={o.id} 
                                            onClick={() => { setAgriFormData(o); setSelectedAgriId(o.id); }}
                                            className={`cursor-pointer hover:bg-yellow-50 transition-colors ${selectedAgriId === o.id ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}
                                        >
                                            <td className="border p-1">{o.id}</td>
                                            <td className="border p-1">{o.date}</td>
                                            <td className="border p-1">{o.branch}</td>
                                            <td className="border p-1">{o.tractor}</td>
                                            <td className="border p-1">{o.machineLocalNo}</td>
                                            <td className="border p-1">{o.attached}</td>
                                            <td className="border p-1">{o.attachedLocalNo}</td>
                                            <td className="border p-1">{o.pivot}</td>
                                            <td className="border p-1">{o.driver}</td>
                                            <td className="border p-1">{o.calculated}</td>
                                            <td className="border p-1">{o.actualOrReturn}</td>
                                            <td className="border p-1">{o.achievement}</td>
                                            <td className="border p-1">{o.unitType}</td>
                                            <td className="border p-1">{o.timeSpent}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* IRRIGATION TAB CONTENT */}
        {activeTab === 'irrigation' && (
            <div className="animate-fade-in-up" dir="rtl">
                <div className="bg-gray-50 p-6 rounded border border-gray-300 relative mt-4">
                    <span className="absolute -top-3 left-3 bg-gray-100 px-2 text-sm font-bold text-gray-700 border border-gray-300 rounded">Run Times Log</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                        {/* Column 1 */}
                        <div className="space-y-3">
                            <div className={rowStyle}>
                                <input type="date" className={inputStyle} value={irrigationFormData.date} onChange={e => handleIrrigationChange('date', e.target.value)} />
                                <div className={labelStyle}>التاريخ</div>
                            </div>
                            <div className={rowStyle}>
                                <select className={inputStyle} value={irrigationFormData.locationName} onChange={e => handleIrrigationChange('locationName', e.target.value)}>
                                    <option value="">اختر الموقع...</option>
                                    {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                                </select>
                                <div className={labelStyle}>الموقع</div>
                            </div>
                            <div className={rowStyle}>
                                <select className={inputStyle} value={irrigationFormData.generatorModel} onChange={e => handleIrrigationChange('generatorModel', e.target.value)}>
                                    <option value="">اختر المولد...</option>
                                    {machines.map(m => (
                                        <option key={m.id} value={m.category || m.id}>{m.category || m.id}</option>
                                    ))}
                                </select>
                                <div className={labelStyle}>موديل المولد</div>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-3">
                            <div className={rowStyle}>
                                <input type="number" className={inputStyle} value={irrigationFormData.engineStart} onChange={e => handleIrrigationChange('engineStart', e.target.value)} />
                                <div className={labelStyle}>بداية العداد</div>
                            </div>
                            <div className={rowStyle}>
                                <input type="number" className={inputStyle} value={irrigationFormData.engineEnd} onChange={e => handleIrrigationChange('engineEnd', e.target.value)} />
                                <div className={labelStyle}>نهاية العداد</div>
                            </div>
                             <div className={rowStyle}>
                                <input type="number" className={`${inputStyle} bg-yellow-50`} disabled value={irrigationFormData.totalHours} />
                                <div className={labelStyle}>اجمالي ساعات</div>
                            </div>
                        </div>

                        {/* Column 3 */}
                        <div className="space-y-3">
                            <div className="flex flex-col h-full">
                                <textarea 
                                    className={`${inputStyle} h-full py-2 resize-none text-right`} 
                                    placeholder="ملاحظات..." 
                                    value={irrigationFormData.notes} 
                                    onChange={e => handleIrrigationChange('notes', e.target.value)} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center gap-4 mt-6 py-4 border-t border-b bg-white rounded shadow-sm">
                    <button onClick={handleCreateIrrigation} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </div>
                        <span className="text-sm font-bold">إضافة</span>
                    </button>
                    <button onClick={handleResetIrrigation} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </div>
                        <span className="text-sm font-bold">استرجاع</span>
                    </button>
                    <button onClick={handleUpdateIrrigation} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </div>
                        <span className="text-sm font-bold">تعديل</span>
                    </button>
                    <button onClick={handleDeleteIrrigation} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <span className="text-sm font-bold">حذف</span>
                    </button>
                    <button onClick={handleExcelExport} className="flex flex-col items-center text-green-700 hover:text-green-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mb-1 group-hover:bg-green-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <span className="text-sm font-bold">اكسل</span>
                    </button>
                    <button onClick={handleBackup} disabled={syncLoading} className="flex flex-col items-center text-indigo-700 hover:text-indigo-900 group">
                        <div className="w-10 h-10 rounded-full border-2 border-indigo-600 flex items-center justify-center mb-1 group-hover:bg-indigo-50">
                            {syncLoading ? <span className="animate-spin text-sm">↻</span> : <span className="text-lg">☁️</span>}
                        </div>
                        <span className="text-sm font-bold">نسخ احتياطي</span>
                    </button>
                </div>

                <div className="bg-white border border-gray-300 rounded relative shadow-sm mt-4 overflow-hidden">
                    <div className="bg-gray-100 px-3 py-2 border-b font-bold text-gray-700 flex justify-between items-center">
                        <span>Database</span>
                        <span className="text-xs text-gray-400 font-normal">{irrigationLogs.length} Records</span>
                    </div>
                    <div className="overflow-x-auto h-64">
                        <table className="w-full text-right text-sm border-collapse">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    {["م", "التاريخ", "الموقع", "المولد", "بداية", "نهاية", "ساعات التشغيل", "ملاحظات"].map(h => (
                                        <th key={h} className="border p-2 font-bold whitespace-nowrap text-gray-700">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {irrigationLogs.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center p-4 text-gray-400">No records found</td></tr>
                                ) : (
                                    irrigationLogs.map(log => (
                                        <tr 
                                            key={log.id} 
                                            onClick={() => { setIrrigationFormData(log); setSelectedIrrigationId(log.id); }}
                                            className={`cursor-pointer hover:bg-yellow-50 transition-colors ${selectedIrrigationId === log.id ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}
                                        >
                                            <td className="border p-1">{log.id}</td>
                                            <td className="border p-1">{log.date}</td>
                                            <td className="border p-1">{log.locationName}</td>
                                            <td className="border p-1">{log.generatorModel}</td>
                                            <td className="border p-1">{log.engineStart}</td>
                                            <td className="border p-1">{log.engineEnd}</td>
                                            <td className="border p-1">{log.totalHours}</td>
                                            <td className="border p-1">{log.notes}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AgriWorkOrder;