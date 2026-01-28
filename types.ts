
export interface Item {
  id: string;          
  name: string;        
  category: string;    
  unit: string;        

  secondId?: string;       
  thirdId?: string;        
  description2?: string;   
  fullName?: string;       
  brand?: string;          
  oem?: string;            
  partNumber?: string;     
  modelNo?: string;        
  stockQuantity?: number;  
  quantitiesByLocation?: Record<string, number>; 

  relatedMachineId?: string; 
  locationZone?: string;     
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  leadTimeDays?: number;
  preferredSupplier?: string;
  criticality?: 'High' | 'Medium' | 'Low';
  abcClass?: 'A' | 'B' | 'C';
  status?: 'Active' | 'Obsolete';
  unitCost?: number;         
  annualUsage?: number;      
  cost?: number; 
}

export interface Sector {
  id: string;
  name: string;
}

export interface Division {
  id: string;
  name: string;
  sectorId: string;
}

export interface Machine {
  id: string;
  machineLocalNo?: string;
  status: 'Working' | 'Not Working' | 'Outside Maintenance'; 
  chaseNo: string;       
  modelNo?: string;    
  divisionId?: string;
  locationId?: string; 
  sectorId?: string;   

  mainGroup?: string;
  subGroup?: string;
  category?: string;   
  brand?: string;
  chassisNo?: string; 
}

export interface Location {
  id: string;
  name: string;
  email?: string; 
}

export interface MaintenancePlan {
  id: string;
  name: string; 
}

export interface IssueRecord {
  id: string;
  timestamp: string; 
  locationId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit?: string; 
  machineId: string;
  machineName: string;
  sectorName?: string;
  divisionName?: string;
  maintenancePlan?: string; 
  maintenancePlanId?: string; 
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected' | 'Pending Manager Approval'; 
  notes?: string; 
  warehouseEmail?: string;
  requesterEmail?: string;
  glDate?: string; 
  approvalStatus?: string; 
  locationName?: string;
  machineLocalNo?: string;
  requesterName?: string;
  calculatedTotalCost?: number; 
}

export interface BreakdownRecord {
  id: string;
  machineId: string;
  machineName: string;
  locationId: string; 
  sectorId?: string;
  divisionId?: string; 
  machineLocalNo?: string; 

  startTime: string; 
  endTime?: string; 

  failureType: string; 
  operatorName: string;

  rootCause?: string;
  actionTaken?: string;

  status: 'Open' | 'Closed';
  durationMinutes?: number;
}

export interface BOMRecord {
  id: string;
  machineCategory: string; 
  modelNo: string;         
  brand?: string;          
  itemId: string;          
  quantity: number;        
  maintenanceType?: string; 
  notes?: string;
  sortOrder?: number;      
}

export interface AgriOrderRecord {
  id: string;
  date: string;
  branch: string; 
  tractor: string; 
  machineLocalNo: string; 
  attached: string; 
  attachedLocalNo: string; 
  department: string; 
  pivot: string; 
  driver: string; 

  startCounter: number;
  endCounter: number;
  rowNumber: string;

  unitType: string; 
  achievement: number; 
  actualOrReturn: number; 
  calculated: number; 
  timeSpent: number; 

  notes: string;
  sector?: string; 
  services?: string; 
}

export interface IrrigationLogRecord {
  id: string;
  date: string;
  locationName: string;
  generatorModel: string;
  engineStart: number;
  engineEnd: number;
  totalHours: number;
  notes?: string;
}


export interface ForecastPeriod {
  id: string; 
  name: string; 
  startDate: string; 
  endDate: string; 
  status: 'Open' | 'Closed';
}

export interface ForecastRecord {
  id: string; 
  periodId: string;
  locationId: string;
  sectorId: string;
  divisionId: string;
  itemId: string;
  quantity: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface PurchaseOrder {
  id: string; 
  supplier: string;
  itemId: string;
  orderedQuantity: number;
  expectedDeliveryDate: string; 
  status: 'Open' | 'Partial' | 'Closed';
}


export interface MaintenanceTask {
  id: string;
  description: string;
  type: 'Preventive' | 'Corrective' | 'Predictive';
  machineId: string; 
  machineName: string;
  requiredMroItems: { itemId: string; quantity: number }[]; 
  standardDurationHours: number;
  requiredSkills: string;
  priority: 'High' | 'Medium' | 'Low';
  defaultLocationId: string;
  status: 'Active' | 'Inactive';
}

export interface MaintenanceSchedule {
  id: string;
  taskId: string;
  machineId: string;
  locationId: string;
  plannedStartDate: string; 
  plannedEndDate: string; 
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Condition-based';
  assignedTechnician: string;
  checkMroAvailability: boolean;
  status: 'Planned' | 'Released' | 'Completed' | 'Delayed';
}

export interface MaintenanceWorkOrder {
  id: string; 
  taskId: string;
  machineId: string;
  locationId: string;
  type: 'Preventive' | 'Corrective' | 'Predictive';
  plannedDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  plannedDurationHours: number;
  actualDurationHours?: number;
  mroItemsReserved: boolean;
  mroItemsConsumed: { itemId: string; quantity: number }[];
  status: 'Draft' | 'Released' | 'In Progress' | 'Completed' | 'Cancelled';
  downtimeRecordedMinutes?: number;
  rootCause?: string;
}


export interface AssetTransfer {
  id: string;
  machineId: string;
  currentLocationId: string;
  targetLocationId: string;
  transferType: 'Internal' | 'External maintenance';
  requestedBy: string;
  reasonCode: string;
  effectiveDate: string; 
  status: 'Draft' | 'Submitted' | 'Approved' | 'Executed' | 'Closed';

  supplierName?: string;
  workScopeNotes?: string;
  expectedReturnDate?: string;

  approvedBy?: string;
  approvalTimestamp?: string;
  rejectionReason?: string;
}

export interface MachineTransferHistoryEntry {
  id: string;
  date: string;
  fromLocationId: string;
  toLocationId: string;
  transferType: string;
  requestedBy: string;
  approvedBy?: string;
  referenceChangeId: string;
  notes?: string;
  machineId: string;
}


export interface WarrantyRecord {
  id: string;
  machineId: string;
  supplier: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  warrantyType: string;
  coverageNotes?: string;
}

export interface WarrantyReceivingRecord {
  id: string;
  machineId: string;
  receivedDate: string;
  condition: string;
  referenceTransferId?: string;
  operatingHours: number;
  firstRunDateAfterReceipt: string;
}

export interface DashboardMetrics {
  totalIssues: number;
  topItem: string;
  topMachine: string;
  recentActivity: number; 
}

export type UserRole = 'admin' | 'warehouse_manager' | 'maintenance_manager' | 'maintenance_engineer' | 'warehouse_supervisor' | 'user';

export interface User {
  username: string;
  name: string;
  role: UserRole;
  email: string;
  password?: string; 
  allowedLocationIds?: string[]; 
  allowedSectorIds?: string[];   
  allowedDivisionIds?: string[]; 
  allowedMenus?: string[]; 
}


export interface OrgStructure {
  id: string;
  locationId: string;
  sectorId: string;
  divisionId: string;
}

export interface FailureType {
  code: string;
  name: string;
  definition?: string;
  cause?: string;
  action?: string;
  applicableAssetType?: string;
  mandatory: boolean;
  active: boolean;
}

export interface IssuePlanPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Open' | 'Closed';
}

export interface IssuePlanEntry {
  id: string;
  periodId: string;
  locationId: string;
  sectorId: string;
  divisionId: string;
  itemId: string;
  machineCount: number;
  actualQuantity: number;
  forecastQuantity: number;
  notes?: string;
  updatedBy?: string;
  lastUpdated?: string;
}

