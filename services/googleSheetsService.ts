
import { Item, IssueRecord } from '../types';

export const DEFAULT_SHEET_ID = '2PACX-1vSMVlbr82tagYILVNamzhxIriPF3LAXrMaAHlRlp1-0F98Pfbu6orN0fTh6HDAh2vZP6WUH6LN2spNv';
export const DEFAULT_ITEMS_GID = '229812258'; 
export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxz6P8ZHgg8cN9cJBEL425BcdrjvBUqm59R_IxAwnDrb0MQ8c9iqaU1toNUN6GsAg4vQw/exec';

export const extractSheetIdFromUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  
  const publishedMatch = trimmed.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (publishedMatch) return publishedMatch[1];

  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
};

export const extractGidFromUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/[?&]gid=([0-9]+)/);
  return match ? match[1] : null;
};

export const fetchRawCSV = async (sheetId: string, gid: string): Promise<string[][]> => {
  let url = '';
  const cleanId = sheetId.trim();
  const cleanGid = gid ? gid.trim() : '0';
  
  if (cleanId.startsWith('2PACX')) {
      url = `https://docs.google.com/spreadsheets/d/e/${cleanId}/pub?output=csv`;
      if (cleanGid && cleanGid !== '0') {
         url += `&gid=${cleanGid}&single=true`;
      }
  } else {
      url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&gid=${cleanGid}`;
  }
  
  url += `&_t=${Date.now()}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch. Status: ${response.status}. Check if sheet is "Public" or "Published to Web".`);
    }
    const text = await response.text();

    if (text.trim().toLowerCase().startsWith('<!doctype html') || text.includes('<html')) {
        throw new Error('Received HTML instead of CSV. The sheet is likely private. Please set access to "Anyone with the link" or "Publish to Web".');
    }

    const lines = text.split(/\r?\n/);
    return lines.map(line => parseCSVLine(line));
  } catch (error) {
    throw error;
  }
};

export const fetchItemsFromSheet = async (sheetId: string, gid: string): Promise<Item[]> => {
  const rawRows = await fetchRawCSV(sheetId, gid);
  const csvText = rawRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  return parseItemsCSV(csvText);
};

export const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let cell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i+1] === '"') {
                cell += '"';
                i++; 
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(cell.trim());
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell.trim());
    return result;
};

const parseItemsCSV = (csvText: string): Item[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const cleanHeaders = headers.map(h => h.toLowerCase().replace(/^"|"$/g, '').trim());
  
  const findIdx = (keywords: string[]) => cleanHeaders.findIndex(h => keywords.some(k => h === k || h.includes(k)));

  const idIdx = cleanHeaders.findIndex(h => h === 'item number' || h === 'item no' || h === 'id');
  const nameIdx = cleanHeaders.findIndex(h => h === 'description' || h === 'desc' || h === 'item name');
  
  const id2Idx = findIdx(['2nd item number', '2nd item', 'second item']);
  const id3Idx = findIdx(['3rd item number', '3rd item', 'third item']);
  const desc2Idx = findIdx(['description line 2', 'desc line 2', 'description 2', 'desc 2', 'spec']);
  const fullNameIdx = findIdx(['full name', 'item full name', 'fullname']);
  const oemIdx = findIdx(['oem', 'manufacturer']);
  const partNoIdx = findIdx(['part no', 'part number', 'pn']);
  const umIdx = findIdx(['um', 'unit', 'uom']);
  const catIdx = findIdx(['category', 'family', 'group']); 
  const modelIdx = findIdx(['model no', 'model', 'model number', 'طراز']);

  const items: Item[] = [];

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    if (values.length < 1) continue;

    const cleanValues = values.map(v => v.replace(/^"|"$/g, ''));

    const idVal = idIdx > -1 ? cleanValues[idIdx] : cleanValues[0];
    if (!idVal) continue;
    
    let nameVal = '';
    if (nameIdx > -1 && cleanValues[nameIdx]) nameVal = cleanValues[nameIdx];
    else if (fullNameIdx > -1 && cleanValues[fullNameIdx]) nameVal = cleanValues[fullNameIdx];
    else if (desc2Idx > -1 && cleanValues[desc2Idx]) nameVal = cleanValues[desc2Idx];
    else nameVal = cleanValues[1] || 'Unknown';

    items.push({
      id: idVal,
      name: nameVal,
      category: catIdx > -1 ? cleanValues[catIdx] : 'General',
      unit: umIdx > -1 ? cleanValues[umIdx] : 'pcs',
      secondId: id2Idx > -1 ? cleanValues[id2Idx] : undefined,
      thirdId: id3Idx > -1 ? cleanValues[id3Idx] : undefined,
      description2: desc2Idx > -1 ? cleanValues[desc2Idx] : undefined,
      fullName: fullNameIdx > -1 ? cleanValues[fullNameIdx] : undefined,
      oem: oemIdx > -1 ? cleanValues[oemIdx] : undefined,
      partNumber: partNoIdx > -1 ? cleanValues[partNoIdx] : undefined,
      modelNo: modelIdx > -1 ? cleanValues[modelIdx] : undefined,
    });
  }
  return items;
};

export const sendIssueToSheet = async (scriptUrl: string, issue: IssueRecord) => {
  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      body: JSON.stringify({ action: 'log_issue', ...issue }),
    });
    console.log("Sent to Google Sheet");
  } catch (error) {
    console.error("Failed to send to Google Sheet", error);
  }
};

export const backupTabToSheet = async (scriptUrl: string, tabName: string, rows: any[][]) => {
    try {
        const response = await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'backup_tab', 
                tabName: tabName, 
                rows: rows 
            })
        });
        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const fetchAllDataFromCloud = async (scriptUrl: string): Promise<Record<string, any[]>> => {
    try {
        const response = await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'read_full_db' })
        });
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error("Permission Blocked by Google. Please Redeploy Script and set 'Who has access' to 'Anyone'.");
        }

        const result = await response.json();
        
        if (!result || typeof result !== 'object') {
             throw new Error("Invalid response received from script.");
        }

        if (result.status === 'success') {
            if (!result.data) {
                throw new Error("Script connected but returned no data. Your script code might be outdated. Please Copy Code -> Deploy -> New Version.");
            }
            return result.data;
        } else {
            throw new Error(result.message || "Script connected but returned an error status.");
        }
    } catch (error) {
        console.error("Fetch Data Error:", error);
        throw error;
    }
};

export const uploadFileToDrive = async (scriptUrl: string, fileName: string, base64Data: string): Promise<string> => {
    try {
        const response = await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'upload_file',
                fileName: fileName,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                fileData: base64Data
            })
        });
        
        const result = await response.json();
        if (result.status === 'success') {
            return result.url;
        } else {
            throw new Error(result.message || 'Upload failed');
        }
    } catch (error) {
        console.error("Drive Upload Error:", error);
        return "";
    }
};

export const locateRemoteData = async (scriptUrl: string): Promise<{folderUrl: string, sheetUrl: string, error?: string} | null> => {
    try {
        const response = await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'locate_data' })
        });
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") === -1) {
             const text = await response.text();
             console.error("Received non-JSON response from Script:", text.substring(0, 500));
             return { folderUrl: '', sheetUrl: '', error: 'Script returned HTML. Check Script URL and deployment.' };
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            if (!result.folderUrl) {
                return { folderUrl: '', sheetUrl: '', error: 'Script is outdated. Please update code in Apps Script.' };
            }
            return { folderUrl: result.folderUrl, sheetUrl: result.sheetUrl };
        } else {
             return { folderUrl: '', sheetUrl: '', error: result.message || 'Unknown script error' };
        }
    } catch (error) {
        console.error("Failed to locate data:", error);
        throw new Error((error as Error).message);
    }
}

export const APP_SCRIPT_TEMPLATE = `

var FOLDER_NAME = "WareFlow Reports";
var DB_FILE_NAME = "WareFlow Database";
var SHEET_TAB_NAME = "Main Issue Backup";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);

    if (data.action === "backup_tab") {
        var ss = getOrCreateSpreadsheet();
        var tabName = data.tabName;
        var rows = data.rows; 
        
        if (!tabName || !rows || !Array.isArray(rows)) {
             return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Invalid data format"}));
        }

        var sheet = ss.getSheetByName(tabName);
        if (!sheet) {
            sheet = ss.insertSheet(tabName);
        } else {
            sheet.clear();
        }
        
        if (rows.length > 0) {
            var width = rows[0].length;
            var safeRows = rows.map(function(r) {
               var row = r.slice(0, width);
               while(row.length < width) row.push("");
               return row;
            });
            sheet.getRange(1, 1, safeRows.length, width).setValues(safeRows);
        }
        
        return ContentService.createTextOutput(JSON.stringify({status: "success", count: rows.length}))
            .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "read_full_db") {
        var ss = getOrCreateSpreadsheet();
        var result = {};
        var tabs = ['items', 'machines', 'breakdowns', 'bom', 'history', 'locations', 'sectors', 'divisions', 'plans', 'users', 'agri_orders', 'irrigation_logs', 'forecasts'];
        
        tabs.forEach(function(tabName) {
            var sheet = ss.getSheetByName(tabName);
            if (sheet) {
                var values = sheet.getDataRange().getValues();
                if (values.length > 1) {
                    var headers = values[0];
                    var sheetData = values.slice(1).map(function(row) {
                        var obj = {};
                        headers.forEach(function(h, i) {
                            obj[h] = row[i];
                        });
                        return obj;
                    });
                    result[tabName] = sheetData;
                } else {
                    result[tabName] = [];
                }
            } else {
                result[tabName] = [];
            }
        });
        
        return ContentService.createTextOutput(JSON.stringify({status: "success", data: result}))
            .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "locate_data") {
        var folder = getOrCreateFolder(FOLDER_NAME);
        var ss = getOrCreateSpreadsheet(folder);
        return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            folderUrl: folder.getUrl(),
            sheetUrl: ss.getUrl()
        })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "upload_file") {
        var folder = getOrCreateFolder(FOLDER_NAME);
        var decoded = Utilities.base64Decode(data.fileData);
        var blob = Utilities.newBlob(decoded, data.mimeType, data.fileName);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            url: file.getUrl()
        })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = getOrCreateSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_TAB_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_TAB_NAME);
      sheet.appendRow(["ID", "Date", "Location", "Machine", "Item ID", "Item Name", "Quantity", "Status", "Notes"]);
    }
    
    sheet.appendRow([
      data.id, data.timestamp, data.locationId, data.machineName, 
      data.itemId, data.itemName, data.quantity, data.status, data.notes || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: e.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function getOrCreateSpreadsheet(parentFolder) {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch(e) {}

  var files = DriveApp.getFilesByName(DB_FILE_NAME);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());

  var newSS = SpreadsheetApp.create(DB_FILE_NAME);
  if (parentFolder) {
     DriveApp.getFileById(newSS.getId()).moveTo(parentFolder);
  }
  return newSS;
}
`;
