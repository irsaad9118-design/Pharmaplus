import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StoreStaffMember } from '../../types/pharmacy';
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  Key, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Sparkles,
  Phone,
  UserCheck,
  Crown,
  AlertTriangle,
  Lock
} from 'lucide-react';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({ isOpen, onClose }) => {
  const { currentSession, currentStore, staffMembers, addStaff, updateStaff, deleteStaff } = useAuth();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // New Staff Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPin, setNewPin] = useState('1234');
  const [newRole, setNewRole] = useState<'staff' | 'cashier' | 'pharmacist'>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editRole, setEditRole] = useState<'staff' | 'cashier' | 'pharmacist'>('staff');

  if (!isOpen) return null;

  const allowedLimit = currentStore?.allowedUserLimit ?? 0;
  const activeStaffCount = staffMembers.filter(s => s.status === 'active').length;
  const isLimitReached = allowedLimit > 0 && activeStaffCount >= allowedLimit;

  const togglePinReveal = (id: string) => {
    setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerateRandomPin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(randomPin);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isLimitReached) {
      setErrorMessage('User limit reached. Contact platform administrator to upgrade license.');
      return;
    }

    if (!newName.trim() || !newPin.trim()) return;
    if (newPin.trim().length !== 4 || isNaN(Number(newPin.trim()))) {
      setErrorMessage('PIN must be a 4-digit number (e.g. 1234, 5555).');
      return;
    }

    setIsSubmitting(true);
    const res = await addStaff({
      name: newName.trim(),
      phone: newPhone.trim(),
      pin: newPin.trim(),
      role: newRole,
      status: 'active'
    });
    setIsSubmitting(false);

    if (res.success) {
      setNewName('');
      setNewPhone('');
      setNewPin('1234');
      setShowAddForm(false);
      setErrorMessage(null);
    } else {
      setErrorMessage(res.error || 'User limit reached. Contact platform administrator to upgrade license.');
    }
  };

  const startEdit = (staff: StoreStaffMember) => {
    setEditingStaffId(staff.id);
    setEditName(staff.name);
    setEditPhone(staff.phone || '');
    setEditPin(staff.pin);
    setEditRole(staff.role);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim() || !editPin.trim()) return;
    if (editPin.trim().length !== 4 || isNaN(Number(editPin.trim()))) {
      alert('PIN must be a 4-digit number (e.g. 1234, 5555).');
      return;
    }

    await updateStaff(id, {
      name: editName.trim(),
      phone: editPhone.trim(),
      pin: editPin.trim(),
      role: editRole
    });
    setEditingStaffId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Manage Staff &amp; POS PINs
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {currentStore?.storeId || currentSession?.storeId}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assign 4-digit PINs for salespersons to access counter POS without seeing net profit or PTR rates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Owner Info Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                    {currentStore?.ownerName || 'Rajesh Sharma'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                    Owner / Admin
                  </span>
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Full Store Admin • Password: {currentStore?.password || 'apex123'} (or PIN: 1234)
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                Active Master
              </span>
            </div>
          </div>

          {/* License & Quota Status Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isLimitReached 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                  : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
              }`}>
                {isLimitReached ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>User / Counter License Limit:</span>
                  {allowedLimit === 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      Unlimited Counters
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isLimitReached
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                    }`}>
                      {activeStaffCount} / {allowedLimit} Active Counters
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {allowedLimit === 0 
                    ? 'Your store subscription allows unlimited counter staff users.' 
                    : `Admin-allocated license allows max ${allowedLimit} active staff counters.`}
                </p>
              </div>
            </div>
            {isLimitReached && (
              <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                Limit Reached
              </span>
            )}
          </div>

          {/* User Limit Reached Explicit Warning Banner */}
          {isLimitReached && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 flex items-start gap-3 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <div className="font-bold">User limit reached. Contact platform administrator to upgrade license.</div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                  You have reached the maximum allowed staff counters ({allowedLimit}). To add additional salespersons or cashiers, request a license extension from your platform Super Admin.
                </div>
              </div>
            </div>
          )}

          {/* Form Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Staff List Header & Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Counter Staff Members ({staffMembers.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Staff login with Store ID + their 4-digit PIN.
              </p>
            </div>
            {!showAddForm && (
              <button
                type="button"
                onClick={() => {
                  if (isLimitReached) {
                    setErrorMessage('User limit reached. Contact platform administrator to upgrade license.');
                    return;
                  }
                  setErrorMessage(null);
                  setShowAddForm(true);
                }}
                disabled={isLimitReached}
                title={isLimitReached ? 'User limit reached. Contact platform administrator to upgrade license.' : 'Add new counter staff'}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all shadow-xs ${
                  isLimitReached
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
                }`}
              >
                {isLimitReached ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
                <span>Add Staff</span>
              </button>
            )}
          </div>

          {/* Add Staff Form */}
          {showAddForm && (
            <form onSubmit={handleAddStaff} className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-teal-200 dark:border-teal-800/60 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  Add New Staff Member
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Staff Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role at Counter
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white font-medium"
                  >
                    <option value="staff">Salesman (Restricted POS)</option>
                    <option value="cashier">Cashier (Fast Checkout)</option>
                    <option value="pharmacist">Dispensing Pharmacist</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      4-Digit POS Login PIN *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPin}
                      className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate Random
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 1234"
                      className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white tracking-widest"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Staff Member</span>
                </button>
              </div>
            </form>
          )}

          {/* Staff Members List */}
          <div className="space-y-2.5">
            {staffMembers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No staff members created yet.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Click "Add Staff" to create PINs for your counter salesmen.</p>
              </div>
            ) : (
              staffMembers.map(staff => {
                const isEditing = editingStaffId === staff.id;
                const isRevealed = revealedPins[staff.id];

                if (isEditing) {
                  return (
                    <div key={staff.id} className="p-4 rounded-2xl bg-teal-50/50 dark:bg-slate-900 border border-teal-300 dark:border-teal-700 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-lg dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">4-Digit PIN</label>
                          <input
                            type="text"
                            maxLength={4}
                            value={editPin}
                            onChange={(e) => setEditPin(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 rounded-lg dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Role</label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-lg dark:text-white"
                          >
                            <option value="staff">Salesman</option>
                            <option value="cashier">Cashier</option>
                            <option value="pharmacist">Pharmacist</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 rounded-lg dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStaffId(null)}
                          className="px-3 py-1 rounded-lg border text-xs font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(staff.id)}
                          className="px-3 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={staff.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center font-bold text-sm shrink-0">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {staff.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                            {staff.role}
                          </span>
                          {staff.status === 'active' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          <div className="flex items-center gap-1 font-mono">
                            <Key className="w-3 h-3 text-slate-400" />
                            <span>PIN: </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {isRevealed ? staff.pin : '••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePinReveal(staff.id)}
                              className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title={isRevealed ? 'Hide PIN' : 'Show PIN'}
                            >
                              {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          {staff.phone && (
                            <div className="hidden sm:flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(staff)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        title="Edit Staff / Change PIN"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Remove staff member "${staff.name}"?`)) {
                            deleteStaff(staff.id);
                          }
                        }}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Delete Staff"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Explainer Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Role-Based Privacy &amp; Counter Security:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <li>Staff members login on their phones/tablets using Store ID <strong>({currentStore?.storeId || 'STORE-APEX01'})</strong> and their assigned 4-digit PIN.</li>
              <li>Staff accounts only see the counter billing screen. All net profit figures, PTR purchase rates, margin analytics, and store settings are automatically masked.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
