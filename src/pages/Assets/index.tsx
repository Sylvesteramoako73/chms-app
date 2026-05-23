import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Boxes, Plus, Pencil, Trash2, Wrench, DoorOpen, X,
  AlertTriangle, CheckCircle, Clock, Package,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import type {
  Asset, Facility, MaintenanceRecord,
  AssetCategory, AssetCondition, AssetStatus,
  FacilityType, MaintenanceType, MaintenanceStatus,
} from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils';

const uid = () => `af${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const GHS = '₵';

const ASSET_CATEGORIES: AssetCategory[] = ['Equipment', 'Instrument', 'Vehicle', 'Furniture', 'Electronics', 'Building', 'Other'];
const ASSET_CONDITIONS: AssetCondition[] = ['Excellent', 'Good', 'Fair', 'Poor', 'Out of Service'];
const ASSET_STATUSES: AssetStatus[] = ['Active', 'In Maintenance', 'Disposed'];
const FACILITY_TYPES: FacilityType[] = ['Sanctuary', 'Hall', 'Office', 'Classroom', 'Kitchen', 'Storage', 'Outdoor', 'Other'];
const MAINTENANCE_TYPES: MaintenanceType[] = ['Preventive', 'Repair', 'Inspection', 'Replacement'];
const MAINTENANCE_STATUSES: MaintenanceStatus[] = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const CONDITION_STYLES: Record<AssetCondition, string> = {
  Excellent:        'bg-sage-500/20 text-sage-400',
  Good:             'bg-blue-500/20 text-blue-400',
  Fair:             'bg-amber-500/20 text-amber-400',
  Poor:             'bg-orange-500/20 text-orange-400',
  'Out of Service': 'bg-red-500/20 text-red-400',
};

const STATUS_STYLES: Record<MaintenanceStatus, string> = {
  Pending:      'bg-amber-500/20 text-amber-400',
  'In Progress':'bg-blue-500/20 text-blue-400',
  Completed:    'bg-sage-500/20 text-sage-400',
  Cancelled:    'bg-navy-700 text-navy-400',
};

const COMMON_FEATURES = ['Air Conditioning', 'Projector', 'Sound System', 'Whiteboard', 'TV Screen', 'WiFi', 'Stage', 'Kitchen Access'];

// ── Asset Form ─────────────────────────────────────────────────────────────
function AssetForm({ initial, facilities, onSave, onClose }: {
  initial?: Asset;
  facilities: Facility[];
  onSave: (a: Asset) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<AssetCategory>(initial?.category ?? 'Equipment');
  const [serialNumber, setSerialNumber] = useState(initial?.serialNumber ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '');
  const [purchaseCost, setPurchaseCost] = useState(initial?.purchaseCost?.toString() ?? '');
  const [currentValue, setCurrentValue] = useState(initial?.currentValue?.toString() ?? '');
  const [condition, setCondition] = useState<AssetCondition>(initial?.condition ?? 'Good');
  const [status, setStatus] = useState<AssetStatus>(initial?.status ?? 'Active');
  const [facilityId, setFacilityId] = useState(initial?.facilityId ?? '');
  const [assignedTo, setAssignedTo] = useState(initial?.assignedTo ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      category, serialNumber: serialNumber.trim() || undefined,
      purchaseDate: purchaseDate || undefined,
      purchaseCost: purchaseCost ? parseFloat(purchaseCost) : undefined,
      currentValue: currentValue ? parseFloat(currentValue) : undefined,
      condition, status,
      facilityId: facilityId || undefined,
      assignedTo: assignedTo.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-navy-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{initial ? 'Edit Asset' : 'New Asset'}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Asset Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              placeholder="e.g. Yamaha P-45 Keyboard" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as AssetCategory)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                {ASSET_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value as AssetCondition)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                {ASSET_CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as AssetStatus)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                {ASSET_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Serial Number</label>
              <input value={serialNumber} onChange={e => setSerialNumber(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                placeholder="SN-12345" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Purchase Date</label>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Purchase Cost ({GHS})</label>
              <input type="number" min="0" value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Current Value ({GHS})</label>
              <input type="number" min="0" value={currentValue} onChange={e => setCurrentValue(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Location / Facility</label>
              <select value={facilityId} onChange={e => setFacilityId(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                <option value="">— none —</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Assigned To</label>
            <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              placeholder="e.g. Worship Team" />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500 resize-none" />
          </div>
        </div>
        <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-navy-300 hover:text-white border border-navy-700 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-sm bg-gold-500 text-navy-900 font-semibold hover:bg-gold-400 transition-colors disabled:opacity-40">
            {initial ? 'Save Changes' : 'Add Asset'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Facility Form ──────────────────────────────────────────────────────────
function FacilityForm({ initial, onSave, onClose }: {
  initial?: Facility;
  onSave: (f: Facility) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<FacilityType>(initial?.type ?? 'Hall');
  const [capacity, setCapacity] = useState(initial?.capacity?.toString() ?? '');
  const [features, setFeatures] = useState<string[]>(initial?.features ?? []);
  const [customFeature, setCustomFeature] = useState('');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const toggleFeature = (f: string) =>
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const addCustom = () => {
    const trimmed = customFeature.trim();
    if (trimmed && !features.includes(trimmed)) setFeatures(prev => [...prev, trimmed]);
    setCustomFeature('');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(), type,
      capacity: capacity ? parseInt(capacity) : undefined,
      features, notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-navy-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{initial ? 'Edit Room / Space' : 'New Room / Space'}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              placeholder="e.g. Main Sanctuary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value as FacilityType)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                {FACILITY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Capacity</label>
              <input type="number" min="0" value={capacity} onChange={e => setCapacity(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                placeholder="e.g. 500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-2">Features</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_FEATURES.map(f => (
                <button key={f} type="button" onClick={() => toggleFeature(f)}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
                    features.includes(f)
                      ? 'bg-gold-500/20 text-gold-400 border-gold-500/40'
                      : 'bg-navy-800 text-navy-400 border-navy-700 hover:text-white')}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={customFeature} onChange={e => setCustomFeature(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-gold-500"
                placeholder="Add custom feature…" />
              <button onClick={addCustom} className="px-3 py-1.5 bg-navy-700 text-white text-sm rounded-lg hover:bg-navy-600 transition-colors">Add</button>
            </div>
            {features.filter(f => !COMMON_FEATURES.includes(f)).map(f => (
              <span key={f} className="inline-flex items-center gap-1 mt-1 mr-1 px-2.5 py-1 rounded-full text-xs bg-navy-700 text-navy-300">
                {f}
                <button onClick={() => toggleFeature(f)} className="text-navy-500 hover:text-white ml-0.5"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500 resize-none" />
          </div>
        </div>
        <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-navy-300 hover:text-white border border-navy-700 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-sm bg-gold-500 text-navy-900 font-semibold hover:bg-gold-400 transition-colors disabled:opacity-40">
            {initial ? 'Save Changes' : 'Add Room'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Maintenance Form ────────────────────────────────────────────────────────
function MaintenanceForm({ initial, assets, facilities, onSave, onClose }: {
  initial?: MaintenanceRecord;
  assets: Asset[];
  facilities: Facility[];
  onSave: (r: MaintenanceRecord) => void;
  onClose: () => void;
}) {
  const [entityType, setEntityType] = useState<'Asset' | 'Facility'>(initial?.entityType ?? 'Asset');
  const [entityId, setEntityId] = useState(initial?.entityId ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<MaintenanceType>(initial?.type ?? 'Repair');
  const [status, setStatus] = useState<MaintenanceStatus>(initial?.status ?? 'Pending');
  const [reportedDate, setReportedDate] = useState(initial?.reportedDate ?? new Date().toISOString().slice(0, 10));
  const [completedDate, setCompletedDate] = useState(initial?.completedDate ?? '');
  const [cost, setCost] = useState(initial?.cost?.toString() ?? '');
  const [performedBy, setPerformedBy] = useState(initial?.performedBy ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const entityOptions = entityType === 'Asset' ? assets : facilities;

  const handleSave = () => {
    if (!title.trim() || !entityId) return;
    onSave({
      id: initial?.id ?? uid(),
      entityType, entityId,
      title: title.trim(), type, status,
      reportedDate,
      completedDate: completedDate || undefined,
      cost: cost ? parseFloat(cost) : undefined,
      performedBy: performedBy.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-navy-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{initial ? 'Edit Record' : 'Log Maintenance'}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Relates To</label>
              <select value={entityType} onChange={e => { setEntityType(e.target.value as 'Asset' | 'Facility'); setEntityId(''); }}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                <option>Asset</option>
                <option>Facility</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">{entityType} *</label>
              <select value={entityId} onChange={e => setEntityId(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                <option value="">— select —</option>
                {entityOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              placeholder="e.g. Replace broken keyboard keys" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value as MaintenanceType)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                {MAINTENANCE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as MaintenanceStatus)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
                {MAINTENANCE_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Reported Date</label>
              <input type="date" value={reportedDate} onChange={e => setReportedDate(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Completed Date</label>
              <input type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Cost ({GHS})</label>
              <input type="number" min="0" value={cost} onChange={e => setCost(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-400 mb-1">Performed By</label>
              <input value={performedBy} onChange={e => setPerformedBy(e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                placeholder="e.g. Kofi Mensah" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-400 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500 resize-none" />
          </div>
        </div>
        <div className="p-6 border-t border-navy-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-navy-300 hover:text-white border border-navy-700 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || !entityId}
            className="px-4 py-2 rounded-lg text-sm bg-gold-500 text-navy-900 font-semibold hover:bg-gold-400 transition-colors disabled:opacity-40">
            {initial ? 'Save Changes' : 'Log Record'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Assets() {
  const {
    assets, addAsset, updateAsset, deleteAsset,
    facilities, addFacility, updateFacility, deleteFacility,
    maintenanceRecords, addMaintenanceRecord, updateMaintenanceRecord, deleteMaintenanceRecord,
  } = useData();

  const [assetForm, setAssetForm] = useState<{ open: boolean; editing?: Asset }>({ open: false });
  const [facilityForm, setFacilityForm] = useState<{ open: boolean; editing?: Facility }>({ open: false });
  const [maintForm, setMaintForm] = useState<{ open: boolean; editing?: MaintenanceRecord }>({ open: false });

  const [assetSearch, setAssetSearch] = useState('');
  const [assetCategory, setAssetCategory] = useState<AssetCategory | 'All'>('All');
  const [assetCondition, setAssetCondition] = useState<AssetCondition | 'All'>('All');
  const [maintStatus, setMaintStatus] = useState<MaintenanceStatus | 'All'>('All');

  const filteredAssets = useMemo(() => {
    let a = assets;
    if (assetCategory !== 'All') a = a.filter(x => x.category === assetCategory);
    if (assetCondition !== 'All') a = a.filter(x => x.condition === assetCondition);
    if (assetSearch.trim()) {
      const q = assetSearch.toLowerCase();
      a = a.filter(x => x.name.toLowerCase().includes(q) || x.serialNumber?.toLowerCase().includes(q) || x.assignedTo?.toLowerCase().includes(q));
    }
    return a;
  }, [assets, assetCategory, assetCondition, assetSearch]);

  const filteredMaint = useMemo(() => {
    if (maintStatus === 'All') return maintenanceRecords;
    return maintenanceRecords.filter(r => r.status === maintStatus);
  }, [maintenanceRecords, maintStatus]);

  const totalValue = assets.reduce((s, a) => s + (a.currentValue ?? a.purchaseCost ?? 0), 0);
  const inMaintenance = assets.filter(a => a.status === 'In Maintenance').length;
  const needsAttention = assets.filter(a => a.condition === 'Poor' || a.condition === 'Out of Service').length;
  const pendingMaint = maintenanceRecords.filter(r => r.status === 'Pending' || r.status === 'In Progress').length;

  const getEntityName = (r: MaintenanceRecord) => {
    if (r.entityType === 'Asset') return assets.find(a => a.id === r.entityId)?.name ?? '—';
    return facilities.find(f => f.id === r.entityId)?.name ?? '—';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Assets & Facilities</h1>
          <p className="text-navy-400 text-sm mt-0.5">Track church property, rooms, and maintenance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFacilityForm({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-navy-800 border border-navy-700 hover:border-gold-500/50 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Room
          </button>
          <button onClick={() => setMaintForm({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-navy-800 border border-navy-700 hover:border-gold-500/50 text-white rounded-lg text-sm font-medium transition-colors">
            <Wrench className="w-4 h-4" /> Log Maintenance
          </button>
          <button onClick={() => setAssetForm({ open: true })}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-400 text-navy-900 rounded-lg text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets', value: assets.length, icon: Package, color: 'text-gold-400' },
          { label: 'Total Value', value: `${GHS}${totalValue.toLocaleString()}`, icon: Boxes, color: 'text-blue-400' },
          { label: 'In Maintenance', value: inMaintenance, icon: Wrench, color: 'text-amber-400' },
          { label: 'Need Attention', value: needsAttention, icon: AlertTriangle, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-navy-800 border border-navy-700 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn('w-4 h-4', s.color)} />
              <span className="text-xs text-navy-400">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="assets">
        <TabsList className="bg-navy-800 border border-navy-700">
          <TabsTrigger value="assets" className="data-[state=active]:bg-navy-700 data-[state=active]:text-white text-navy-400">
            Assets ({assets.length})
          </TabsTrigger>
          <TabsTrigger value="facilities" className="data-[state=active]:bg-navy-700 data-[state=active]:text-white text-navy-400">
            Rooms & Spaces ({facilities.length})
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="data-[state=active]:bg-navy-700 data-[state=active]:text-white text-navy-400">
            Maintenance {pendingMaint > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded-full">{pendingMaint}</span>}
          </TabsTrigger>
        </TabsList>

        {/* ── Assets Tab ── */}
        <TabsContent value="assets" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={assetSearch} onChange={e => setAssetSearch(e.target.value)} placeholder="Search assets…"
              className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500 w-full sm:w-56" />
            <select value={assetCategory} onChange={e => setAssetCategory(e.target.value as AssetCategory | 'All')}
              className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
              <option value="All">All Categories</option>
              {ASSET_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={assetCondition} onChange={e => setAssetCondition(e.target.value as AssetCondition | 'All')}
              className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500">
              <option value="All">All Conditions</option>
              {ASSET_CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="text-center py-16 text-navy-500">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-white/60">No assets found</p>
              <p className="text-sm mt-1">Add your first asset to start tracking church property.</p>
            </div>
          ) : (
            <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Asset</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden sm:table-cell">Category</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Condition</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden md:table-cell">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden lg:table-cell">Value</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {filteredAssets.map(a => {
                    const loc = facilities.find(f => f.id === a.facilityId);
                    return (
                      <tr key={a.id} className="hover:bg-navy-750 group">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{a.name}</p>
                          {a.serialNumber && <p className="text-xs text-navy-500">S/N: {a.serialNumber}</p>}
                        </td>
                        <td className="px-4 py-3 text-navy-400 hidden sm:table-cell">{a.category}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CONDITION_STYLES[a.condition])}>
                            {a.condition}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-navy-400 hidden md:table-cell">
                          {loc?.name ?? a.assignedTo ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-navy-300 hidden lg:table-cell">
                          {(a.currentValue ?? a.purchaseCost) ? `${GHS}${(a.currentValue ?? a.purchaseCost)!.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setAssetForm({ open: true, editing: a })}
                              className="p-1.5 rounded text-navy-400 hover:text-white hover:bg-navy-700 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteAsset(a.id)}
                              className="p-1.5 rounded text-navy-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Facilities Tab ── */}
        <TabsContent value="facilities" className="mt-4">
          {facilities.length === 0 ? (
            <div className="text-center py-16 text-navy-500">
              <DoorOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-white/60">No rooms or spaces added yet</p>
              <p className="text-sm mt-1">Add your church's rooms and spaces to link assets and maintenance.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map(f => {
                const assetCount = assets.filter(a => a.facilityId === f.id).length;
                const openMaint = maintenanceRecords.filter(r => r.entityType === 'Facility' && r.entityId === f.id && (r.status === 'Pending' || r.status === 'In Progress')).length;
                return (
                  <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-navy-800 border border-navy-700 rounded-xl p-4 space-y-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{f.name}</p>
                        <span className="text-xs text-navy-500">{f.type}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => setFacilityForm({ open: true, editing: f })}
                          className="p-1.5 rounded-lg text-navy-400 hover:text-white hover:bg-navy-700 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteFacility(f.id)}
                          className="p-1.5 rounded-lg text-navy-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {f.capacity && (
                      <p className="text-xs text-navy-400">Capacity: <span className="text-white font-medium">{f.capacity.toLocaleString()}</span></p>
                    )}
                    {f.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {f.features.map(feat => (
                          <span key={feat} className="text-[11px] px-2 py-0.5 rounded-full bg-navy-700 text-navy-300">{feat}</span>
                        ))}
                      </div>
                    )}
                    <div className="pt-2 border-t border-navy-700 flex items-center justify-between text-xs text-navy-500">
                      <span>{assetCount} asset{assetCount !== 1 ? 's' : ''}</span>
                      {openMaint > 0 && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Wrench className="w-3 h-3" /> {openMaint} open
                        </span>
                      )}
                    </div>
                    {f.notes && <p className="text-xs text-navy-500 line-clamp-2">{f.notes}</p>}
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Maintenance Tab ── */}
        <TabsContent value="maintenance" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['All', ...MAINTENANCE_STATUSES] as const).map(s => (
              <button key={s} onClick={() => setMaintStatus(s as MaintenanceStatus | 'All')}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  maintStatus === s ? 'bg-gold-500 text-navy-900' : 'bg-navy-800 text-navy-400 hover:text-white border border-navy-700')}>
                {s}
              </button>
            ))}
          </div>

          {filteredMaint.length === 0 ? (
            <div className="text-center py-16 text-navy-500">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-white/60">No maintenance records</p>
              <p className="text-sm mt-1">Log maintenance to track repair history and costs.</p>
            </div>
          ) : (
            <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden sm:table-cell">Item</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-navy-400 uppercase tracking-wider hidden lg:table-cell">Cost</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {filteredMaint.map(r => (
                    <tr key={r.id} className="hover:bg-navy-750 group">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{r.title}</p>
                        <p className="text-xs text-navy-500">{r.type} · {r.entityType}</p>
                      </td>
                      <td className="px-4 py-3 text-navy-400 hidden sm:table-cell">{getEntityName(r)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[r.status])}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-navy-400 hidden md:table-cell">
                        {format(parseISO(r.reportedDate), 'MMM d, yyyy')}
                        {r.completedDate && (
                          <p className="text-xs text-sage-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {format(parseISO(r.completedDate), 'MMM d')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-navy-300 hidden lg:table-cell">
                        {r.cost ? `${GHS}${r.cost.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setMaintForm({ open: true, editing: r })}
                            className="p-1.5 rounded text-navy-400 hover:text-white hover:bg-navy-700 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteMaintenanceRecord(r.id)}
                            className="p-1.5 rounded text-navy-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Maintenance cost summary */}
          {maintenanceRecords.length > 0 && (() => {
            const total = maintenanceRecords.filter(r => r.status === 'Completed' && r.cost).reduce((s, r) => s + (r.cost ?? 0), 0);
            const open = maintenanceRecords.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled' && r.cost).reduce((s, r) => s + (r.cost ?? 0), 0);
            return (
              <div className="flex gap-4 pt-2">
                <div className="bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-sage-400" />
                  <div>
                    <p className="text-xs text-navy-400">Total Spent</p>
                    <p className="text-sm font-semibold text-white">{GHS}{total.toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs text-navy-400">Pending Costs</p>
                    <p className="text-sm font-semibold text-white">{GHS}{open.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {assetForm.open && (
        <AssetForm
          initial={assetForm.editing}
          facilities={facilities}
          onSave={assetForm.editing ? updateAsset : addAsset}
          onClose={() => setAssetForm({ open: false })}
        />
      )}
      {facilityForm.open && (
        <FacilityForm
          initial={facilityForm.editing}
          onSave={facilityForm.editing ? updateFacility : addFacility}
          onClose={() => setFacilityForm({ open: false })}
        />
      )}
      {maintForm.open && (
        <MaintenanceForm
          initial={maintForm.editing}
          assets={assets}
          facilities={facilities}
          onSave={maintForm.editing ? updateMaintenanceRecord : addMaintenanceRecord}
          onClose={() => setMaintForm({ open: false })}
        />
      )}
    </div>
  );
}
