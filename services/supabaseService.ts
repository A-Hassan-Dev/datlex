import { supabase } from './supabaseClient';

const tableMap: Record<string, string> = {
    'items': 'items',
    'machines': 'machines',
    'locations': 'locations',
    'sectors': 'sectors',
    'divisions': 'divisions',
    'plans': 'maintenance_plans',
    'users': 'users',
    'history': 'issues',
    'breakdowns': 'breakdowns',
    'bomRecords': 'bom',
    'agriOrders': 'agri_orders',
    'irrigationLogs': 'irrigation_logs',
    'forecastPeriods': 'forecast_periods',
    'forecastRecords': 'forecast_records',
    'tasks': 'maintenance_tasks',
    'schedules': 'maintenance_schedules',
    'workOrders': 'maintenance_work_orders',
    'assetTransfers': 'asset_transfers',
    'transferHistory': 'machine_transfer_history',
    'warrantyRecords': 'warranty_management', // Fixed: was warranty_records
    'warrantyReceivings': 'warranty_receiving_data', // Fixed: was warranty_receivings
    'orgStructures': 'org_structure',
    'failureTypes': 'failure_types',
    'issuePlanPeriods': 'issue_plan_periods',
    'issuePlanEntries': 'issue_plan_entries'
};

const toSnakeCase = (str: string) => {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const toCamelCase = (str: string): string => {
    return str.replace(/([-_][a-z])/g, group =>
        group.toUpperCase().replace('-', '').replace('_', '')
    );
};

const processRecordToSupabase = (record: any, tableName: string) => {
    const processed: any = {};
    for (const key in record) {
        let val = record[key];
        const colName = toSnakeCase(key);

        if (Array.isArray(val) && ['allowedLocationIds', 'allowedSectorIds', 'allowedDivisionIds', 'allowedMenus'].includes(key)) {
            val = val.join(',');
        }

        if (val === null || val === undefined || val === '') {
            if (colName === 'name') {
                val = 'Unnamed'; // Default name for items/machines
            } else if (colName === 'status') {
                val = 'Active'; // Default status
            } else if (colName === 'category') {
                val = 'General'; // Default category
            }
        }

        processed[colName] = val;
    }

    if (tableName === 'items' && !processed['name']) {
        processed['name'] = 'Unnamed Item';
    } else if (tableName === 'machines' && !processed['status']) {
        processed['status'] = 'Working';
    }

    return processed;
};

const processRecordFromSupabase = (record: any) => {
    const processed: any = {};
    for (const key in record) {
        const camelKey = toCamelCase(key);
        let val = record[key];

        if (['allowedLocationIds', 'allowedSectorIds', 'allowedDivisionIds', 'allowedMenus'].includes(camelKey) && typeof val === 'string') {
            processed[camelKey] = val ? val.split(',') : [];
        } else {
            processed[camelKey] = val;
        }
    }
    return processed;
};

export const fetchAllSupabaseData = async () => {
    const data: Record<string, any[]> = {};

    try {
        const fetchPromises = Object.entries(tableMap).map(async ([frontendKey, supabaseTable]) => {
            const { data: rows, error } = await supabase.from(supabaseTable).select('*');
            if (error) {
                console.error(`Error fetching ${supabaseTable}:`, error);
                return { [frontendKey]: [] };
            }
            return { [frontendKey]: rows.map(processRecordFromSupabase) };
        });

        const results = await Promise.all(fetchPromises);
        results.forEach(res => {
            Object.assign(data, res);
        });

        return data;
    } catch (error) {
        console.error("Supabase fetch failed:", error);
        return null;
    }
};

export const upsertSupabaseRecord = async (frontendTable: string, data: any) => {
    const supabaseTable = tableMap[frontendTable];
    if (!supabaseTable) {
        console.error(`❌ Unknown table: ${frontendTable}`);
        return { status: "error", message: "Unknown table" };
    }

    try {
        const processedData = processRecordToSupabase(data, supabaseTable);

        const pk = (frontendTable === 'users') ? 'username' : 'id';

        console.log(`💾 Saving to ${supabaseTable}:`, data.id || data.username);

        const { error } = await supabase
            .from(supabaseTable)
            .upsert(processedData, { onConflict: pk });

        if (error) throw error;

        console.log(`✅ Saved to ${supabaseTable}:`, data.id || data.username);
        return { status: "success" };
    } catch (error: any) {
        console.error(`❌ Failed to save to ${supabaseTable}:`, error.message);
        return { status: "error", message: error.message };
    }
};

export const deleteSupabaseRecord = async (frontendTable: string, id: string) => {
    const supabaseTable = tableMap[frontendTable];
    if (!supabaseTable) {
        console.error(`Unknown table: ${frontendTable}`);
        return { status: "error", message: "Unknown table" };
    }

    try {
        const pk = (frontendTable === 'users') ? 'username' : 'id';
        const { error } = await supabase
            .from(supabaseTable)
            .delete()
            .eq(pk, id);

        if (error) throw error;
        return { status: "success" };
    } catch (error: any) {
        console.error(`Failed to delete from ${supabaseTable}:`, error.message);
        return { status: "error", message: error.message };
    }
};

export const bulkUpsertSupabaseRecords = async (
    frontendTable: string,
    dataArray: any[],
    onProgress?: (current: number, total: number, batchNum: number, totalBatches: number) => void
) => {
    const supabaseTable = tableMap[frontendTable];
    if (!supabaseTable) {
        console.error(`Unknown table: ${frontendTable}`);
        return { status: "error", message: "Unknown table" };
    }

    if (!dataArray || dataArray.length === 0) return { status: "success", count: 0 };

    const BATCH_SIZE = 100; // Balanced size for large datasets
    const MAX_RETRIES = 3;
    let successCount = 0;
    let failedBatches: { batchNum: number, error: string }[] = [];

    console.log(`[Bulk Upload] Starting upload of ${dataArray.length} records to ${supabaseTable}`);

    try {
        const totalBatches = Math.ceil(dataArray.length / BATCH_SIZE);

        for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
            const chunk = dataArray.slice(i, i + BATCH_SIZE);
            const processedData = chunk.map(item => processRecordToSupabase(item, supabaseTable));

            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            console.log(`[Batch ${batchNum}/${totalBatches}] Uploading ${chunk.length} records...`);

            if (onProgress) {
                onProgress(successCount, dataArray.length, batchNum, totalBatches);
            }

            const pk = (frontendTable === 'users') ? 'username' : 'id';

            let retryCount = 0;
            let batchSuccess = false;

            while (retryCount < MAX_RETRIES && !batchSuccess) {
                try {
                    const { data, error } = await supabase
                        .from(supabaseTable)
                        .upsert(processedData, { onConflict: pk })
                        .select();

                    if (error) {
                        throw new Error(error.message);
                    }

                    if (data) {
                        successCount += data.length;
                        batchSuccess = true;
                        console.log(`[Batch ${batchNum}/${totalBatches}] ✓ Success (${data.length} records)`);

                        if (onProgress) {
                            onProgress(successCount, dataArray.length, batchNum, totalBatches);
                        }
                    }
                } catch (batchError: any) {
                    retryCount++;
                    if (retryCount < MAX_RETRIES) {
                        console.warn(`[Batch ${batchNum}] Retry ${retryCount}/${MAX_RETRIES} after error:`, batchError.message);
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    } else {
                        console.error(`[Batch ${batchNum}] Failed after ${MAX_RETRIES} retries:`, batchError.message);
                        failedBatches.push({ batchNum, error: batchError.message });
                    }
                }
            }

            if (i + BATCH_SIZE < dataArray.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        const finalMessage = `Uploaded ${successCount}/${dataArray.length} records to ${supabaseTable}`;
        console.log(`[Bulk Upload Complete] ${finalMessage}`);

        if (onProgress) {
            onProgress(successCount, dataArray.length, totalBatches, totalBatches);
        }

        if (failedBatches.length > 0) {
            console.error(`[Failed Batches] ${failedBatches.length} batches failed:`, failedBatches);
            return {
                status: "partial",
                count: successCount,
                message: `${successCount}/${dataArray.length} uploaded. ${failedBatches.length} batches failed.`
            };
        }

        return { status: "success", count: successCount };

    } catch (error: any) {
        console.error(`[Bulk Upload Failed] ${error.message}`);
        return { status: "error", message: error.message, count: successCount };
    }
};
