import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Item, Machine, Location, Sector, Division, IssueRecord, MaintenancePlan, OrgStructure, FailureType } from '../types';
import SearchableSelect from './SearchableSelect';
import { fetchRawCSV, DEFAULT_SHEET_ID, DEFAULT_ITEMS_GID, extractSheetIdFromUrl, extractGidFromUrl, locateRemoteData, backupTabToSheet, DEFAULT_SCRIPT_URL } from '../services/googleSheetsService';
import * as XLSX from 'xlsx';

interface MasterDataProps {
    history: IssueRecord[];
    items: Item[];
    machines: Machine[];
    locations: Location[];
    sectors: Sector[];
    divisions: Division[];
    plans: MaintenancePlan[];
    orgStructures: OrgStructure[];
    failureTypes: FailureType[];

    onAddItem: (item: Item) => void;
    onAddMachine: (machine: Machine) => void;
    onAddLocation: (location: Location) => void;
    onAddSector: (sector: Sector) => void;
    onAddDivision: (division: Division) => void;
    onAddPlan: (plan: MaintenancePlan) => void;
    onAddOrgStructure: (os: OrgStructure) => void;
    onAddFailureType: (ft: FailureType) => void;

    onUpdateItem: (item: Item) => void;
    onUpdateMachine: (machine: Machine) => void;
    onUpdateLocation: (location: Location) => void;
    onUpdateSector: (sector: Sector) => void;
    onUpdateDivision: (division: Division) => void;
    onUpdatePlan: (plan: MaintenancePlan) => void;
    onUpdateOrgStructure: (os: OrgStructure) => void;
    onUpdateFailureType: (ft: FailureType) => void;

    onDeleteItems: (ids: string[]) => void;
    onDeleteMachines: (ids: string[]) => void;
    onDeleteLocations: (ids: string[]) => void;
    onDeleteSectors: (ids: string[]) => void;
    onDeleteDivisions: (ids: string[]) => void;
    onDeletePlans: (ids: string[]) => void;
    onDeleteOrgStructures: (ids: string[]) => void;
    onDeleteFailureTypes: (ids: string[]) => void;

    onBulkImport: (tab: string, added: any[], updated: any[]) => void;
    onRestore?: () => Promise<void>;
}

type TabType = 'items' | 'locations' | 'sectors' | 'divisions' | 'plans' | 'history' | 'orgStructure' | 'failureTypes';

const ITEMS_PER_PAGE = 80;

const COLUMNS_CONFIG: Record<Exclude<TabType, 'history'>, { key: string, label: string }[]> = {
    items: [
        { key: 'id', label: 'Item Number' },
        { key: 'cost', label: 'Cost' }, 
        { key: 'stockQuantity', label: 'Stock Qty' },
        { key: 'thirdId', label: '3rd Item No' },
        { key: 'name', label: 'Description' },
        { key: 'description2', label: 'Desc Line 2' },
        { key: 'fullName', label: 'Full Name' },
        { key: 'category', label: 'Category' },
        { key: 'brand', label: 'Brand' },
        { key: 'modelNo', label: 'Model No (طراز)' },
        { key: 'oem', label: 'OEM' },
        { key: 'partNumber', label: 'Part No' },
        { key: 'unit', label: 'UM' }
    ],
    locations: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Site Email' }
    ],
    sectors: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' }
    ],
    divisions: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'sectorId', label: 'Parent Sector' }
    ],
    plans: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Plan Name' }
    ],
    orgStructure: [
        { key: 'id', label: 'ID' },
        { key: 'locationId', label: 'Location' },
        { key: 'sectorId', label: 'Sector' },
        { key: 'divisionId', label: 'Division' }
    ],
    failureTypes: [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Failure Name' },
        { key: 'definition', label: 'Definition' },
        { key: 'cause', label: 'Cause' },
        { key: 'action', label: 'Action' },
        { key: 'applicableAssetType', label: 'Applicable Asset' },
        { key: 'mandatory', label: 'Mandatory?' },
        { key: 'active', label: 'Active?' }
    ]
};

const MasterData: React.FC<MasterDataProps> = ({
    history, items, machines, locations, sectors, divisions, plans, orgStructures, failureTypes,
    onAddItem, onAddMachine, onAddLocation, onAddSector, onAddDivision, onAddPlan, onAddOrgStructure, onAddFailureType,
    onUpdateItem, onUpdateMachine, onUpdateLocation, onUpdateSector, onUpdateDivision, onUpdatePlan, onUpdateOrgStructure, onUpdateFailureType,
    onDeleteItems, onDeleteMachines, onDeleteLocations, onDeleteSectors, onDeleteDivisions, onDeletePlans, onDeleteOrgStructures, onDeleteFailureTypes,
    onBulkImport, onRestore
}) => {
    const [activeTab, setActiveTab] = useState<Exclude<TabType, 'history'>>('items');
    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [processingStatus, setProcessingStatus] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [currentPage, setCurrentPage] = useState(1);

    const [searchTerm, setSearchTerm] = useState('');

    const [syncConfig, setSyncConfig] = useState<Record<string, { sheetId: string; gid: string }>>(() => {
        try {
            const saved = localStorage.getItem('wf_sync_config_v2');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error(e); }

        return {
            items: { sheetId: DEFAULT_SHEET_ID, gid: DEFAULT_ITEMS_GID }
        };
    });

    const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('wf_script_url_v3') || DEFAULT_SCRIPT_URL);
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    const [columnSettings, setColumnSettings] = useState<Record<Exclude<TabType, 'history'>, { key: string; label: string; visible: boolean }[]>>(() => {
        const defaults: Record<string, any> = {};
        (Object.keys(COLUMNS_CONFIG) as Exclude<TabType, 'history'>[]).forEach(tab => {
            defaults[tab] = COLUMNS_CONFIG[tab].map(c => ({ ...c, visible: true }));
        });
        const saved = localStorage.getItem('wf_column_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const merged: Record<string, any> = { ...defaults };
                Object.keys(defaults).forEach(key => {
                    if (parsed[key]) {
                        const savedKeys = new Set(parsed[key].map((c: any) => c.key));
                        const updatedSavedColumns = parsed[key].map((savedCol: any) => {
                            const freshCol = defaults[key].find((d: any) => d.key === savedCol.key);
                            return freshCol ? { ...savedCol, label: freshCol.label } : savedCol;
                        });
                        const newColumns = defaults[key].filter((c: any) => !savedKeys.has(c.key));
                        merged[key] = [...updatedSavedColumns, ...newColumns];
                    }
                });
                return merged;
            } catch (e) {
                console.error("Failed to load column settings", e);
            }
        }
        return defaults;
    });

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const currentData = useMemo(() => {
        let data: any[] = [];
        switch (activeTab) {
            case 'items': data = items; break;
            case 'locations': data = locations; break;
            case 'sectors': data = sectors; break;
            case 'divisions': data = divisions; break;
            case 'plans': data = plans; break;
            case 'orgStructure': data = orgStructures; break;
            case 'failureTypes': data = failureTypes; break;
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(item => {
                if (activeTab === 'items') {
                    const i = item as Item;
                    return (
                        (i.id || '').toLowerCase().includes(lowerTerm) ||
                        (i.name || '').toLowerCase().includes(lowerTerm) ||
                        (i.partNumber || '').toLowerCase().includes(lowerTerm) ||
                        (i.modelNo || '').toLowerCase().includes(lowerTerm) ||
                        (i.fullName || '').toLowerCase().includes(lowerTerm) ||
                        (i.category || '').toLowerCase().includes(lowerTerm)
                    );
                }

                const keys = Object.keys(item);
                return keys.some(key => {
                    const val = item[key];
                    if (val === null || val === undefined) return false;
                    return String(val).toLowerCase().includes(lowerTerm);
                });
            });
        }

        return data;
    }, [activeTab, items, locations, sectors, divisions, plans, orgStructures, failureTypes, searchTerm]);

    useEffect(() => {
        localStorage.setItem('wf_sync_config_v2', JSON.stringify(syncConfig));
    }, [syncConfig]);

    useEffect(() => { localStorage.setItem('wf_script_url_v3', scriptUrl); }, [scriptUrl]);
    useEffect(() => { localStorage.setItem('wf_column_settings', JSON.stringify(columnSettings)); }, [columnSettings]);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
        setSyncMsg(''); 
    }, [activeTab, searchTerm]);


    const handleSheetUrlPaste = (val: string) => {
        const extractedId = extractSheetIdFromUrl(val);
        const extractedGid = extractGidFromUrl(val);

        setSyncConfig(prev => {
            const currentForTab = prev[activeTab] || { sheetId: '', gid: '' };
            return {
                ...prev,
                [activeTab]: {
                    sheetId: extractedId || currentForTab.sheetId,
                    gid: extractedGid || currentForTab.gid
                }
            };
        });
    };

    const handleAutoConfigFromSheet = async () => {
        const currentId = syncConfig[activeTab]?.sheetId || '';
        if (!currentId) {
            setSyncMsg("Error: Enter Sheet ID first.");
            return;
        }

        const cleanId = extractSheetIdFromUrl(currentId);

        if (!confirm(`This will try to read the FIRST tab (GID=0) of the sheet to find GID mappings for ALL tabs.\n\nEnsure your first tab has two columns:\nColumn A: Tab Name (e.g. 'items', 'machines')\nColumn B: GID (e.g. '123456')`)) {
            return;
        }

        setSyncLoading(true);
        setSyncMsg("Reading Master Config (GID=0)...");

        try {
            const rows = await fetchRawCSV(cleanId, '0');
            if (!rows || rows.length === 0) {
                throw new Error("Config tab is empty or unreadable.");
            }

            const newConfig = { ...syncConfig };
            let foundCount = 0;

            rows.forEach(row => {
                if (row.length < 2) return;
                const key = row[0].toString().toLowerCase().trim();
                const val = row[1].toString().trim();

                if (['items', 'machines', 'locations', 'sectors', 'divisions', 'plans', 'history', 'orgStructure', 'failureTypes'].includes(key) && val) {
                    newConfig[key] = {
                        sheetId: cleanId,
                        gid: val
                    };
                    foundCount++;
                }
            });

            if (foundCount === 0) {
                setSyncMsg("No valid config rows found. Check spelling in Column A.");
            } else {
                setSyncConfig(newConfig);
                setSyncMsg(`Success! Configured ${foundCount} tabs automatically.`);
            }

        } catch (e) {
            console.error(e);
            setSyncMsg("Auto-Config Failed: " + (e as Error).message);
        } finally {
            setSyncLoading(false);
        }
    };

    const prepareTabForBackup = (tabName: string): any[][] => {
        let data: any[] = [];
        let columns: { key: string, label: string }[] = [];

        switch (tabName) {
            case 'items': data = items; columns = COLUMNS_CONFIG['items']; break;
            case 'locations': data = locations; columns = COLUMNS_CONFIG['locations']; break;
            case 'sectors': data = sectors; columns = COLUMNS_CONFIG['sectors']; break;
            case 'divisions': data = divisions; columns = COLUMNS_CONFIG['divisions']; break;
            case 'plans': data = plans; columns = COLUMNS_CONFIG['plans']; break;
            case 'orgStructure': data = orgStructures; columns = COLUMNS_CONFIG['orgStructure']; break;
            case 'failureTypes': data = failureTypes; columns = COLUMNS_CONFIG['failureTypes']; break;
        }

        if (data.length === 0) return [];

        const headers = columns.map(c => c.label);
        const rows = data.map(item => columns.map(col => {
            const val = item[col.key];
            return Array.isArray(val) ? val.join(';') : (val === undefined || val === null ? "" : String(val));
        }));

        return [headers, ...rows];
    };

    const handleCloudBackup = async () => {
        if (!scriptUrl) {
            setSyncMsg("Error: Configure Web App URL first.");
            return;
        }

        if (!confirm("⚠️ Backup All Master Data?\n\nThis will OVERWRITE the data in your Google Sheet with the data currently in this app.")) {
            return;
        }

        setSyncLoading(true);
        setSyncMsg("Starting Full Backup...");

        const tabsToBackup = ['items', 'locations', 'sectors', 'divisions', 'plans', 'orgStructure', 'failureTypes'];
        let successCount = 0;
        let errors: string[] = [];

        for (const tab of tabsToBackup) {
            try {
                setSyncMsg(`Backing up ${tab}...`);
                const rows = prepareTabForBackup(tab);

                if (rows.length > 0) {
                    await backupTabToSheet(scriptUrl, tab, rows);
                    successCount++;
                }
                await new Promise(r => setTimeout(r, 500));

            } catch (e: any) {
                console.error(`Backup failed for ${tab}`, e);
                errors.push(`${tab}: ${e.message}`);
            }
        }

        setSyncLoading(false);
        if (errors.length > 0) {
            setSyncMsg(`Backup Finished. Errors: ${errors.join(', ')}`);
        } else {
            setSyncMsg(`✅ Full Backup Complete! ${successCount} tabs updated.`);
        }
    };

    const handleRestoreClick = async () => {
        if (!onRestore) {
            alert("Restore function not available.");
            return;
        }
        if (!scriptUrl) {
            setSyncMsg("Error: Configure Web App URL first.");
            return;
        }
        if (!confirm("⚠️ RESTORE FROM CLOUD?\n\nThis will OVERWRITE all local data (Items, Machines, History, etc.) with the data currently in your Google Sheet.\n\nAre you sure?")) return;

        setSyncLoading(true);
        setSyncMsg("Restoring all data from cloud...");
        try {
            await onRestore();
            setSyncMsg("✅ Restore Complete! Page refreshing...");
            setTimeout(() => window.location.reload(), 1500);
        } catch (e: any) {
            console.error(e);
            setSyncMsg("❌ Restore Failed: " + e.message);
            setSyncLoading(false);
        }
    };

    const handleAddNew = () => {
        setFormData({});
        setIsEditing(false);
        setShowForm(true);
    };

    const handleEdit = (record: any) => {
        setFormData({ ...record });
        setIsEditing(true);
        setShowForm(true);
    };

    const handleDeleteSingle = (id: string) => {
        if (confirm('Are you sure you want to remove this record?')) {
            handleDeleteImplementation([id]);
        }
    };

    const handleBulkDelete = () => {
        const ids = Array.from(selectedIds) as string[];
        if (ids.length === 0) return;

        if (confirm(`Are you sure you want to delete ${ids.length} records? This cannot be undone.`)) {
            handleDeleteImplementation(ids);
            setSelectedIds(new Set());
        }
    };

    const handleDeleteImplementation = (ids: string[]) => {
        switch (activeTab) {
            case 'items': onDeleteItems(ids); break;
            case 'locations': onDeleteLocations(ids); break;
            case 'sectors': onDeleteSectors(ids); break;
            case 'divisions': onDeleteDivisions(ids); break;
            case 'plans': onDeletePlans(ids); break;
            case 'orgStructure': onDeleteOrgStructures(ids); break;
            case 'failureTypes': onDeleteFailureTypes(ids); break;
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSelectAllPage = (pageItems: any[]) => {
        const allSelected = pageItems.every(item => selectedIds.has(item.id));
        const newSet = new Set(selectedIds);
        if (allSelected) {
            pageItems.forEach(item => newSet.delete(item.id));
        } else {
            pageItems.forEach(item => newSet.add(item.id));
        }
        setSelectedIds(newSet);
    };

    const handleSelectAllGlobal = () => {
        const allIds = currentData.map((item: any) => String(item.id));
        setSelectedIds(new Set(allIds));
    };

    const handleSyncData = async (targetTab: string = activeTab) => {
        setSyncLoading(true);
        setSyncMsg(`Fetching ${targetTab} data...`);

        const config = syncConfig[targetTab] || { sheetId: '', gid: '' };

        if (!config.sheetId) {
            setSyncMsg(`Error: No Sheet ID for ${targetTab}.`);
            setSyncLoading(false);
            return;
        }

        try {
            const cleanId = extractSheetIdFromUrl(config.sheetId);
            const currentGid = config.gid || '0';

            const rawRows = await fetchRawCSV(cleanId, currentGid);

            if (!rawRows || rawRows.length < 2) {
                setSyncMsg(`No data found for ${targetTab}. Check ID/GID.`);
            } else {
                processImportData(rawRows, targetTab);
                setSyncMsg(`${targetTab} Sync Complete!`);
            }
        } catch (e) {
            setSyncMsg(`Error syncing ${targetTab}: ` + (e as Error).message);
        } finally {
            if (targetTab === activeTab) setSyncLoading(false); 
        }
    };

    const handleExportDataToExcel = (onlySelected: boolean = false) => {
        let headers: string[] = [];
        let rows: any[][] = [];
        const timestamp = new Date().toISOString().slice(0, 10);
        let data: any[] = [];

        switch (activeTab) {
            case 'items': data = items; break;
            case 'locations': data = locations; break;
            case 'sectors': data = sectors; break;
            case 'divisions': data = divisions; break;
            case 'plans': data = plans; break;
            case 'orgStructure': data = orgStructures; break;
            case 'failureTypes': data = failureTypes; break;
        }

        if (onlySelected && selectedIds.size > 0) {
            data = data.filter(d => selectedIds.has(d.id));
        }
        if (data.length === 0) {
            alert("No data to export.");
            return;
        }

        switch (activeTab) {
            case 'items':
                headers = ['Item Number', 'Description', 'Category', 'Unit', '3rd Item No', 'Desc Line 2', 'Full Name', 'Brand', 'OEM', 'Part No', 'Model No', 'Stock Qty'];
                rows = data.map((i: Item) => [
                    i.id, i.name, i.category, i.unit,
                    i.thirdId, i.description2, i.fullName, i.brand, i.oem, i.partNumber, i.modelNo, i.stockQuantity
                ]);
                break;
            case 'locations':
                headers = ['ID', 'Name', 'Email'];
                rows = data.map((l: Location) => [l.id, l.name, l.email]);
                break;
            case 'sectors':
                headers = ['ID', 'Name'];
                rows = data.map((s: Sector) => [s.id, s.name]);
                break;
            case 'divisions':
                headers = ['ID', 'Name', 'Sector ID'];
                rows = data.map((d: Division) => [d.id, d.name, d.sectorId]);
                break;
            case 'plans':
                headers = ['ID', 'Plan Name'];
                rows = data.map((p: MaintenancePlan) => [p.id, p.name]);
                break;
            case 'orgStructure':
                headers = ['ID', 'Location ID', 'Sector ID', 'Division ID'];
                rows = data.map((o: OrgStructure) => [o.id, o.locationId, o.sectorId, o.divisionId]);
                break;
            case 'failureTypes':
                headers = ['Code', 'Name', 'Definition', 'Cause', 'Action', 'Asset Type', 'Mandatory', 'Active'];
                rows = data.map((f: FailureType) => [f.code, f.name, f.definition, f.cause, f.action, f.applicableAssetType, f.mandatory, f.active]);
                break;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, "MasterData");
        XLSX.writeFile(wb, `WareFlow_${activeTab}_${onlySelected ? 'Selected' : 'All'}_${timestamp}.xlsx`);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setProcessingStatus(`Reading ${file.name}...`);
        const reader = new FileReader();
        reader.onload = (e) => {
            setTimeout(() => {
                const data = e.target?.result;
                try {
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                    if (jsonData.length > 2000) {
                        setProcessingStatus(`Large file detected. Processing ${jsonData.length} rows... this may take a moment.`);
                    } else {
                        setProcessingStatus(`Analyzing ${jsonData.length} rows...`);
                    }
                    setTimeout(() => { processImportData(jsonData, activeTab); }, 50);
                } catch (error) {
                    console.error("Error parsing file:", error);
                    setProcessingStatus(null);
                    alert("Error parsing file. Please check format.");
                }
            }, 50);
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    };

    const processImportData = (rows: any[][], targetTab: string) => {
        if (!rows || rows.length < 2) {
            if (targetTab === activeTab) {
                setProcessingStatus(null);
                if (processingStatus) alert("File/Sheet appears to be empty.");
            }
            return;
        }

        let headerRowIndex = -1;
        const primaryKeywords = targetTab === 'history' ? ['id', 'date', 'location'] :
            ['id', 'item number', 'item no', 'name', 'description'];

        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const rowStr = rows[i].join(' ').toLowerCase();
            if (primaryKeywords.some(k => rowStr.includes(k))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) headerRowIndex = 0;

        const headers = rows[headerRowIndex].map(h => String(h).trim().toLowerCase());
        const dataRows = rows.slice(headerRowIndex + 1);

        let fieldMap: Record<string, string[]> = {};
        if (targetTab === 'items') {
            fieldMap = {
                id: ['item number', 'id', 'item no', 'code', 'item code'],
                name: ['description', 'name', 'item name', 'desc', 'material name'],
                category: ['category', 'cat', 'group'],
                unit: ['unit', 'um', 'uom', 'measure'],
                thirdId: ['3rd item no', '3rd item', 'third item'],
                description2: ['desc line 2', 'description 2', 'desc 2', 'spec'],
                fullName: ['full name', 'fullname', 'long description'],
                brand: ['brand', 'manufacturer', 'make'],
                oem: ['oem'],
                partNumber: ['part no', 'part number', 'pn', 'part num'],
                modelNo: ['model no', 'model', 'model number', 'طراز'],
                stockQuantity: ['stock', 'qty', 'stock qty', 'quantity', 'balance']
            };
        } else if (targetTab === 'locations') {
            fieldMap = {
                id: ['id', 'location id', 'zone id'],
                name: ['name', 'location name', 'zone'],
                email: ['email', 'site email', 'contact']
            };
        } else if (targetTab === 'sectors') {
            fieldMap = { id: ['id'], name: ['name', 'sector name'] };
        } else if (targetTab === 'divisions') {
            fieldMap = { id: ['id'], name: ['name', 'division name'], sectorId: ['sector id', 'sector'] };
        } else if (targetTab === 'plans') {
            fieldMap = { id: ['id'], name: ['name', 'plan name', 'plan'] };
        } else if (targetTab === 'orgStructure') {
            fieldMap = {
                id: ['id'],
                locationId: ['location id', 'location'],
                sectorId: ['sector id', 'sector'],
                divisionId: ['division id', 'division']
            };
        } else if (targetTab === 'failureTypes') {
            fieldMap = {
                code: ['code', 'id'],
                name: ['name', 'failure name'],
                definition: ['definition', 'desc'],
                cause: ['cause', 'failure cause'],
                action: ['action', 'failure action'],
                applicableAssetType: ['applicable asset', 'asset type'],
                mandatory: ['mandatory'],
                active: ['active']
            };
        }

        const colIndexMap: Record<string, number> = {};
        Object.keys(fieldMap).forEach(fieldKey => {
            const candidates = fieldMap[fieldKey];
            const index = headers.findIndex(h => candidates.some(c => h === c));
            if (index !== -1) colIndexMap[fieldKey] = index;
        });

        const idKey = targetTab === 'failureTypes' ? 'code' : 'id';

        if (colIndexMap[idKey] === undefined && targetTab !== 'history') {
            setProcessingStatus(null);
            if (targetTab === activeTab) alert(`Could not find a column for '${idKey}'. Checked headers: ${headers.join(', ')}`);
            return;
        }

        let addedCount = 0;
        let updatedCount = 0;
        const toAdd: any[] = [];
        const toUpdate: any[] = [];

        dataRows.forEach((row: any[], rowIndex: number) => {
            if (!row || row.length === 0) return;
            const getIdValue = (idx: number) => {
                if (row[idx] !== undefined && row[idx] !== null) return String(row[idx]).trim();
                return '';
            };

            const idVal = colIndexMap[idKey] !== undefined ? getIdValue(colIndexMap[idKey]) : '';
            if (!idVal && targetTab !== 'history') {
                console.warn(`[Import] Skipping row ${rowIndex + headerRowIndex + 2} because it lacks an ${idKey}`);
                return;
            }

            let payload: any = {};
            Object.keys(colIndexMap).forEach(key => {
                const idx = colIndexMap[key];
                if (row[idx] !== undefined && row[idx] !== null) payload[key] = String(row[idx]).trim();
            });

            if (targetTab === 'items') {
                if (!payload.name && !payload.description) payload.name = 'Unnamed Item';
                if (!payload.category) payload.category = 'General';
                if (!payload.unit) payload.unit = 'pcs';
                if (payload.stockQuantity) payload.stockQuantity = Number(payload.stockQuantity);
            }

            const list = targetTab === 'items' ? items :
                targetTab === 'machines' ? machines :
                    targetTab === 'locations' ? locations :
                        targetTab === 'sectors' ? sectors :
                            targetTab === 'divisions' ? divisions :
                                targetTab === 'plans' ? plans :
                                    targetTab === 'orgStructure' ? orgStructures :
                                        targetTab === 'failureTypes' ? failureTypes :
                                            history;

            const exists = list.find((item: any) => item[idKey] === (payload[idKey] || idVal));

            if (exists) {
                toUpdate.push({ ...exists, ...payload });
                updatedCount++;
            } else {
                toAdd.push(payload);
                addedCount++;
            }
        });

        onBulkImport(targetTab, toAdd, toUpdate);
        setProcessingStatus(null);

        if (targetTab === activeTab && processingStatus) {
            setTimeout(() => { alert(`Import Complete!\n\nTotal Processed: ${dataRows.length}\nAdded: ${addedCount}\nUpdated: ${updatedCount}`); }, 100);
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLTableHeaderCellElement>, position: number) => {
        dragItem.current = position;
    };

    const handleDragEnter = (e: React.DragEvent<HTMLTableHeaderCellElement>, position: number) => {
        dragOverItem.current = position;
    };

    const handleDrop = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const currentColumns = [...columnSettings[activeTab]];
        const visibleCols = currentColumns.filter(c => c.visible);
        const itemToMove = visibleCols[dragItem.current];
        const itemTarget = visibleCols[dragOverItem.current];
        const realFromIndex = currentColumns.findIndex(c => c.key === itemToMove.key);
        const realToIndex = currentColumns.findIndex(c => c.key === itemTarget.key);
        currentColumns.splice(realFromIndex, 1);
        currentColumns.splice(realToIndex, 0, itemToMove);
        dragItem.current = null;
        dragOverItem.current = null;
        setColumnSettings(prev => ({
            ...prev,
            [activeTab]: currentColumns
        }));
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (activeTab === 'orgStructure') {
            if (!formData.locationId || !formData.sectorId || !formData.divisionId) {
                alert("Please select Location, Sector, and Division.");
                return;
            }

            const div = divisions.find(d => d.id === formData.divisionId);
            if (div && div.sectorId && div.sectorId !== formData.sectorId) {
                const sectorName = sectors.find(s => s.id === formData.sectorId)?.name || 'the selected sector';
                const divName = div.name;
                const correctSector = sectors.find(s => s.id === div.sectorId)?.name || div.sectorId;
                if (!confirm(`Warning: Division "${divName}" is originally linked to Sector "${correctSector}". Are you sure you want to map it to "${sectorName}" in this organizational structure?`)) {
                    return;
                }
            }
        }

        const payload = { ...formData };
        if (activeTab === 'items' && payload.stockQuantity) payload.stockQuantity = Number(payload.stockQuantity);

        if (isEditing) {
            switch (activeTab) {
                case 'items': onUpdateItem(payload); break;
                case 'locations': onUpdateLocation(payload); break;
                case 'sectors': onUpdateSector(payload); break;
                case 'divisions': onUpdateDivision(payload); break;
                case 'plans': onUpdatePlan(payload); break;
                case 'orgStructure': onUpdateOrgStructure(payload); break;
                case 'failureTypes': onUpdateFailureType(payload); break;
            }
        } else {
            switch (activeTab) {
                case 'items': onAddItem(payload); break;
                case 'locations': onAddLocation(payload); break;
                case 'sectors': onAddSector(payload); break;
                case 'divisions': onAddDivision(payload); break;
                case 'plans': onAddPlan(payload); break;
                case 'orgStructure': onAddOrgStructure(payload); break;
                case 'failureTypes': onAddFailureType(payload); break;
            }
        }
        setShowForm(false);
    };

    const renderForm = () => {
        if (!showForm) return null;
        const fields = COLUMNS_CONFIG[activeTab];
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit' : 'Add New'} {activeTab.slice(0, -1)}</h3>
                        <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition">✕</button>
                    </div>
                    <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.map(field => {
                                const val = formData[field.key];
                                const displayVal = Array.isArray(val) ? val.join(', ') : (val || '');

                                if (activeTab === 'orgStructure' && field.key !== 'id') {
                                    let options: { id: string, label: string }[] = [];
                                    if (field.key === 'locationId') {
                                        options = locations.map(l => ({ id: l.id, label: l.name }));
                                    } else if (field.key === 'sectorId') {
                                        options = sectors.map(s => ({ id: s.id, label: s.name }));
                                    } else if (field.key === 'divisionId') {
                                        options = divisions.map(d => ({ id: d.id, label: d.name }));
                                    }

                                    return (
                                        <div key={field.key} className="space-y-1">
                                            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                                            <SearchableSelect
                                                label=""
                                                options={options}
                                                value={displayVal}
                                                onChange={(v) => setFormData({ ...formData, [field.key]: v })}
                                                placeholder={`Select ${field.label}`}
                                            />
                                        </div>
                                    );
                                }

                                return (
                                    <div key={field.key} className={field.key === 'name' || field.key === 'fullName' ? "md:col-span-2 space-y-1" : "space-y-1"}>
                                        <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                                        <input
                                            type={field.key === 'stockQuantity' ? 'number' : 'text'}
                                            value={displayVal}
                                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            placeholder={`Enter ${field.label}`}
                                            disabled={isEditing && (field.key === 'id')}
                                            required={field.key === 'id'}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium transition">{isEditing ? 'Save Changes' : 'Create Record'}</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const renderTable = () => {
        const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const currentItems = currentData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        const visibleColumns = columnSettings[activeTab].filter(c => c.visible);

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-10 text-center">
                                    <input type="checkbox" checked={currentItems.length > 0 && currentItems.every(i => selectedIds.has((i as any).id))} onChange={() => handleSelectAllPage(currentItems)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                </th>
                                {visibleColumns.map((col, index) => (
                                    <th key={col.key} className="px-4 py-3 cursor-move hover:bg-gray-100 select-none" draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDrop} onDragOver={(e) => e.preventDefault()}>{col.label}</th>
                                ))}
                                <th className="px-4 py-3 text-right bg-gray-50 sticky right-0 shadow-sm border-l">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentItems.map((item) => {
                                const anyItem = item as any;
                                const itemId = anyItem.id;
                                return (
                                    <tr key={itemId} className="hover:bg-blue-50 transition-colors">
                                        <td className="px-4 py-2 text-center"><input type="checkbox" checked={selectedIds.has(itemId)} onChange={() => toggleSelection(itemId)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></td>
                                        {visibleColumns.map(col => <td key={col.key} className="px-4 py-2 text-gray-600">{Array.isArray(anyItem[col.key]) ? anyItem[col.key].join(', ') : (anyItem[col.key] || '-')}</td>)}
                                        <td className="px-4 py-2 text-right sticky right-0 bg-white group-hover:bg-blue-50 border-l border-gray-100 flex items-center justify-end gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Edit">✏️</button>
                                            <button onClick={() => handleDeleteSingle(itemId)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Delete">🗑️</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {currentItems.length === 0 && <tr><td colSpan={visibleColumns.length + 2} className="px-6 py-12 text-center text-gray-400">No records found in {activeTab}.</td></tr>}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50 hover:bg-gray-100">Previous</button>
                        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages} ({currentData.length} items)</span>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-50 hover:bg-gray-100">Next</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full space-y-4 font-sans animate-fade-in-up">
            {/* Header and Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

                {/* Tabs */}
                <div className="flex overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 gap-2 scrollbar-hide">
                    {(['items', 'locations', 'sectors', 'divisions', 'plans', 'orgStructure', 'failureTypes'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize whitespace-nowrap transition-all ${activeTab === tab
                                ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Sync Controls */}
                <div className="flex items-center gap-2 bg-blue-50 p-1.5 rounded-lg border border-blue-100 w-full lg:w-auto">
                    <input
                        type="text"
                        className="text-xs bg-white border border-blue-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-400 focus:outline-none w-full lg:w-48 text-blue-800 placeholder-blue-300"
                        placeholder="Paste Sheet URL / ID for this tab..."
                        value={syncConfig[activeTab]?.sheetId || ''}
                        onChange={(e) => handleSheetUrlPaste(e.target.value)}
                    />
                    <button
                        onClick={() => handleSyncData()}
                        disabled={syncLoading}
                        className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                        title={`Sync ${activeTab} from Google Sheet`}
                    >
                        {syncLoading ? <span className="animate-spin text-lg">↻</span> : <span>⬇️</span>}
                    </button>
                    <button
                        onClick={handleAutoConfigFromSheet}
                        className="p-1.5 bg-white text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition"
                        title="Auto-detect Config from Sheet (GID 0)"
                    >
                        🪄
                    </button>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm gap-3">
                <div className="flex gap-2 items-center w-full md:w-auto shrink-0">
                    <button onClick={handleAddNew} className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95">
                        <span>+</span> Add New
                    </button>
                    {selectedIds.size > 0 && (
                        <>
                            <button onClick={handleBulkDelete} className="flex-1 md:flex-none px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 border border-red-100 flex items-center justify-center gap-2">
                                <span>🗑️</span> Delete ({selectedIds.size})
                            </button>
                            {selectedIds.size < currentData.length && (
                                <button onClick={handleSelectAllGlobal} className="flex-1 md:flex-none px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 border border-blue-100 flex items-center justify-center gap-2">
                                    <span>☑️</span> Select All {currentData.length}
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className="relative flex-1 w-full md:max-w-md mx-auto min-w-[200px]">
                    <input
                        type="text"
                        placeholder={activeTab === 'items' ? "Search Name or Code..." : `Search ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 shrink-0">
                    <button onClick={handleRestoreClick} disabled={syncLoading} className="whitespace-nowrap px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-bold hover:bg-yellow-100 border border-yellow-200 flex items-center gap-1">
                        <span>📥</span> Restore Cloud
                    </button>
                    <button onClick={() => handleExportDataToExcel(false)} className="whitespace-nowrap px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 border border-green-200 flex items-center gap-1">
                        <span>📊</span> Export
                    </button>
                    <button onClick={handleImportClick} className="whitespace-nowrap px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-100 border border-orange-200 flex items-center gap-1">
                        <span>📂</span> Import
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileChange} />
                </div>
            </div>

            {/* Sync Status / Messages */}
            {syncMsg && (
                <div className={`text-xs px-4 py-3 rounded-lg border flex items-center gap-2 animate-fade-in ${syncMsg.includes('Error') || syncMsg.includes('Failed') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    <span className="text-lg">{syncMsg.includes('Error') ? '⚠️' : 'ℹ️'}</span>
                    {syncMsg}
                </div>
            )}

            {/* The Data Table */}
            <div className="flex-1 overflow-hidden">
                {renderTable()}
            </div>

            {/* Modals */}
            {renderForm()}

        </div>
    );
};

export default MasterData;