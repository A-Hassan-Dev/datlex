
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { IssueRecord, Item, Location, Machine, Sector, Division, User, MaintenancePlan, BOMRecord, OrgStructure } from '../types';
import PrintLayout from './PrintLayout';
import { generateIssueEmail } from '../services/geminiService';
import { sendIssueToSheet, uploadFileToDrive, DEFAULT_SCRIPT_URL } from '../services/googleSheetsService';
import SearchableSelect, { Option } from './SearchableSelect';
import * as XLSX from 'xlsx';

interface IssueFormProps {
    onAddIssue: (issue: IssueRecord) => void;
    items: Item[];
    machines: Machine[];
    locations: Location[];
    sectors: Sector[];
    divisions: Division[];
    maintenancePlans: MaintenancePlan[];
    currentUser: User;
    bomRecords?: BOMRecord[];
    orgStructures?: OrgStructure[];
}

interface LineItem {
    itemId: string;
    itemName: string;
    unit: string;
    quantity: number;
    locationStock?: number; 
    otherStock?: number;    
    machineId?: string;
    machineName?: string;
}

const IssueForm: React.FC<IssueFormProps> = ({
    onAddIssue, items, machines, locations, sectors, divisions, maintenancePlans, currentUser, bomRecords = [], orgStructures = []
}) => {
    const [issueMode, setIssueMode] = useState<'single' | 'multi'>('single');

    const [locationId, setLocationId] = useState('');
    const [sectorId, setSectorId] = useState('');
    const [divisionId, setDivisionId] = useState('');

    const [machineId, setMachineId] = useState('');

    const [lineMachineId, setLineMachineId] = useState('');

    const [selectedPlanId, setSelectedPlanId] = useState('');

    const [showTechnicalFilters, setShowTechnicalFilters] = useState(false); 
    const [filterMainGroup, setFilterMainGroup] = useState('');
    const [filterSubGroup, setFilterSubGroup] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterModelNo, setFilterModelNo] = useState('');
    const [filterLocalNo, setFilterLocalNo] = useState('');
    const [filterChaseNo, setFilterChaseNo] = useState('');

    const [warehouseEmail, setWarehouseEmail] = useState('');
    const [requesterEmail, setRequesterEmail] = useState('');

    const [currentItemId, setCurrentItemId] = useState('');
    const [currentItemName, setCurrentItemName] = useState('');
    const [currentQuantity, setCurrentQuantity] = useState<number | ''>('');

    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSubmittedBatch, setLastSubmittedBatch] = useState<IssueRecord[] | null>(null);
    const [emailStatus, setEmailStatus] = useState<string>('');

    const [uploadingToDrive, setUploadingToDrive] = useState(false);
    const [driveLink, setDriveLink] = useState('');

    const itemInputRef = useRef<HTMLInputElement>(null);
    const qtyInputRef = useRef<HTMLInputElement>(null);
    const sectorInputRef = useRef<HTMLInputElement>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    const ignoreNextSectorChange = useRef(false);
    const ignoreNextDivisionChange = useRef(false);

    useEffect(() => {
        const prefillStr = localStorage.getItem('wf_issue_prefill');
        if (prefillStr) {
            try {
                const data = JSON.parse(prefillStr);
                let prefillSectorId = data.sectorId;
                if (!prefillSectorId && data.divisionId) {
                    const div = divisions.find(d => d.id === data.divisionId);
                    if (div) prefillSectorId = div.sectorId;
                }
                if (data.locationId) setLocationId(data.locationId);

                if (prefillSectorId) {
                    ignoreNextSectorChange.current = true;
                    setSectorId(prefillSectorId);
                }

                if (data.divisionId) {
                    ignoreNextDivisionChange.current = true;
                    setDivisionId(data.divisionId);
                }

                if (data.machineId) {
                    const m = machines.find(mac => mac.id === data.machineId);
                    if (m) {
                        setFilterCategory(m.category || '');
                        setFilterBrand(m.brand || '');
                        setFilterModelNo(m.modelNo || '');
                        setFilterLocalNo(m.machineLocalNo || '');
                        setFilterChaseNo(m.chaseNo || '');
                        setMachineId(data.machineId);
                    }
                }
                if (data.maintenancePlanId) setSelectedPlanId(data.maintenancePlanId);
            } catch (e) { console.error("Prefill error", e); }
            localStorage.removeItem('wf_issue_prefill');
        }
    }, [divisions, machines]);

    const selectedItemObj = useMemo(() => items.find(i => i.id === currentItemId), [items, currentItemId]);

    const getStockInfo = (item?: Item) => {
        if (!item) return { local: 0, other: 0 };
        const total = item.stockQuantity || 0;

        if (item.quantitiesByLocation) {
            const local = item.quantitiesByLocation[locationId] || 0;
            return { local, other: total - local };
        }

        if (locationId === 'WH-001') {
            return { local: total, other: 0 };
        }

        return { local: 0, other: total };
    };

    const currentStockInfo = useMemo(() => getStockInfo(selectedItemObj), [selectedItemObj, locationId]);

    useEffect(() => {
        if (selectedItemObj) {
            setCurrentItemName(selectedItemObj.fullName || selectedItemObj.name);
        } else {
            setCurrentItemName('');
        }
    }, [currentItemId, selectedItemObj]);

    useEffect(() => {
        if (ignoreNextSectorChange.current) {
            ignoreNextSectorChange.current = false;
            return;
        }
        setDivisionId('');
        resetTechnicalFilters();
    }, [sectorId]);

    useEffect(() => {
        if (ignoreNextDivisionChange.current) {
            ignoreNextDivisionChange.current = false;
            return;
        }
    }, [divisionId]);

    const resetTechnicalFilters = () => {
        setFilterMainGroup('');
        setFilterSubGroup('');
        setFilterCategory('');
        setFilterBrand('');
        setFilterModelNo('');
        setFilterLocalNo('');
        setFilterChaseNo('');
        setMachineId('');
        setLineMachineId('');
    };

    useEffect(() => {
        const location = locations.find(l => l.id === locationId);
        if (location) {
            const email = location.email || '';
            setRequesterEmail(email);
            setWarehouseEmail(email); 
        } else {
            setRequesterEmail('');
            setWarehouseEmail('');
        }
    }, [locationId, locations]);

    const handleAddLineItem = () => {
        if (!currentItemId || !currentQuantity || Number(currentQuantity) <= 0) return;

        if (issueMode === 'multi' && !lineMachineId) {
            alert("Please select a Machine for this item.");
            return;
        }

        if (currentStockInfo.local < Number(currentQuantity)) {
            if (!confirm(`Warning: Requested Quantity (${currentQuantity}) exceeds Local Stock (${currentStockInfo.local}) for ${locationId}. \n\nOther locations have: ${currentStockInfo.other}.\n\nContinue?`)) {
                return;
            }
        }

        let itemMachineId = undefined;
        let itemMachineName = undefined;

        if (issueMode === 'multi') {
            const m = machines.find(mac => mac.id === lineMachineId);
            itemMachineId = lineMachineId;
            itemMachineName = m ? (m.category ? m.category : `Machine ${m.id}`) : 'Unknown';
        }

        const newItem: LineItem = {
            itemId: currentItemId,
            itemName: currentItemName,
            unit: selectedItemObj?.unit || 'pcs',
            quantity: Number(currentQuantity),
            locationStock: currentStockInfo.local,
            otherStock: currentStockInfo.other,
            machineId: itemMachineId,
            machineName: itemMachineName
        };

        setLineItems([...lineItems, newItem]);

        setCurrentItemId('');
        setCurrentItemName('');
        setCurrentQuantity('');
        if (issueMode === 'multi') setLineMachineId(''); 
        setTimeout(() => itemInputRef.current?.focus(), 50);
    };

    const handleUseSuggestedPart = (bom: BOMRecord) => {
        setCurrentItemId(bom.itemId);
        setCurrentQuantity(bom.quantity);
        setTimeout(() => qtyInputRef.current?.focus(), 100);
    };

    const handleRemoveLineItem = (index: number) => {
        const newItems = [...lineItems];
        newItems.splice(index, 1);
        setLineItems(newItems);
    };

    const handleUpdateLineQty = (index: number, newQty: number) => {
        if (newQty <= 0) return;
        const newItems = [...lineItems];
        const item = items.find(it => it.id === newItems[index].itemId);
        const stock = getStockInfo(item);

        newItems[index] = {
            ...newItems[index],
            quantity: newQty,
            locationStock: stock.local,
            otherStock: stock.other
        };
        setLineItems(newItems);
    };


    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([["Item Code", "Quantity", "Equipment ID"], ["ITM-001", "5", "ASSET-001"], ["ITM-002", "10", "ASSET-002"]]);
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Item_Upload_Template.xlsx");
    };


    const handleImportClick = () => {
        importFileRef.current?.click();
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            try {
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                if (data.length < 2) {
                    alert("File appears empty or missing headers.");
                    return;
                }

                const headers = data[0].map(h => String(h).toLowerCase().trim());
                const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('item') || h.includes('part'));
                const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity') || h.includes('count'));
                const machineIdx = headers.findIndex(h => h.includes('machine') || h.includes('asset') || h.includes('equipment') || h.includes('id'));


                if (codeIdx === -1 || qtyIdx === -1) {
                    alert("Could not find 'Item Code' or 'Quantity' columns in the first row.");
                    return;
                }

                const newLines: LineItem[] = [];
                let notFoundCount = 0;

                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0) continue;

                    const rawCode = row[codeIdx];
                    const rawQty = row[qtyIdx];

                    if (rawCode && rawQty) {
                        const cleanCode = String(rawCode).trim();
                        const qty = Number(rawQty);
                        const rawMachine = machineIdx > -1 ? row[machineIdx] : null;

                        const masterItem = items.find(it => it.id === cleanCode);
                        if (masterItem) {
                            const stock = getStockInfo(masterItem);

                            let lineMachineId = undefined;
                            let lineMachineName = undefined;

                            if (rawMachine) {
                                const mId = String(rawMachine).trim();
                                const m = machines.find(mac => mac.id === mId || mac.machineLocalNo === mId);
                                if (m) {
                                    lineMachineId = m.id;
                                    lineMachineName = m.category || `Machine ${m.id}`;
                                }
                            } else if (issueMode === 'multi') {
                                lineMachineId = machineId || '';
                            }

                            newLines.push({
                                itemId: masterItem.id,
                                itemName: masterItem.fullName || masterItem.name,
                                unit: masterItem.unit || 'pcs',
                                quantity: qty,
                                locationStock: stock.local,
                                otherStock: stock.other,
                                machineId: lineMachineId,
                                machineName: lineMachineName
                            });
                        } else {
                            notFoundCount++;
                        }
                    }

                }

                if (newLines.length > 0) {
                    setLineItems(prev => [...prev, ...newLines]);
                    let msg = `Successfully added ${newLines.length} items from Excel.`;
                    if (notFoundCount > 0) msg += `\n\n⚠️ ${notFoundCount} items were skipped because the Item Code was not found in Master Data.`;
                    alert(msg);
                } else {
                    alert("No valid items found in the file. Please check Item Codes against Master Data.");
                }

            } catch (err) {
                console.error(err);
                alert("Failed to parse Excel file.");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDriveLink('');

        try {
            if (!locationId) { alert("Please select a 'Warehouse Location'."); return; }

            if (issueMode === 'single' && !machineId) { alert("Please select a 'Machine'."); return; }

            if (lineItems.length === 0) { alert("Please add at least one item."); return; }
            if (!selectedPlanId) { alert("Please select a 'Maintenance Plan'."); return; }
            if (!warehouseEmail) { alert("Please provide a Warehouse Email."); return; }

            setIsSubmitting(true);
            setEmailStatus('Processing Request...');

            const sector = sectors.find(s => s.id === sectorId);
            const division = divisions.find(d => d.id === divisionId);
            const plan = maintenancePlans.find(p => p.id === selectedPlanId);
            const locObj = locations.find(l => l.id === locationId);

            const timestamp = new Date().toISOString();
            const batchIdBase = Date.now().toString().slice(-6);

            const newRecords: IssueRecord[] = [];

            for (let i = 0; i < lineItems.length; i++) {
                const line = lineItems[i];
                const itemObj = items.find(it => it.id === line.itemId);
                const itemCost = itemObj?.cost || 0;
                const lineTotalCost = itemCost * Number(line.quantity);
                const isHighValue = lineTotalCost > 100000;

                let finalMachineId = '';
                let finalMachineName = '';
                let finalMachineLocalNo = '';

                if (issueMode === 'single') {
                    const m = machines.find(mac => mac.id === machineId);
                    finalMachineId = machineId;
                    finalMachineName = m ? (m.category ? m.category : `Machine ${m.id}`) : 'Unknown';
                    finalMachineLocalNo = m?.machineLocalNo || '';
                } else {
                    finalMachineId = line.machineId || 'Unknown';
                    finalMachineName = line.machineName || 'Unknown Machine';
                    const m = machines.find(mac => mac.id === finalMachineId);
                    finalMachineLocalNo = m?.machineLocalNo || '';
                }

                newRecords.push({
                    id: `REQ-${batchIdBase}-${i + 1}`,
                    timestamp: timestamp,
                    locationId,
                    locationName: locObj?.name || locationId,
                    itemId: line.itemId,
                    itemName: line.itemName,
                    quantity: line.quantity,
                    unit: line.unit,
                    machineId: finalMachineId,
                    machineName: finalMachineName,
                    machineLocalNo: finalMachineLocalNo,
                    sectorName: sector ? sector.name : '',
                    divisionName: division ? division.name : '',
                    maintenancePlan: plan ? plan.name : '',
                    maintenancePlanId: plan ? plan.id : '',
                    status: isHighValue ? 'Pending Manager Approval' : 'Pending',
                    approvalStatus: isHighValue ? 'Pending' : 'Approved',
                    calculatedTotalCost: lineTotalCost,
                    warehouseEmail,
                    requesterEmail,
                    requesterName: currentUser.name || currentUser.username
                });
            }


            await new Promise(resolve => setTimeout(resolve, 800));

            const scriptUrl = localStorage.getItem('wf_script_url_v3') || DEFAULT_SCRIPT_URL;
            if (scriptUrl) {
                setEmailStatus('Syncing with background servers...');
                Promise.all(newRecords.map(r => sendIssueToSheet(scriptUrl, r)))
                    .then(() => setEmailStatus('Request Registered Successfully'))
                    .catch(e => {
                        console.error(e);
                        setEmailStatus('Background sync failed - check connection');
                    });
            } else {
                setEmailStatus('Request Registered Successfully');
            }

            newRecords.forEach(record => onAddIssue(record));
            setLastSubmittedBatch(newRecords);

            resetTechnicalFilters();
            setLineItems([]);
            setSelectedPlanId('');

        } catch (error) {
            console.error("Submission Error:", error);
            alert("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => window.print();

    const getExcelWorkbook = () => {
        if (!lastSubmittedBatch || lastSubmittedBatch.length === 0) return null;
        const headers = ["Request ID", "Date", "Location", "Sector", "Division", "Machine", "Maint. Plan", "Item Number", "Item Name", "Unit", "Quantity", "Warehouse Email", "Site Email"];
        const rows = lastSubmittedBatch.map(item => [
            item.id, new Date(item.timestamp).toLocaleString(), item.locationId, item.sectorName || '', item.divisionName || '',
            item.machineName, item.maintenancePlan || '', item.itemId, item.itemName, item.unit || 'pcs', item.quantity, item.warehouseEmail || '', item.requesterEmail || ''
        ]);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, "RequestSlip");
        return wb;
    };

    const handleExportExcel = () => {
        const wb = getExcelWorkbook();
        if (!wb || !lastSubmittedBatch) return;
        XLSX.writeFile(wb, `Request_Slip_${lastSubmittedBatch[0].id.split('-')[1]}.xlsx`);
    };

    const handleSaveToDrive = async () => {
        const scriptUrl = localStorage.getItem('wf_script_url_v3') || DEFAULT_SCRIPT_URL;
        if (!scriptUrl || !lastSubmittedBatch) return;
        setUploadingToDrive(true);
        try {
            const wb = getExcelWorkbook();
            if (!wb) throw new Error("No data");
            const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
            const url = await uploadFileToDrive(scriptUrl, `Request_Slip_${lastSubmittedBatch[0].id.split('-')[1]}.xlsx`, wbOut);
            setDriveLink(url || 'saved');
            if (!url) alert("Saved to Drive folder.");
        } catch (e) { alert("Failed to upload."); } finally { setUploadingToDrive(false); }
    };

    const availableSectors = useMemo(() => {
        if (!locationId) return sectors;

        const orgMatch = orgStructures.filter(os => os.locationId === locationId);
        if (orgMatch.length > 0) {
            const allowedSectorIds = new Set(orgMatch.map(os => os.sectorId));
            return sectors.filter(s => allowedSectorIds.has(s.id));
        }

        const loc = locations.find(l => l.id === locationId);
        const locName = loc?.name;
        const machinesInLoc = machines.filter(m => {
            const mLoc = String(m.locationId || '');
            return mLoc === locationId || mLoc === locName;
        });
        const allowedSectorIds = new Set<string>();
        machinesInLoc.forEach(m => {
            if (m.sectorId) allowedSectorIds.add(m.sectorId);
            if (m.divisionId) {
                const div = divisions.find(d => d.id === m.divisionId || d.name === m.divisionId);
                if (div) allowedSectorIds.add(div.sectorId);
            }
        });
        return sectors.filter(s => allowedSectorIds.has(s.id) || allowedSectorIds.has(s.name));
    }, [locationId, machines, sectors, divisions, locations, orgStructures]);

    const availableDivisions = useMemo(() => {
        if (!sectorId) return divisions;

        const orgMatch = orgStructures.filter(os =>
            os.locationId === locationId && os.sectorId === sectorId
        );
        if (orgMatch.length > 0) {
            const allowedDivIds = new Set(orgMatch.map(os => os.divisionId));
            return divisions.filter(d => allowedDivIds.has(d.id));
        }

        return divisions.filter(d => d.sectorId === sectorId);
    }, [locationId, sectorId, divisions, orgStructures]);

    const machinesForTechnicalFilters = useMemo(() => {
        return machines.filter(m => {
            if (locationId) {
                const loc = locations.find(l => l.id === locationId);
                const mLoc = String(m.locationId || '');
                if (mLoc !== locationId && mLoc !== loc?.name) return false;
            }
            if (sectorId) {
                const sec = sectors.find(s => s.id === sectorId);
                const secName = sec?.name;
                const directMatch = m.sectorId === sectorId || (secName && m.sectorId === secName);
                let divisionMatch = false;
                if (m.divisionId) {
                    const div = divisions.find(d => d.id === m.divisionId || d.name === m.divisionId);
                    if (div) {
                        divisionMatch = div.sectorId === sectorId || (secName && div.sectorId === secName);
                    }
                }
                if (!directMatch && !divisionMatch) return false;
            }
            return true;
        });
    }, [machines, locationId, sectorId, locations, sectors, divisions]);

    const mainGroupOptions = useMemo(() => {
        const set = new Set<string>();
        machinesForTechnicalFilters.forEach(m => { if (m.mainGroup) set.add(m.mainGroup); });
        return Array.from(set).sort().map(c => ({ id: c, label: c }));
    }, [machinesForTechnicalFilters]);

    const machinesInMainGroup = useMemo(() => {
        return filterMainGroup ? machinesForTechnicalFilters.filter(m => m.mainGroup === filterMainGroup) : machinesForTechnicalFilters;
    }, [machinesForTechnicalFilters, filterMainGroup]);

    const subGroupOptions = useMemo(() => {
        const set = new Set<string>();
        machinesInMainGroup.forEach(m => { if (m.subGroup) set.add(m.subGroup); });
        return Array.from(set).sort().map(b => ({ id: b, label: b }));
    }, [machinesInMainGroup]);

    const machinesInSubGroup = useMemo(() => {
        return filterSubGroup ? machinesInMainGroup.filter(m => m.subGroup === filterSubGroup) : machinesInMainGroup;
    }, [machinesInMainGroup, filterSubGroup]);

    const categoryOptions = useMemo(() => {
        const set = new Set<string>();
        machinesInSubGroup.forEach(m => { if (m.category) set.add(m.category); });
        return Array.from(set).sort().map(c => ({ id: c, label: c }));
    }, [machinesInSubGroup]);

    const machinesInCat = useMemo(() => {
        return filterCategory ? machinesInSubGroup.filter(m => m.category === filterCategory) : machinesInSubGroup;
    }, [machinesInSubGroup, filterCategory]);

    const brandOptions = useMemo(() => {
        const set = new Set<string>();
        machinesInCat.forEach(m => { if (m.brand) set.add(m.brand); });
        return Array.from(set).sort().map(b => ({ id: b, label: b }));
    }, [machinesInCat]);

    const machinesInBrand = useMemo(() => {
        return filterBrand ? machinesInCat.filter(m => m.brand === filterBrand) : machinesInCat;
    }, [machinesInCat, filterBrand]);

    const modelOptions = useMemo(() => {
        const set = new Set<string>();
        machinesInBrand.forEach(m => { if (m.modelNo) set.add(m.modelNo); });
        return Array.from(set).sort().map(m => ({ id: m, label: m }));
    }, [machinesInBrand]);

    const machinesInModel = useMemo(() => {
        return filterModelNo ? machinesInBrand.filter(m => m.modelNo === filterModelNo) : machinesInBrand;
    }, [machinesInBrand, filterModelNo]);

    const localNoOptions = useMemo(() => {
        const set = new Set<string>();
        machinesInModel.forEach(m => { if (m.machineLocalNo) set.add(m.machineLocalNo); });
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(l => ({ id: l, label: l }));
    }, [machinesInModel]);

    const machinesInLocal = useMemo(() => {
        return filterLocalNo ? machinesInModel.filter(m => m.machineLocalNo === filterLocalNo) : machinesInModel;
    }, [machinesInModel, filterLocalNo]);

    const chaseNoOptions = useMemo(() => {
        const set = new Set<string>();
        machinesInLocal.forEach(m => { if (m.chaseNo) set.add(m.chaseNo); });
        return Array.from(set).sort().map(c => ({ id: c, label: c }));
    }, [machinesInLocal]);

    const machinesFinal = useMemo(() => {
        return filterChaseNo ? machinesInLocal.filter(m => m.chaseNo === filterChaseNo) : machinesInLocal;
    }, [machinesInLocal, filterChaseNo]);

    const machineOptions = useMemo(() => {
        return machinesFinal.map(m => ({
            id: m.id,
            label: `${m.id} ${m.category ? `- ${m.category}` : ''}`,
            subLabel: `Local: ${m.machineLocalNo || '-'} | Chase: ${m.chaseNo || '-'}`
        }));
    }, [machinesFinal]);

    const suggestedParts = useMemo(() => {
        if (!filterCategory || !filterModelNo) return [];
        let filtered = bomRecords.filter(b => b.machineCategory === filterCategory && b.modelNo === filterModelNo);

        if (selectedPlanId) {
            const plan = maintenancePlans.find(p => p.id === selectedPlanId);
            if (plan) {
                const planName = plan.name.toLowerCase();
                filtered = filtered.filter(b => {
                    if (!b.maintenanceType) return true; 
                    const types = b.maintenanceType.toLowerCase().split(',').map(t => t.trim());
                    return types.some(t => planName.includes(t) || t.includes(planName));
                });
            }
        }
        return filtered;
    }, [bomRecords, filterCategory, filterModelNo, selectedPlanId, maintenancePlans]);


    const handleMainGroupChange = (val: string) => {
        setFilterMainGroup(val); setFilterSubGroup(''); setFilterCategory(''); setFilterBrand(''); setFilterModelNo(''); setFilterLocalNo(''); setFilterChaseNo('');
        setMachineId(''); setLineMachineId('');
    };
    const handleSubGroupChange = (val: string) => {
        setFilterSubGroup(val); setFilterCategory(''); setFilterBrand(''); setFilterModelNo(''); setFilterLocalNo(''); setFilterChaseNo('');
        setMachineId(''); setLineMachineId('');
    };

    const handleCategoryChange = (val: string) => {
        setFilterCategory(val); setFilterBrand(''); setFilterModelNo(''); setFilterLocalNo(''); setFilterChaseNo('');
        setMachineId(''); setLineMachineId('');
    };
    const handleBrandChange = (val: string) => {
        setFilterBrand(val); setFilterModelNo(''); setFilterLocalNo(''); setFilterChaseNo('');
        setMachineId(''); setLineMachineId('');
    };
    const handleModelChange = (val: string) => {
        setFilterModelNo(val); setFilterLocalNo(''); setFilterChaseNo('');
        setMachineId(''); setLineMachineId('');
    };

    const handleLocalNoChange = (val: string) => {
        setFilterLocalNo(val); setFilterChaseNo('');
        setMachineId(''); setLineMachineId('');
        if (!val) return;
        const matches = machinesInCat.filter(m => m.machineLocalNo === val);
        if (matches.length > 0) {
            const first = matches[0];
            setFilterBrand(first.brand || '');
            setFilterModelNo(first.modelNo || '');
            if (matches.length === 1) {
                if (issueMode === 'single') setMachineId(first.id);
                else setLineMachineId(first.id);
                setFilterChaseNo(first.chaseNo);
            }
        }
    };

    const handleChaseChange = (val: string) => {
        setFilterChaseNo(val);
        setMachineId(''); setLineMachineId('');
        if (!val) return;
        const matches = machinesInCat.filter(m => m.chaseNo === val);
        if (matches.length > 0) {
            const first = matches[0];
            setFilterBrand(first.brand || '');
            setFilterModelNo(first.modelNo || '');
            setFilterLocalNo(first.machineLocalNo || '');
            if (matches.length === 1) {
                if (issueMode === 'single') setMachineId(first.id);
                else setLineMachineId(first.id);
            }
        }
    };

    const handleMachineIdChange = (val: string) => {
        if (issueMode === 'single') setMachineId(val);
        else setLineMachineId(val);

        const m = machines.find(mac => mac.id === val);
        if (m) {
            setFilterCategory(m.category || ''); setFilterBrand(m.brand || ''); setFilterModelNo(m.modelNo || ''); setFilterLocalNo(m.machineLocalNo || ''); setFilterChaseNo(m.chaseNo || '');
        }
    };

    const handleSectorChange = (val: string) => {
        setSectorId(val);
        if (divisionId) {
            const isValid = orgStructures.some(os =>
                os.locationId === locationId && os.sectorId === val && os.divisionId === divisionId
            );
            if (!isValid) setDivisionId('');
        }
    };

    const handleDivisionChange = (val: string) => {
        setDivisionId(val);
        if (!val) return;

        const match = orgStructures.find(os => os.divisionId === val);
        if (match) {
            if (!locationId) setLocationId(match.locationId);
            if (!sectorId) setSectorId(match.sectorId);
        }
    };

    const locationOptions = useMemo(() => locations.map(l => ({ id: l.id, label: l.name })), [locations]);
    const sectorOptions = useMemo(() => availableSectors.map(s => ({ id: s.id, label: s.name })), [availableSectors]);
    const divisionOptions = useMemo(() => availableDivisions.map(d => ({ id: d.id, label: d.name })), [availableDivisions]);

    const itemOptions = useMemo(() => items.map(i => {
        let stockDisplay = '';
        const total = i.stockQuantity || 0;
        if (i.quantitiesByLocation) {
            const local = i.quantitiesByLocation[locationId] || 0;
            stockDisplay = `Loc: ${local} | Other: ${total - local}`;
        } else {
            if (locationId === 'WH-001') stockDisplay = `Loc: ${total} | Other: 0`;
            else stockDisplay = `Loc: 0 | Other: ${total}`;
        }

        const parts = [
            i.partNumber ? `PN: ${i.partNumber}` : '',
            i.modelNo ? `Model: ${i.modelNo}` : '',
            stockDisplay
        ].filter(Boolean).join(' | ');
        return { id: i.id, label: i.id, subLabel: parts ? `${i.name} | ${parts}` : i.name };
    }), [items, locationId]);

    const itemNameOptions = useMemo(() => items.map(i => ({ id: i.id, label: i.fullName || i.name, subLabel: i.id })), [items]);

    const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); setTimeout(() => { if (currentItemId) qtyInputRef.current?.focus(); }, 100); }
    };
    const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); handleAddLineItem(); }
    };

    const allowedLocations = currentUser.role === 'admin' ? locations : locations.filter(l => currentUser.allowedLocationIds?.includes(l.id));

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* SUCCESS MODAL POPUP (Unchanged) */}
            {lastSubmittedBatch && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up">
                        <div className="bg-blue-600 p-6 text-white text-center">
                            <h2 className="text-2xl font-bold">Request Sent!</h2>
                            <p className="opacity-90 mt-1">Notification sent to {lastSubmittedBatch[0].warehouseEmail}</p>
                        </div>
                        <div className="p-8 space-y-3">
                            <button onClick={handlePrint} className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-black font-bold flex items-center justify-center gap-3 shadow-lg"><span>🖨️</span> Print Request Slip</button>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleExportExcel} className="py-3 bg-green-100 text-green-800 rounded-xl hover:bg-green-200 font-semibold flex items-center justify-center gap-2 transition border border-green-200"><span>📊</span> Excel</button>
                                {driveLink && driveLink !== 'saved' ? (
                                    <a href={driveLink} target="_blank" rel="noopener noreferrer" className="py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold flex items-center justify-center gap-2 transition shadow-md"><span>📂</span> Open File ↗</a>
                                ) : (
                                    <button onClick={handleSaveToDrive} disabled={uploadingToDrive} className={`py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition border ${uploadingToDrive ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}>{uploadingToDrive ? 'Saving...' : 'Save to Drive'}</button>
                                )}
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 border-t border-gray-100 text-center">
                            <button onClick={() => setLastSubmittedBatch(null)} className="text-gray-500 hover:text-gray-800 font-medium px-6 py-2">Start New Request</button>
                        </div>
                    </div>
                </div>
            )}
            <PrintLayout batch={lastSubmittedBatch || []} />

            {/* FORM CONTAINER */}
            <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
                        <span className="mr-3 p-2 bg-blue-100 text-blue-600 rounded-lg text-lg md:text-xl">📝</span>
                        Create New Request
                    </h2>

                    {/* Mode Switcher */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => { setIssueMode('single'); setLineItems([]); }}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${issueMode === 'single' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Single Machine
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIssueMode('multi'); setLineItems([]); setMachineId(''); }}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${issueMode === 'multi' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Multi-Machine
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">

                    {/* Section 1: HEADER */}
                    <div className="bg-blue-50 p-4 md:p-5 rounded-lg border border-blue-100">
                        <div className="mb-2">
                            <SearchableSelect label="1. Select Warehouse Location" required options={locationOptions} value={locationId} onChange={setLocationId} placeholder="Start typing to search zone..." disabled={allowedLocations.length === 0} />
                        </div>
                    </div>

                    {locationId && (
                        <>
                            {/* Section 2: Machine Allocation */}
                            <div className="bg-white p-4 md:p-5 rounded-lg border border-gray-200 animate-fade-in-up">
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                        2. {issueMode === 'single' ? 'Select Machine (Single)' : 'Context Filter (Multi-Machine)'}
                                    </h3>
                                    <button type="button" onClick={() => setShowTechnicalFilters(!showTechnicalFilters)} className="text-xs text-blue-600 hover:underline font-semibold">
                                        {showTechnicalFilters ? 'Hide Filters' : 'Show Advanced Filters'}
                                    </button>
                                </div>

                                {/* Context/Hierarchy Selectors (Always visible to filter machine dropdowns) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SearchableSelect label="Sector" options={sectorOptions} value={sectorId} onChange={handleSectorChange} placeholder="Select Sector..." inputRef={sectorInputRef} />
                                    <SearchableSelect label="Division" options={divisionOptions} value={divisionId} onChange={handleDivisionChange} placeholder="Select Division..." />
                                </div>

                                {showTechnicalFilters && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-100 animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                            <SearchableSelect label="Main Group" options={mainGroupOptions} value={filterMainGroup} onChange={handleMainGroupChange} placeholder="Select Main Group..." />
                                            <SearchableSelect label="Subgroup" options={subGroupOptions} value={filterSubGroup} onChange={handleSubGroupChange} placeholder="Select Subgroup..." disabled={!filterMainGroup} />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                            <SearchableSelect label="Equipment Name (Category)" options={categoryOptions} value={filterCategory} onChange={handleCategoryChange} placeholder="e.g. Tractor, Conveyor..." disabled={!filterSubGroup} />
                                            <SearchableSelect label="Brand Name" options={brandOptions} value={filterBrand} onChange={handleBrandChange} placeholder="Select Brand..." disabled={!filterCategory} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                            <SearchableSelect label="Model Name" options={modelOptions} value={filterModelNo} onChange={handleModelChange} placeholder="Select Model..." disabled={!filterCategory} />
                                            <SearchableSelect label="Local Number" options={localNoOptions} value={filterLocalNo} onChange={handleLocalNoChange} placeholder="Select Local No..." disabled={!filterCategory} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <SearchableSelect label="Chase No" options={chaseNoOptions} value={filterChaseNo} onChange={handleChaseChange} placeholder="Select Chase..." disabled={!filterCategory} />
                                        </div>
                                    </div>
                                )}

                                {/* Machine Selector - ONLY VISIBLE IN SINGLE MODE HERE */}
                                {issueMode === 'single' && (
                                    <div className="mt-4">
                                        <SearchableSelect label="Asset ID / Code (Final Machine)" required options={machineOptions} value={machineId} onChange={handleMachineIdChange} placeholder={machineOptions.length === 0 ? "Select Filters above..." : "Select Asset ID"} />
                                    </div>
                                )}

                                {/* SUGGESTED PARTS (BOM) - Moved here for Single Machine mode visibility */}
                                {issueMode === 'single' && suggestedParts.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-blue-100">
                                        <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center">
                                            <span className="mr-1">💡</span> Recommended Spare Parts (BOM) for {filterModelNo}
                                        </h4>
                                        <div className="overflow-x-auto rounded-lg border border-blue-100 bg-blue-50/50">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-blue-100 text-blue-800">
                                                    <tr><th className="px-3 py-2">Part No</th><th className="px-3 py-2">Item Code</th><th className="px-3 py-2">Full Name</th><th className="px-3 py-2">Std Qty</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2 w-20">Action</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-blue-100">
                                                    {suggestedParts.map(bom => {
                                                        const item = items.find(i => i.id === bom.itemId);
                                                        if (!item) return null;
                                                        return (
                                                            <tr key={bom.id} className="hover:bg-blue-100/50">
                                                                <td className="px-3 py-2">{item.partNumber || '-'}</td>
                                                                <td className="px-3 py-2 font-mono font-semibold">{bom.itemId}</td>
                                                                <td className="px-3 py-2">{item.fullName || item.name}</td>
                                                                <td className="px-3 py-2 font-bold">{bom.quantity} {item.unit}</td>
                                                                <td className={`px-3 py-2 font-bold ${(item.stockQuantity || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>{item.stockQuantity || 0}</td>
                                                                <td className="px-3 py-2"><button type="button" onClick={() => handleUseSuggestedPart(bom)} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-[10px] font-bold shadow-sm">+ Use</button></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {issueMode === 'multi' && (
                                    <div className="mt-4 p-2 bg-purple-50 border border-purple-100 rounded text-xs text-purple-700">
                                        ℹ️ <strong>Multi-Machine Mode:</strong> Select the specific machine for each item in the section below. Use Sector/Division filters above to narrow down the machine list.
                                    </div>
                                )}
                            </div>


                            {/* Section 3: LINES - SPLIT VIEW */}
                            <div className="bg-gray-50 p-4 md:p-5 rounded-lg border border-gray-200 shadow-sm relative animate-fade-in-up">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b pb-2">3. Scan / Enter Items</h3>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Option A: Manual Entry */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-blue-600 uppercase bg-blue-50 inline-block px-2 py-1 rounded">Option A: Manual / Scanner</h4>

                                        {/* In Multi Mode, we need Machine Selector here */}
                                        {issueMode === 'multi' && (
                                            <div className="p-3 bg-purple-100 rounded border border-purple-200 mb-2">
                                                <SearchableSelect
                                                    label="Select Machine for Item"
                                                    required
                                                    options={machineOptions}
                                                    value={lineMachineId}
                                                    onChange={handleMachineIdChange} 
                                                    placeholder={machineOptions.length === 0 ? "Filter machines in Section 2..." : "Select Asset ID"}
                                                    compact={true}
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <SearchableSelect label="Item Number (Scan Here)" options={itemOptions} value={currentItemId} onChange={setCurrentItemId} placeholder="Scan Item No..." inputRef={itemInputRef} onKeyDown={handleItemKeyDown} />
                                            <SearchableSelect label="Item Name" options={itemNameOptions} value={currentItemId} onChange={setCurrentItemId} placeholder="Search by name..." />

                                            <div className="flex gap-3 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Qty</label>
                                                    <input ref={qtyInputRef} type="number" min="1" value={currentQuantity} onChange={(e) => setCurrentQuantity(Number(e.target.value))} onKeyDown={handleQtyKeyDown} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-bold text-center h-[42px]" />
                                                </div>
                                                <div className="w-24">
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Unit</label>
                                                    <input type="text" disabled value={selectedItemObj?.unit || ''} className="w-full px-2 py-2 border border-gray-200 bg-gray-100 rounded-lg text-center text-gray-500 text-sm h-[42px]" />
                                                </div>
                                                <button type="button" onClick={handleAddLineItem} disabled={!currentItemId || !currentQuantity} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition shadow-sm h-[42px] font-bold">Add</button>
                                            </div>
                                            {selectedItemObj && (
                                                <div className="text-xs flex items-center gap-3 bg-white border px-2 py-2 rounded w-fit">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-500 font-bold">LOC STOCK:</span>
                                                        <span className={(currentStockInfo.local) <= 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{currentStockInfo.local}</span>
                                                    </div>
                                                    <div className="w-px h-4 bg-gray-300"></div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-500 font-bold">OTHER STOCK:</span>
                                                        <span className="text-blue-600 font-bold">{currentStockInfo.other}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Option B: Bulk Upload */}
                                    <div className="space-y-4 border-l lg:pl-8 border-gray-200">
                                        <h4 className="text-xs font-bold text-green-600 uppercase bg-green-50 inline-block px-2 py-1 rounded">Option B: Bulk Upload (Excel)</h4>
                                        <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-white text-center hover:bg-gray-50 transition-colors">
                                            <p className="text-sm text-gray-600 mb-3">Upload a list of items</p>
                                            <div className="flex flex-col gap-3">
                                                <button type="button" onClick={handleDownloadTemplate} className="text-xs text-blue-600 hover:underline">Download Template</button>
                                                <button type="button" onClick={handleImportClick} className="px-4 py-2 bg-green-100 text-green-700 font-bold rounded hover:bg-green-200 border border-green-200 flex items-center justify-center gap-2">
                                                    <span>📂</span> Select File
                                                </button>
                                                <input type="file" ref={importFileRef} hidden accept=".xlsx,.xls,.csv" onChange={handleImportFileChange} />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2">Columns: Item Code, Quantity</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ITEM LIST TABLE */}
                                <div className="mt-6 border-t pt-4">
                                    <h4 className="text-sm font-bold text-gray-700 mb-2">Request Items List ({lineItems.length})</h4>
                                    {lineItems.length > 0 ? (
                                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-100 text-gray-700 font-semibold">
                                                    <tr>
                                                        <th className="px-4 py-2">Item Number</th>
                                                        <th className="px-4 py-2">Item Name</th>
                                                        <th className="px-4 py-2">Unit</th>
                                                        {/* Show Machine Column in Multi Mode */}
                                                        {issueMode === 'multi' && <th className="px-4 py-2 bg-purple-50 text-purple-900">Assigned Machine</th>}
                                                        <th className="px-4 py-2 text-center">Qty</th>
                                                        <th className="px-4 py-2 text-center">Loc. Stock</th>
                                                        <th className="px-4 py-2 text-center">Other Stock</th>
                                                        <th className="px-4 py-2 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {lineItems.map((line, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 font-mono text-gray-600 font-bold">{line.itemId}</td>
                                                            <td className="px-4 py-2">{line.itemName}</td>
                                                            <td className="px-4 py-2 text-sm text-gray-500">{line.unit}</td>
                                                            {issueMode === 'multi' && (
                                                                <td className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50/30">
                                                                    {line.machineName || 'Unknown'}
                                                                </td>
                                                            )}
                                                            <td className="px-4 py-2 text-center">
                                                                <div className="relative group/qty inline-block">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={line.quantity}
                                                                        onChange={(e) => handleUpdateLineQty(idx, Number(e.target.value))}
                                                                        className="w-20 px-2 py-1.5 border border-blue-200 rounded-lg text-center font-bold text-blue-700 bg-blue-50/30 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                                                                        title="Click to edit quantity"
                                                                    />
                                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/qty:opacity-100 Transition-opacity pointer-events-none whitespace-nowrap">
                                                                        Edit Qty
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono text-gray-500">{line.locationStock}</td>
                                                            <td className="px-4 py-2 text-center font-mono text-blue-500">{line.otherStock}</td>
                                                            <td className="px-4 py-2 text-center"><button type="button" onClick={() => handleRemoveLineItem(idx)} className="text-red-500 hover:text-red-700 font-medium">Remove</button></td>
                                                        </tr>
                                                    ))}

                                                </tbody>
                                            </table>
                                        </div>
                                    ) : <div className="text-center py-4 text-gray-400 bg-gray-50 rounded border border-dashed text-xs">No items added yet.</div>}
                                </div>
                            </div>


                            {/* Section 4: Maintenance Plan */}
                            <div className="bg-orange-50 p-4 md:p-5 rounded-lg border border-orange-200 animate-fade-in-up">
                                <h3 className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-4 border-b border-orange-200 pb-2">4. Maintenance Plan (Mandatory)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {maintenancePlans && maintenancePlans.map((plan) => (
                                        <label key={plan.id} className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedPlanId === plan.id ? 'bg-orange-100 border-orange-500 ring-1 ring-orange-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                            <input type="radio" name="maintenance_plan" value={plan.id} checked={selectedPlanId === plan.id} onChange={(e) => setSelectedPlanId(e.target.value)} className="form-radio h-5 w-5 text-orange-600 focus:ring-orange-500" />
                                            <span className={`text-sm font-medium ${selectedPlanId === plan.id ? 'text-orange-900' : 'text-gray-700'}`}>{plan.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Section 5: Notification (Hidden as requested, now automatic) */}
                            <div className="hidden">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Email (To)</label><input type="email" required value={warehouseEmail} onChange={(e) => setWarehouseEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Site Email (CC)</label><div className="flex items-center px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 overflow-hidden text-ellipsis">{requesterEmail || "Select Location first"}</div></div>
                                </div>
                            </div>


                            <div className="pt-2 flex justify-end">
                                <button type="submit" disabled={isSubmitting || allowedLocations.length === 0} className={`w-full md:w-auto px-8 py-4 rounded-xl text-white font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2 ${isSubmitting || allowedLocations.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:shadow-lg transform hover:-translate-y-1'}`}>
                                    {isSubmitting ? 'Sending...' : <><span>🚀</span> Submit Request</>}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div >
    );
};

export default IssueForm;
