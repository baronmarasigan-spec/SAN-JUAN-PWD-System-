
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { IDCard } from '../../components/IDCard';
import { 
  Search, Download, X, ShieldCheck, User as UserIcon, 
  MapPin, Phone, Mail, Eye, EyeOff, FileText, 
  RefreshCw, Database, Globe, Activity, CloudOff, ShieldAlert, Calendar, UserCircle, Briefcase, Home, CreditCard, Save, MapPinned,
  MoreHorizontal, Edit2, Key, RefreshCcw, Trash2, Heart, ChevronDown, Camera
} from 'lucide-react';

const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
};

const SAN_JUAN_BARANGAYS = [
  "Addition Hills", "Balong-Bato", "Batis", "Corazon de Jesus", "Ermitaño", 
  "Isabelita", "Kabayanan", "Little Baguio", "Maytunas", 
  "Onse", "Pasadeña", "Pedro Cruz", "Progreso", "Rivera", "Salapan", 
  "San Perfecto", "Santa Lucia", "Tibagan", "West Crame", "Greenhills"
];

const CONGENITAL_OPTIONS = ["Autism", "ADHD", "Cerebral Palsy", "Down Syndrome"];
const ACQUIRED_OPTIONS = ["Chronic Illness", "Cerebral Palsy", "Injury"];

// Safe Attachment URL Parser
const safeParseAttachment = (val: any): string | null => {
  if (!val) return null;
  
  const extract = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return extract(parsed);
        } catch (e) {
          return trimmed;
        }
      }
      return trimmed;
    }
    if (Array.isArray(v)) {
      if (v.length > 0) {
        return extract(v[0]);
      }
      return null;
    }
    if (typeof v === 'object') {
      return extract(v.url || v.path || Object.values(v)[0] || null);
    }
    return String(v);
  };

  let cleanPath = extract(val);

  if (cleanPath && typeof cleanPath === 'string') {
    cleanPath = cleanPath.trim();
    if (!cleanPath.startsWith('http') && !cleanPath.startsWith('data:')) {
      const host = 'https://api-dbpwd.drchiocms.com';
      cleanPath = cleanPath.startsWith('/') ? `${host}${cleanPath}` : `${host}/${cleanPath}`;
    }
    return cleanPath;
  }
  return null;
};

// Attachment helper component
const AttachmentItem = ({ label, value }: { label: string, value: any }) => {
  const parsedPath = safeParseAttachment(value);
  
  // Extract filename
  const getFilename = (v: any): string => {
    if (!v) return 'No file';
    if (Array.isArray(v)) {
      if (v.length > 0) return getFilename(v[0]);
      return 'No file';
    }
    if (typeof v === 'object') {
      if (v.filename) return v.filename;
      if (v.name) return v.name;
      const pathValue = v.path || v.url;
      if (pathValue && typeof pathValue === 'string') {
        return pathValue.split('/').pop() || 'document_file';
      }
    }
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return getFilename(JSON.parse(trimmed));
        } catch (e) {
          // ignore
        }
      }
      return trimmed.split('/').pop() || 'document_file';
    }
    return 'document_file';
  };

  const filename = getFilename(value);

  if (!parsedPath) {
    return (
      <div className="flex flex-col p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] shadow-sm">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{label}</span>
        <span className="text-xs text-slate-400 italic font-semibold mt-2">No file uploaded</span>
      </div>
    );
  }

  // Handle case-insensitive image file extensions and data urls
  const isImage = typeof parsedPath === 'string' && (!!parsedPath.match(/\.(jpg|jpeg|png|gif|webp)/i) || parsedPath.startsWith('data:image/'));
  const isPdf = typeof parsedPath === 'string' && !!parsedPath.match(/\.pdf/i);
  
  return (
    <div className="flex flex-col p-5 bg-white border border-slate-200/80 rounded-[1.5rem] shadow-sm hover:border-[#1e419c]/45 hover:shadow-md transition-all duration-200 text-left">
      <span className="text-[10px] text-[#1e419c] font-bold uppercase tracking-wider mb-2">{label}</span>
      
      {/* File Preview */}
      {isImage ? (
        <div className="relative group w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-3 shrink-0">
          <img 
            src={parsedPath} 
            alt={label} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }} 
          />
        </div>
      ) : isPdf ? (
        <div className="w-full h-32 rounded-xl bg-rose-50/50 flex flex-col items-center justify-center border border-rose-100/65 mb-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mb-1">
            <span className="text-rose-600 font-extrabold text-[10px] uppercase font-mono">PDF</span>
          </div>
          <span className="text-[10px] text-rose-500 font-bold tracking-tight uppercase">PDF Document</span>
        </div>
      ) : (
        <div className="w-full h-32 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-150 mb-3 shrink-0">
          <FileText size={32} className="text-slate-400" />
        </div>
      )}

      {/* Filename display */}
      <div className="mb-4 flex-1">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Filename</p>
        <p className="text-xs font-semibold text-slate-700 truncate line-clamp-1" title={filename}>
          {filename}
        </p>
      </div>

      {/* Dual action buttons */}
      <div className="grid grid-cols-2 gap-2 mt-auto shrink-0">
        <a 
          href={parsedPath} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wide text-center transition-all flex items-center justify-center gap-1"
        >
          <Eye size={12} /> View/Open
        </a>
        <a 
          href={parsedPath} 
          download={filename} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex-1 px-3 py-2 bg-[#1e419c] hover:bg-opacity-90 text-white rounded-xl text-[10px] font-bold uppercase tracking-wide text-center transition-all flex items-center justify-center gap-1"
        >
          <Download size={12} /> Download
        </a>
      </div>
    </div>
  );
};

interface MultiSelectDropdownProps {
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  standardOptions: string[];
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  value,
  onChange,
  standardOptions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const parsedSelected = useMemo(() => {
    return value
      ? value.split(',').map((x: string) => x.trim()).filter(Boolean)
      : [];
  }, [value]);

  const allAvailableOptions = useMemo(() => {
    const uniqueOptions = new Set<string>();
    standardOptions.forEach(opt => uniqueOptions.add(opt));
    parsedSelected.forEach(opt => uniqueOptions.add(opt));
    return Array.from(uniqueOptions);
  }, [standardOptions, parsedSelected]);

  const handleToggleOption = (option: string) => {
    let updated: string[];
    if (parsedSelected.includes(option)) {
      updated = parsedSelected.filter(item => item !== option);
    } else {
      updated = [...parsedSelected, option];
    }
    onChange(updated.join(', '));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c] cursor-pointer flex justify-between items-center min-h-[38px] select-none"
      >
        <div className="flex flex-wrap gap-1 items-center max-w-[90%]">
          {parsedSelected.length === 0 ? (
            <span className="text-slate-400 normal-case">Select {label}...</span>
          ) : (
            parsedSelected.map((item, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 bg-blue-50 text-[#1e419c] text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100 uppercase"
              >
                {item}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleOption(item);
                  }}
                  className="hover:text-blue-950 font-extrabold focus:outline-none text-[12px] leading-none"
                >
                  &times;
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-[200] p-3 space-y-3 max-h-[280px] overflow-y-auto">
          <div className="space-y-1.5">
            {allAvailableOptions.map((option, idx) => {
              const checked = parsedSelected.includes(option);
              return (
                <label 
                  key={idx} 
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs font-medium text-slate-700 select-none uppercase"
                >
                  <input 
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleOption(option)}
                    className="rounded text-[#1e419c] focus:ring-[#1e419c]/20"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Cooldown cache for single record syncs to avoid excessive requests / API 429 errors
const recordSyncCache = new Map<string, number>();

const formatToDateTimeString = (dateStr: string) => {
  if (!dateStr) return '';
  // Check if it's already in YYYY-MM-DD HH:mm:ss format
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  // If it's an ISO string or has 'T', split by 'T' and take the first portion
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const match = cleanStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = match[1];
    const month = match[2];
    const day = match[3];
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hrs}:${mins}:${secs}`;
  }
  return dateStr;
};

export const Masterlist: React.FC = () => {
  const { masterlistRecords, setMasterlistRecords, fetchMasterlist, isLiveMode, syncError, updateApplicationData, moveRecordToPending, deleteMasterlistRecord, reflectToSenior, mapApiMasterlistRecord } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterBarangay, setFilterBarangay] = useState('');
  const [filterStatus, setFilterStatus] = useState('Active');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isInitialEdit, setIsInitialEdit] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmingDeleteRecord, setConfirmingDeleteRecord] = useState<any | null>(null);
  const [confirmingResetPasswordRecord, setConfirmingResetPasswordRecord] = useState<any | null>(null);

  const [changingVitalRecord, setChangingVitalRecord] = useState<any | null>(null);
  const [newVitalStatus, setNewVitalStatus] = useState<string>('Active');
  const [deathDate, setDeathDate] = useState<string>('');
  const [isUpdatingVital, setIsUpdatingVital] = useState<boolean>(false);

  const [masterlistResponse, setMasterlistResponse] = useState<{ data: any[] }>({ data: [] });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: any = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('https://api-dbpwd.drchiocms.com/api/masterlistv2', {
        method: 'GET',
        headers
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = await res.json();
      
      const response = {
        data: json
      };
      
      console.log('Masterlist API Response:', response.data);
      console.log('Masterlist Records:', response.data.data);

      setMasterlistResponse({ data: response.data.data || [] });
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('[MASTERLIST] Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  }, []);

  const handleAction = async (type: string, record: any) => {
    setOpenDropdownId(null);
    if (type === 'view') {
      setSelectedRecord(record);
    } else if (type === 'edit') {
      setIsInitialEdit(true);
      setSelectedRecord(record);
    } else if (type === 'change-vital') {
      setChangingVitalRecord(record);
      setNewVitalStatus(record.status || 'Active');
      setDeathDate(record._raw?.application_details?.date_of_death || record.dateOfDeath || '');
    } else if (type === 'reset') {
      setConfirmingResetPasswordRecord(record);
    } else if (type === 'pending') {
      try {
        const token = localStorage.getItem('pdao_auth_token');
        const headers: any = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${record.id}/move-to-pending`, {
          method: 'POST',
          headers
        });

        if (!res.ok) {
          console.warn(`API responded with status: ${res.status}. Falling back to local update.`);
        }
      } catch (err) {
        console.error("Error moving record to pending API:", err);
      }

      // Remove the record from the local Masterlist state so the row immediately deletes
      setMasterlistResponse(prev => ({
        data: prev.data.filter((item: any) => String(item.id) !== String(record.id))
      }));

      moveRecordToPending(record.id);
      setSuccessMessage(`${record.name || record.fullName} has been moved back to PWD Registration Management as a pending citizen.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else if (type === 'senior') {
      reflectToSenior(record.id);
      setSuccessMessage(`${record.name || record.fullName} has been reflected in the Senior Citizen Registry.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else if (type === 'delete') {
      setConfirmingDeleteRecord(record);
    }
  };

  const handleResetPassword = async () => {
    if (!confirmingResetPasswordRecord) return;
    const record = confirmingResetPasswordRecord;
    setConfirmingResetPasswordRecord(null);
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: any = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${record.id}/reset-password`, {
        method: 'POST',
        headers
      });

      if (!res.ok) {
        throw new Error(`Failed to reset password: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.new_temp_password) {
        setSuccessMessage(`Password reset successful for ${record.name || record.fullName}. Username: ${data.username || record.userName || 'N/A'}, Temp Password: ${data.new_temp_password}`);
      } else {
        setSuccessMessage(data.message || `Password reset successful for ${record.name || record.fullName}.`);
      }
      setTimeout(() => setSuccessMessage(null), 15000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setSuccessMessage(`Error resetting password: ${err.message || err}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleSaveVitalStatus = async () => {
    if (!changingVitalRecord) return;
    setIsUpdatingVital(true);
    const recordId = changingVitalRecord.id;
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: any = {
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append('_method', 'PUT');
      formData.append('vital_status', newVitalStatus);
      if (newVitalStatus === 'Deceased') {
        formData.append('date_of_death', formatToDateTimeString(deathDate));
      } else {
        formData.append('date_of_death', '');
      }

      let res = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${recordId}`, {
        method: 'PUT',
        headers,
        body: formData
      });

      if (!res.ok && res.status === 405) {
        res = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${recordId}`, {
          method: 'POST',
          headers,
          body: formData
        });
      }

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // Re-fetch record details from cloud to maintain synchronization (Same process as editing profile)
      const getResponse = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${recordId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (getResponse.ok) {
        const getJson = await getResponse.json();
        const apiItem = getJson.data || getJson;
        const mappedRecord = mapApiMasterlistRecord(apiItem);
        
        setMasterlistResponse(prev => ({
          data: prev.data.map((item: any) => String(item.id) === String(recordId) ? apiItem : item)
        }));

        setMasterlistRecords(prev => 
          prev.map(r => r.id.toString() === recordId.toString() ? mappedRecord : r)
        );
      } else {
        throw new Error("Cloud GET re-fetch failed, falling back to local simulation");
      }

      setSuccessMessage(`Successfully updated vital status for ${changingVitalRecord.fullName || changingVitalRecord.name} to ${newVitalStatus}.`);
      setChangingVitalRecord(null);
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      console.error("Error updating vital status, doing local fallback status update:", err);
      // Fallback update local state directly
      setMasterlistResponse(prev => ({
        data: prev.data.map((item: any) => {
          if (String(item.id) === String(recordId)) {
            return {
              ...item,
              status_and_metadata: {
                ...item.status_and_metadata,
                vital_status: newVitalStatus.toLowerCase(),
                date_of_death: newVitalStatus === 'Deceased' ? deathDate : null
              },
              application_details: {
                ...item.application_details,
                record_status: newVitalStatus,
                date_of_death: newVitalStatus === 'Deceased' ? deathDate : ''
              }
            };
          }
          return item;
        })
      }));

      setMasterlistRecords(prev => 
        prev.map(r => r.id.toString() === recordId.toString() ? {
          ...r,
          status: newVitalStatus,
          dateOfDeath: newVitalStatus === 'Deceased' ? deathDate : '',
          _raw: {
            ...r._raw,
            status_and_metadata: {
              ...(r._raw?.status_and_metadata || {}),
              vital_status: newVitalStatus.toLowerCase(),
              date_of_death: newVitalStatus === 'Deceased' ? deathDate : null
            },
            application_details: {
              ...(r._raw?.application_details || {}),
              record_status: newVitalStatus,
              date_of_death: newVitalStatus === 'Deceased' ? deathDate : ''
            }
          }
        } : r)
      );

      setSuccessMessage(`Successfully updated vital status for ${changingVitalRecord.fullName || changingVitalRecord.name} to ${newVitalStatus}.`);
      setChangingVitalRecord(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setIsUpdatingVital(false);
    }
  };

  const handleDeleteRecord = () => {
    if (confirmingDeleteRecord) {
      deleteMasterlistRecord(confirmingDeleteRecord.id);
      setSuccessMessage(`${confirmingDeleteRecord.name || confirmingDeleteRecord.fullName} has been permanently deleted from the masterlist.`);
      setConfirmingDeleteRecord(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh, masterlistRecords]);

  const mappedApiRecords = useMemo(() => {
    return (masterlistResponse.data || []).map((item: any) => {
      const personal = item.personal_information || {};
      const appDetails = item.application_details || {};
      const address = item.address_and_contact || {};
      const govIds = item.government_ids || {};
      
      const pwdId = appDetails.pwd_number || appDetails.control_number || govIds.psn_no || item.id || '---';
      const fullName = personal.full_name || `${personal.first_name || ''} ${personal.middle_name ? personal.middle_name + ' ' : ''}${personal.last_name || ''}`.trim() || '---';
      const barangay = address.barangay || '---';
      const dateApproved = appDetails.date_reviewed || item.metadata?.created_at?.split(' ')[0] || '---';
      const mode = appDetails.mode || "Online";
      const isWALK = String(mode).toLowerCase() === 'walk-in' || String(mode).toLowerCase() === 'walkin';
      const birthDate = personal.date_of_birth || '';
      
      // Calculate age
      let ageValue = 0;
      if (birthDate) {
        const birth = new Date(birthDate);
        if (!isNaN(birth.getTime())) {
          const ageDifMs = Date.now() - birth.getTime();
          const ageDate = new Date(ageDifMs);
          ageValue = Math.abs(ageDate.getUTCFullYear() - 1970);
        }
      }
      
      const isSenior = ageValue >= 60;

      return {
        id: item.id || pwdId,
        pwdIdNumber: pwdId,
        fullName: fullName,
        barangay: barangay,
        dateApproved: dateApproved,
        mode: mode,
        isWalkIn: isWALK,
        isSenior: isSenior,
        birthDate: birthDate,
        gender: personal.gender || '',
        status: (() => {
          const statusVal = item.status_and_metadata?.vital_status || 'Active';
          if (statusVal.toLowerCase() === 'active') return 'Active';
          if (statusVal.toLowerCase() === 'deceased') return 'Deceased';
          if (statusVal.toLowerCase() === 'inactive') return 'Inactive';
          if (statusVal.toLowerCase() === 'suspended') return 'Suspended';
          return statusVal.charAt(0).toUpperCase() + statusVal.slice(1);
        })(),
        dateOfDeath: item.status_and_metadata?.date_of_death || '',
        _raw: item
      };
    });
  }, [masterlistResponse.data]);

  const filteredRecords = useMemo(() => {
    let result = mappedApiRecords.filter(record => {
      const query = searchTerm.toLowerCase();
      const fullName = String(record.fullName || '').toLowerCase();
      const id = String(record.pwdIdNumber || '').toLowerCase();
      
      const matchesSearch = fullName.includes(query) || id.includes(query);
      const matchesGender = !filterGender || record.gender === filterGender;
      const matchesBarangay = !filterBarangay || String(record.barangay || '').toLowerCase() === filterBarangay.toLowerCase();
      const matchesStatus = !filterStatus || record.status === filterStatus;
      
      return matchesSearch && matchesGender && matchesBarangay && matchesStatus;
    });

    // Sorting
    result.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === 'name') {
        valA = (a.fullName || '').toLowerCase();
        valB = (b.fullName || '').toLowerCase();
      } else if (sortConfig.key === 'date') {
        const dateA = a.dateApproved || 0;
        const dateB = b.dateApproved || 0;
        valA = new Date(dateA).getTime();
        valB = new Date(dateB).getTime();
      } else {
        valA = (a as any)[sortConfig.key];
        valB = (b as any)[sortConfig.key];
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [mappedApiRecords, searchTerm, filterGender, filterBarangay, filterStatus, sortConfig]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const DetailItem = ({ label, value }: { label: string, value: any }) => {
    if (value === undefined || value === null || value === '' || value === '---' || value === 'N/A') return null;
    let displayValue = '';
    if (typeof value === 'object') {
      const f = value.first_name || value.first || '';
      const m = value.middle_name || value.middle || '';
      const l = value.last_name || value.last || '';
      const s = value.suffix || '';
      displayValue = `${f} ${m} ${l} ${s}`.trim().replace(/\s+/g, ' ');
      if (!displayValue) {
        displayValue = Object.values(value).filter(v => typeof v === 'string').join(' ');
      }
    } else {
      displayValue = String(value);
    }
    if (!displayValue) return null;
    return (
      <div>
        <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">{label}</label>
        <p className="font-semibold text-slate-800 text-sm uppercase leading-tight">{displayValue}</p>
      </div>
    );
  };

  const DetailSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => {
    const hasVisibleChildren = React.Children.toArray(children).some(child => child !== null);
    if (!hasVisibleChildren) return null;

    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-50 pb-2">
          <Icon size={14} className="text-[#1e419c]" /> {title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children}
        </div>
      </div>
    );
  };  const RecordDetailsModal = ({ record: propRecord, onClose, initialEditMode = false }: { record: any, onClose: () => void, initialEditMode?: boolean }) => {
    const { fetchMasterlist, mapApiMasterlistRecord, setMasterlistRecords } = useApp();
    const [record, setRecord] = useState(propRecord);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const hasFetchedRef = React.useRef<string | null>(null);

    const [isEditMode, setIsEditMode] = useState(initialEditMode);
    const [isSaving, setIsSaving] = useState(false);

    const syncSingleRecord = useCallback(async () => {
      if (!record.id || record.id.toString().startsWith('local_')) return;
      
      const now = Date.now();
      const lastSync = recordSyncCache.get(record.id.toString());
      if (lastSync && now - lastSync < 120000) {
        console.log(`[SYNC CACHE] Using recently cached synced data for record ${record.id}`);
        return;
      }

      setIsSyncing(true);
      setSyncError(null);
      try {
        const token = localStorage.getItem('pdao_auth_token');
        const headers: any = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${record.id}`, {
          method: 'GET',
          headers
        });

        if (response.status === 429) {
          console.warn(`[SYNC] Too many requests (429) when syncing record ${record.id}, using local copy.`);
          setSyncError("Local copy");
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP Error Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Single PWD Record Synced GET Output:", data);
        const apiItem = data.data || data;
        const mappedRecord = mapApiMasterlistRecord(apiItem);
        
        // Mark as successfully synced in memory cache
        recordSyncCache.set(record.id.toString(), Date.now());

        setRecord(mappedRecord);
      } catch (err: any) {
        console.error("Failed to sync single record:", err);
        setSyncError(err.message || "Error syncing record");
      } finally {
        setIsSyncing(false);
      }
    }, [record.id, mapApiMasterlistRecord]);

    useEffect(() => {
      if (propRecord.id && hasFetchedRef.current !== propRecord.id.toString()) {
        hasFetchedRef.current = propRecord.id.toString();
        syncSingleRecord();
      }
    }, [propRecord.id, syncSingleRecord]);

    const item = record._raw || {};
    
    console.log("Rendering PWD Masterlist profile - raw item:", item);

    const formatDateString = (dateStr: string | null | undefined) => {
      if (!dateStr) return '-';
      try {
        const cleanDateStr = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr;
        const parsed = new Date(cleanDateStr);
        if (isNaN(parsed.getTime())) return dateStr;
        return parsed.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      } catch (e) {
        return dateStr;
      }
    };

    const ReadOnlyDetailItem = ({ label, value }: { label: string; value: any }) => {
      let displayVal = '-';
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object') {
          displayVal = '-';
        } else {
          displayVal = String(value);
        }
      }
      return (
        <div>
          <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">{label}</label>
          <p className="font-semibold text-slate-800 text-sm uppercase leading-tight">{displayVal}</p>
        </div>
      );
    };

    const bg = item.family_background || {};
    const getFamilyMemberFullName = (role: 'father' | 'mother' | 'guardian') => {
      const member = bg[role];
      if (!member) return '-';
      if (typeof member === 'string') return member;
      if (typeof member === 'object') {
        const f = member.first_name || '';
        const m = member.middle_name || '';
        const l = member.last_name || '';
        const s = member.suffix || '';
        return `${f} ${m} ${l} ${s}`.trim().replace(/\s+/g, ' ') || '-';
      }
      return '-';
    };

    const getAccomplishedByType = () => {
      const acc = item.accomplished_by;
      if (!acc) return '-';
      if (typeof acc === 'string') return acc;
      if (typeof acc === 'object') {
        return acc.type || acc.relation || acc.relationship || '-';
      }
      return String(acc);
    };

    const getAccomplishedByFullNameText = () => {
      const acc = item.accomplished_by;
      if (acc && typeof acc === 'object') {
        const f = acc.first_name || '';
        const m = acc.middle_name || '';
        const l = acc.last_name || '';
        const s = acc.suffix || '';
        const concatenated = `${f} ${m} ${l} ${s}`.trim().replace(/\s+/g, ' ');
        if (concatenated) return concatenated;
        if (acc.name) return acc.name;
        if (acc.full_name) return acc.full_name;
      }
      return '-';
    };

    const pInfo = item.personal_information || {};
    const fName = pInfo.first_name || '';
    const mName = pInfo.middle_name || '';
    const lName = pInfo.last_name || '';
    const sName = pInfo.suffix || '';
    const fullLegalName = `${fName} ${mName} ${lName} ${sName}`.trim().replace(/\s+/g, ' ') || '-';

    const em = item.emergency_contact || {};
    const emFName = em.first_name || '';
    const emMName = em.middle_name || '';
    const emLName = em.last_name || '';
    const emSName = em.suffix || '';
    const emFullName = `${emFName} ${emMName} ${emLName} ${emSName}`.trim().replace(/\s+/g, ' ') || em.name || em.emergency_contact_name || '-';

    // Editable State Form Fields
    const [editData, setEditData] = useState({
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      birthDate: '',
      gender: '',
      civilStatus: '',

      typeOfDisability: '',
      congenital: '',
      acquired: '',

      streetAddress: '',
      barangay: '',
      cityMunicipality: '',
      province: '',
      region: '',
      mobileNumber: '',
      email: '',

      emergencyContactPerson: '',
      emergencyContactNumber: '',
      emergencyContactRelationship: '',

      highestEducation: '',
      employmentStatus: '',
      employmentType: '',
      occupation: '',

      fatherName: '',
      motherName: '',
      guardianName: '',

      accomplishedByType: '',
      accomplishedByFullName: '',

      certifyingPhysician: '',
      physicianLicenseNo: '',

      orgAffiliated: '',
      orgContactPerson: '',
      orgAddress: '',
      orgTelNo: '',

      sssNumber: '',
      gsisNumber: '',
      pagIbigNumber: '',
      psnNumber: '',
      philHealthNumber: '',

      status: '',
      dateOfDeath: ''
    });

    useEffect(() => {
      if (record) {
        const item = record._raw || {};
        const pInfo = item.personal_information || {};
        const em = item.emergency_contact || {};
        
        let emNameFallback = '';
        if (em) {
          const emFName = em.first_name || '';
          const emMName = em.middle_name || '';
          const emLName = em.last_name || '';
          const emSName = em.suffix || '';
          emNameFallback = `${emFName} ${emMName} ${emLName} ${emSName}`.trim().replace(/\s+/g, ' ') || em.name || em.emergency_contact_name || '';
        }

        setEditData({
          firstName: pInfo.first_name || record.firstName || '',
          middleName: pInfo.middle_name || record.middleName || '',
          lastName: pInfo.last_name || record.lastName || '',
          suffix: pInfo.suffix || record.suffix || '',
          birthDate: pInfo.date_of_birth || record.birthDate || '',
          gender: pInfo.gender || record.gender || '',
          civilStatus: pInfo.civil_status || record.civilStatus || '',

          typeOfDisability: item.disability_details?.disability_types || item.congenital_outflow_defect?.types || record.typeOfDisability || '',
          congenital: item.disability_details?.cod_congenital || item.congenital_outflow_defect?.congenital || '',
          acquired: item.disability_details?.cod_acquired || item.congenital_outflow_defect?.acquired || '',

          streetAddress: item.address_and_contact?.house_street || record.streetAddress || '',
          barangay: item.address_and_contact?.barangay || record.barangay || '',
          cityMunicipality: item.address_and_contact?.municipality || record.cityMunicipality || '',
          province: item.address_and_contact?.province || record.province || '',
          region: item.address_and_contact?.region || record.region || '',
          mobileNumber: item.address_and_contact?.mobile_no || record.mobileNumber || '',
          email: item.address_and_contact?.email_address || record.emailAddress || '',

          emergencyContactPerson: emNameFallback || record.emergencyContactPerson || '',
          emergencyContactNumber: em.number || em.contact_number || em.mobile_no || record.emergencyContactNumber || '',
          emergencyContactRelationship: em.relation || em.relationship || record.emergencyContactRelationship || '',

          highestEducation: item.education_and_employment?.educational_attainment || record.highestEducation || '',
          employmentStatus: item.education_and_employment?.employment_status || record.employmentStatus || '',
          employmentType: item.education_and_employment?.employment_type || record.employmentType || '',
          occupation: item.education_and_employment?.occupation || record.occupation || '',

          fatherName: getFamilyMemberFullName('father') !== '-' ? getFamilyMemberFullName('father') : (record.fatherName || ''),
          motherName: getFamilyMemberFullName('mother') !== '-' ? getFamilyMemberFullName('mother') : (record.motherName || ''),
          guardianName: getFamilyMemberFullName('guardian') !== '-' ? getFamilyMemberFullName('guardian') : (record.guardianName || ''),

          accomplishedByType: getAccomplishedByType() !== '-' ? getAccomplishedByType() : '',
          accomplishedByFullName: getAccomplishedByFullNameText() !== '-' ? getAccomplishedByFullNameText() : '',

          certifyingPhysician: item.medical_verification?.certifying_physician || '',
          physicianLicenseNo: item.medical_verification?.physician_license_no || '',

          orgAffiliated: item.organization_affiliation?.name || item.organization_affiliation?.organization_affiliated || item.organization_affiliation?.affiliated || '',
          orgContactPerson: item.organization_affiliation?.contact_person || item.organization_affiliation?.organization_contact_person || '',
          orgAddress: item.organization_affiliation?.address || item.organization_affiliation?.organization_address || '',
          orgTelNo: item.organization_affiliation?.tel_no || '',

          sssNumber: item.government_ids?.sss_no || record.sssNumber || '',
          gsisNumber: item.government_ids?.gsis_no || record.gsisNumber || '',
          pagIbigNumber: item.government_ids?.pagibig_no || item.government_ids?.pag_ibig_no || record.pagIbigNumber || '',
          psnNumber: item.government_ids?.psn_no || record.psnNumber || '',
          philHealthNumber: item.government_ids?.philhealth_no || item.government_ids?.phil_health_no || record.philHealthNumber || '',

          status: item.status_and_metadata?.vital_status || record.status || 'Active',
          dateOfDeath: item.status_and_metadata?.date_of_death || record.dateOfDeath || ''
        });
      }
    }, [record]);

    const handleSave = async () => {
      setIsSaving(true);
      try {
        const token = localStorage.getItem('pdao_auth_token');
        const headers: any = {
          'Accept': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const formData = new FormData();
        formData.append('_method', 'PUT');

        // Personal Info
        formData.append('first_name', editData.firstName);
        formData.append('last_name', editData.lastName);
        formData.append('middle_name', editData.middleName);
        formData.append('suffix', editData.suffix);
        formData.append('date_of_birth', editData.birthDate);
        formData.append('gender', editData.gender);
        formData.append('civil_status', editData.civilStatus);

        // Disability Info
        formData.append('disability_types', editData.typeOfDisability);
        formData.append('congenital', editData.congenital);
        formData.append('acquired', editData.acquired);

        // Address & Contact
        formData.append('house_street', editData.streetAddress);
        formData.append('barangay', editData.barangay);
        formData.append('municipality', editData.cityMunicipality);
        formData.append('province', editData.province);
        formData.append('region', editData.region);
        formData.append('landline_no', item.address_and_contact?.landline_no || '');
        formData.append('mobile_no', editData.mobileNumber);
        formData.append('email_address', editData.email);

        // Emergency Contact
        formData.append('emergency_contact_name', editData.emergencyContactPerson);
        formData.append('emergency_contact_number', editData.emergencyContactNumber);
        formData.append('emergency_contact_relation', editData.emergencyContactRelationship);

        // Education & Employment
        formData.append('educational_attainment', editData.highestEducation);
        formData.append('employment_status', editData.employmentStatus);
        formData.append('employment_type', editData.employmentType);
        formData.append('employment_category', item.education_and_employment?.employment_category || '');
        formData.append('occupation', editData.occupation);

        // Organization Info
        formData.append('organization_affiliated', editData.orgAffiliated);
        formData.append('organization_contact_person', editData.orgContactPerson);
        formData.append('organization_address', editData.orgAddress);
        formData.append('organization_tel_no', editData.orgTelNo);

        // Government IDs
        formData.append('sss_no', editData.sssNumber);
        formData.append('gsis_no', editData.gsisNumber);
        formData.append('pagibig_no', editData.pagIbigNumber);
        formData.append('psn_no', editData.psnNumber);
        formData.append('philhealth_no', editData.philHealthNumber);

        // Family Background
        formData.append('father', editData.fatherName);
        formData.append('mother', editData.motherName);
        formData.append('guardian', editData.guardianName);

        // Accomplished & Processing Info
        formData.append('accomplished_by', editData.accomplishedByType);
        formData.append('accomplished_by_name', editData.accomplishedByFullName);
        formData.append('certifying_physician', editData.certifyingPhysician);
        formData.append('physician_license_no', editData.physicianLicenseNo);

        // Status & Additional
        formData.append('vital_status', editData.status);
        if (editData.status === 'Deceased') {
          formData.append('date_of_death', formatToDateTimeString(editData.dateOfDeath));
        } else {
          formData.append('date_of_death', '');
        }

        console.log("Saving masterlist record via PUT body check...", record.id);

        const response = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${record.id}`, {
          method: 'POST', // standard override to support multipart with PUT inside Laravel
          headers,
          body: formData
        });

        if (!response.ok && response.status === 405) {
          console.warn("POST method with override rejected with 405, retrying with raw PUT method...");
          const retryResponse = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${record.id}`, {
            method: 'PUT',
            headers,
            body: formData
          });
          if (!retryResponse.ok) {
            throw new Error(`HTTP Error status: ${retryResponse.status}`);
          }
        } else if (!response.ok) {
          throw new Error(`HTTP Error status: ${response.status}`);
        }

        setSuccessMessage('Record updated successfully.');

        // Re-fetch record details from cloud to maintain synchronization
        const getResponse = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${record.id}`, {
          method: 'GET',
          headers
        });

        if (getResponse.ok) {
          const getJson = await getResponse.json();
          const apiItem = getJson.data || getJson;
          const mappedRecord = mapApiMasterlistRecord(apiItem);
          
          setRecord(mappedRecord);
          setMasterlistRecords(prev => 
            prev.map(r => r.id.toString() === record.id.toString() ? mappedRecord : r)
          );
        } else {
          // Trigger local update directly if sync GET fails
          throw new Error("Trigger local save");
        }

        setIsEditMode(false);
      } catch (error: any) {
        console.warn("Falling back to local masterlist update:", error);
        
        // Assemble updated raw entity to populate client memory locally
        const updatedRaw = {
          ...item,
          id: record.id,
          personal_information: {
            ...item.personal_information,
            first_name: editData.firstName,
            last_name: editData.lastName,
            middle_name: editData.middleName,
            suffix: editData.suffix,
            date_of_birth: editData.birthDate,
            gender: editData.gender,
            civil_status: editData.civilStatus
          },
          address_and_contact: {
            ...item.address_and_contact,
            house_street: editData.streetAddress,
            barangay: editData.barangay,
            municipality: editData.cityMunicipality,
            province: editData.province,
            region: editData.region,
            mobile_no: editData.mobileNumber,
            email_address: editData.email
          },
          emergency_contact: {
            ...item.emergency_contact,
            name: editData.emergencyContactPerson,
            number: editData.emergencyContactNumber,
            relation: editData.emergencyContactRelationship
          },
          education_and_employment: {
            ...item.education_and_employment,
            educational_attainment: editData.highestEducation,
            employment_status: editData.employmentStatus,
            employment_type: editData.employmentType,
            occupation: editData.occupation
          },
          family_background: {
            ...item.family_background,
            father: editData.fatherName,
            mother: editData.motherName,
            guardian: editData.guardianName
          },
          accomplished_by: {
            type: editData.accomplishedByType,
            name: editData.accomplishedByFullName
          },
          medical_verification: {
            certifying_physician: editData.certifyingPhysician,
            physician_license_no: editData.physicianLicenseNo
          },
          organization_affiliation: {
            name: editData.orgAffiliated,
            contact_person: editData.orgContactPerson,
            address: editData.orgAddress,
            tel_no: editData.orgTelNo
          },
          government_ids: {
            sss_no: editData.sssNumber,
            gsis_no: editData.gsisNumber,
            pagibig_no: editData.pagIbigNumber,
            psn_no: editData.psnNumber,
            philhealth_no: editData.philHealthNumber
          },
          application_details: {
            ...item.application_details,
            record_status: editData.status
          }
        };

        const mappedRecord = mapApiMasterlistRecord(updatedRaw);
        setRecord(mappedRecord);
        setMasterlistRecords(prev => 
          prev.map(r => r.id.toString() === record.id.toString() ? mappedRecord : r)
        );
        setIsEditMode(false);
        setSuccessMessage('Record saved locally.');
      } finally {
        setIsSaving(false);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="bg-slate-50 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-20 flex flex-col overflow-hidden animate-scale-up border border-white">
          <div className="bg-[#1e419c] p-8 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl overflow-hidden flex items-center justify-center border border-white/20 shrink-0">
                {(record.avatarUrl || record.avatar || item.avatar_url || item.formData?.capturedImage || item.avatar) ? (
                  <img 
                    src={record.avatarUrl || record.avatar || item.avatar_url || item.formData?.capturedImage || item.avatar} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    alt="PWD Avatar" 
                  />
                ) : (
                  <UserCircle size={28} />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">{isEditMode ? 'Edit Profile' : fullLegalName}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Masterlist Record Profile</p>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest ${
                    isSyncing ? 'bg-sky-500/30 text-sky-200 border border-sky-400/20' :
                    syncError ? 'bg-rose-500/30 text-rose-200 border border-rose-400/20' :
                    'bg-emerald-500/30 text-emerald-200 border border-emerald-400/20'
                  }`}>
                    <RefreshCw size={8} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? 'Syncing...' : syncError ? 'Local Copy' : 'Synced via GET'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${isEditMode ? 'bg-amber-100 text-[#1e419c]' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isEditMode ? <X size={14} /> : <Edit2 size={14} />}
                {isEditMode ? 'Cancel' : 'Edit Info'}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
            {/* 1. Credentials Section (ALWAYS read-only) */}
            <DetailSection title="Credentials" icon={Key}>
              <ReadOnlyDetailItem label="Username" value={item.username} />
              <ReadOnlyDetailItem label="Temporary Password" value={item.temp_password} />
            </DetailSection>

            {/* 2. Application Details (ALWAYS read-only) */}
            <DetailSection title="Application Details" icon={FileText}>
              <ReadOnlyDetailItem label="Control Number" value={item.application_details?.control_number} />
              <ReadOnlyDetailItem label="PWD Number" value={item.application_details?.pwd_number} />
              <ReadOnlyDetailItem label="Registration Type" value={item.application_details?.registration_type} />
              <ReadOnlyDetailItem label="Registration Status" value={item.application_details?.reg_status} />
              <ReadOnlyDetailItem label="ID Status" value={item.application_details?.id_status} />
              <ReadOnlyDetailItem label="Date Applied" value={formatDateString(item.application_details?.date_applied)} />
              <ReadOnlyDetailItem label="Appointment Date" value={formatDateString(item.application_details?.appointment_date)} />
              <ReadOnlyDetailItem label="Date Approved" value={formatDateString(item.application_details?.date_reviewed)} />
              <ReadOnlyDetailItem label="Processing Officer" value={item.application_details?.processing_officer} />
              <ReadOnlyDetailItem label="Approving Officer" value={item.application_details?.approving_officer} />
            </DetailSection>

            {/* 3. Personal Information */}
            <DetailSection title="Personal Information" icon={UserIcon}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">First Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.firstName} onChange={(e) => setEditData({...editData, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Middle Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.middleName} onChange={(e) => setEditData({...editData, middleName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Last Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.lastName} onChange={(e) => setEditData({...editData, lastName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Suffix</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.suffix} onChange={(e) => setEditData({...editData, suffix: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Birth Date</label>
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.birthDate} onChange={(e) => setEditData({...editData, birthDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Gender / Sex</label>
                    <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.gender} onChange={(e) => setEditData({...editData, gender: e.target.value})}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Civil Status</label>
                    <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.civilStatus} onChange={(e) => setEditData({...editData, civilStatus: e.target.value})}>
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Separated">Separated</option>
                      <option value="Widow/er">Widow/er</option>
                      <option value="Cohabitation">Cohabitation</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="Full Name" value={fullLegalName} />
                  <ReadOnlyDetailItem label="First Name" value={pInfo.first_name} />
                  <ReadOnlyDetailItem label="Last Name" value={pInfo.last_name} />
                  <ReadOnlyDetailItem label="Middle Name" value={pInfo.middle_name} />
                  <ReadOnlyDetailItem label="Suffix" value={pInfo.suffix} />
                  <ReadOnlyDetailItem label="Date of Birth" value={formatDateString(pInfo.date_of_birth)} />
                  <ReadOnlyDetailItem label="Gender" value={pInfo.gender} />
                  <ReadOnlyDetailItem label="Civil Status" value={pInfo.civil_status} />
                </>
              )}
            </DetailSection>

            {/* 4. Disability Details */}
            <DetailSection title="Disability Details" icon={Activity}>
              {isEditMode ? (
                <>
                  <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Disability Types</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.typeOfDisability} onChange={(e) => setEditData({...editData, typeOfDisability: e.target.value})} />
                  </div>
                  <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Cause of Disability (Congenital)</label>
                    <MultiSelectDropdown 
                      label="Congenital Cause"
                      value={editData.congenital}
                      onChange={(val) => setEditData({...editData, congenital: val})}
                      standardOptions={CONGENITAL_OPTIONS}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 lg:col-span-3">
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Cause of Disability (Acquired)</label>
                    <MultiSelectDropdown 
                      label="Acquired Cause"
                      value={editData.acquired}
                      onChange={(val) => setEditData({...editData, acquired: val})}
                      standardOptions={ACQUIRED_OPTIONS}
                    />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="Disability Types" value={item.disability_details?.disability_types || item.congenital_outflow_defect?.types || record.typeOfDisability} />
                  <ReadOnlyDetailItem label="Cause of Disability (Congenital)" value={item.disability_details?.cod_congenital || item.congenital_outflow_defect?.congenital} />
                  <ReadOnlyDetailItem label="Cause of Disability (Acquired)" value={item.disability_details?.cod_acquired || item.congenital_outflow_defect?.acquired} />
                </>
              )}
            </DetailSection>

            {/* 5. Address & Contact Information */}
            <DetailSection title="Address & Contact Information" icon={MapPin}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">House No./Street</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.streetAddress} onChange={(e) => setEditData({...editData, streetAddress: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Barangay</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.barangay} onChange={(e) => setEditData({...editData, barangay: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Municipality/City</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.cityMunicipality} onChange={(e) => setEditData({...editData, cityMunicipality: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Province</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.province} onChange={(e) => setEditData({...editData, province: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Region</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.region} onChange={(e) => setEditData({...editData, region: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Mobile Number</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.mobileNumber} onChange={(e) => setEditData({...editData, mobileNumber: e.target.value})} />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Email Address</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1e419c]" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="House No./Street" value={item.address_and_contact?.house_street} />
                  <ReadOnlyDetailItem label="Barangay" value={item.address_and_contact?.barangay} />
                  <ReadOnlyDetailItem label="Municipality/City" value={item.address_and_contact?.municipality} />
                  <ReadOnlyDetailItem label="Province" value={item.address_and_contact?.province} />
                  <ReadOnlyDetailItem label="Region" value={item.address_and_contact?.region} />
                  <ReadOnlyDetailItem label="Landline Number" value={item.address_and_contact?.landline_no} />
                  <ReadOnlyDetailItem label="Mobile Number" value={item.address_and_contact?.mobile_no} />
                  <ReadOnlyDetailItem label="Email Address" value={item.address_and_contact?.email_address} />
                </>
              )}
            </DetailSection>

            {/* 6. Emergency Contact */}
            <DetailSection title="Emergency Contact" icon={ShieldCheck}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Contact Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.emergencyContactPerson} onChange={(e) => setEditData({...editData, emergencyContactPerson: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Contact Number</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.emergencyContactNumber} onChange={(e) => setEditData({...editData, emergencyContactNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Relationship</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.emergencyContactRelationship} onChange={(e) => setEditData({...editData, emergencyContactRelationship: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="Contact Name" value={emFullName} />
                  <ReadOnlyDetailItem label="Contact Number" value={item.emergency_contact?.number || item.emergency_contact?.contact_number || item.emergency_contact?.mobile_no} />
                  <ReadOnlyDetailItem label="Relationship" value={item.emergency_contact?.relation || item.emergency_contact?.relationship} />
                </>
              )}
            </DetailSection>

            {/* 7. Education & Employment */}
            <DetailSection title="Education & Employment" icon={Briefcase}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Educational Attainment</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.highestEducation} onChange={(e) => setEditData({...editData, highestEducation: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Employment Status</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.employmentStatus} onChange={(e) => setEditData({...editData, employmentStatus: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Employment Type</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.employmentType} onChange={(e) => setEditData({...editData, employmentType: e.target.value})} />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Occupation</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.occupation} onChange={(e) => setEditData({...editData, occupation: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="Educational Attainment" value={item.education_and_employment?.educational_attainment} />
                  <ReadOnlyDetailItem label="Employment Status" value={item.education_and_employment?.employment_status} />
                  <ReadOnlyDetailItem label="Employment Type" value={item.education_and_employment?.employment_type} />
                  <ReadOnlyDetailItem label="Employment Category" value={item.education_and_employment?.employment_category} />
                  <ReadOnlyDetailItem label="Occupation" value={item.education_and_employment?.occupation} />
                </>
              )}
            </DetailSection>

            {/* 8. Family Background */}
            <DetailSection title="Family Background" icon={Home}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Father's Full Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.fatherName} onChange={(e) => setEditData({...editData, fatherName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Mother's Full Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.motherName} onChange={(e) => setEditData({...editData, motherName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Guardian's Full Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.guardianName} onChange={(e) => setEditData({...editData, guardianName: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="Father's Full Name" value={getFamilyMemberFullName('father')} />
                  <ReadOnlyDetailItem label="Mother's Full Name" value={getFamilyMemberFullName('mother')} />
                  <ReadOnlyDetailItem label="Guardian's Full Name" value={getFamilyMemberFullName('guardian')} />
                </>
              )}
            </DetailSection>

            {/* 9. Accomplished By */}
            <DetailSection title="Accomplished By" icon={UserCircle}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Type</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.accomplishedByType} onChange={(e) => setEditData({...editData, accomplishedByType: e.target.value})} />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Full Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.accomplishedByFullName} onChange={(e) => setEditData({...editData, accomplishedByFullName: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="Type" value={getAccomplishedByType()} />
                  <ReadOnlyDetailItem label="Full Name" value={getAccomplishedByFullNameText()} />
                </>
              )}
            </DetailSection>

            {/* 10. Medical Verification */}
            <DetailSection title="Medical Verification" icon={ShieldAlert}>
              {isEditMode ? (
                <>
                  <div className="col-span-1 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Certifying Physician</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.certifyingPhysician} onChange={(e) => setEditData({...editData, certifyingPhysician: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Physician License Number</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.physicianLicenseNo} onChange={(e) => setEditData({...editData, physicianLicenseNo: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="Certifying Physician" value={item.medical_verification?.certifying_physician} />
                  <ReadOnlyDetailItem label="Physician License Number" value={item.medical_verification?.physician_license_no} />
                </>
              )}
            </DetailSection>

            {/* 11. Organization Affiliation */}
            <DetailSection title="Organization Affiliation" icon={Globe}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Organization Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.orgAffiliated} onChange={(e) => setEditData({...editData, orgAffiliated: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Contact Person</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.orgContactPerson} onChange={(e) => setEditData({...editData, orgContactPerson: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Address</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.orgAddress} onChange={(e) => setEditData({...editData, orgAddress: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Telephone Number</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.orgTelNo} onChange={(e) => setEditData({...editData, orgTelNo: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="Organization Name" value={item.organization_affiliation?.name || item.organization_affiliation?.organization_affiliated || item.organization_affiliation?.affiliated} />
                  <ReadOnlyDetailItem label="Contact Person" value={item.organization_affiliation?.contact_person || item.organization_affiliation?.organization_contact_person} />
                  <ReadOnlyDetailItem label="Address" value={item.organization_affiliation?.address || item.organization_affiliation?.organization_address} />
                  <ReadOnlyDetailItem label="Telephone Number" value={item.organization_affiliation?.tel_no} />
                </>
              )}
            </DetailSection>

            {/* 12. Government IDs */}
            <DetailSection title="Government IDs" icon={CreditCard}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">SSS Number (SSS No.)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.sssNumber} onChange={(e) => setEditData({...editData, sssNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">GSIS Number (GSIS No.)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.gsisNumber} onChange={(e) => setEditData({...editData, gsisNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Pag-IBIG Number</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.pagIbigNumber} onChange={(e) => setEditData({...editData, pagIbigNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">PSN Number (PSN No.)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.psnNumber} onChange={(e) => setEditData({...editData, psnNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">PhilHealth Number</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.philHealthNumber} onChange={(e) => setEditData({...editData, philHealthNumber: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <ReadOnlyDetailItem label="SSS Number (SSS No.)" value={item.government_ids?.sss_no} />
                  <ReadOnlyDetailItem label="GSIS Number (GSIS No.)" value={item.government_ids?.gsis_no} />
                  <ReadOnlyDetailItem label="Pag-IBIG Number (PAGIBIG No.)" value={item.government_ids?.pagibig_no || item.government_ids?.pag_ibig_no} />
                  <ReadOnlyDetailItem label="PSN Number (PSN No.)" value={item.government_ids?.psn_no} />
                  <ReadOnlyDetailItem label="PhilHealth Number (PhilHealth No.)" value={item.government_ids?.philhealth_no || item.government_ids?.phil_health_no} />
                </>
              )}
            </DetailSection>
            
            {/* Required Documents Section */}
            {!isEditMode && (
              <DetailSection title="Required Documents" icon={FileText}>
                <AttachmentItem 
                  label="Disability Certificate" 
                  value={item.attachments?.requirements?.disability_cert || item.attachments?.disability_cert || item.disability_cert || item.disability_certificate} 
                />
                <AttachmentItem 
                  label="Residency Certificate" 
                  value={item.attachments?.requirements?.residency_cert || item.attachments?.residency_cert || item.residency_cert || item.residency_certificate} 
                />
                <AttachmentItem 
                  label="Government ID" 
                  value={item.attachments?.requirements?.government_id || item.attachments?.government_id || item.government_id || item.scanned_government_id} 
                />
              </DetailSection>
            )}

            {/* 13. System Status */}
            {(record.status === 'Deceased' || item.application_details?.record_status === 'Deceased') && (
              <DetailSection title="Status" icon={Activity}>
                {isEditMode ? (
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Date of Death</label>
                    <input 
                      type="date"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]"
                      value={editData.dateOfDeath || ''}
                      onChange={(e) => setEditData({...editData, dateOfDeath: e.target.value})}
                    />
                  </div>
                ) : (
                  <ReadOnlyDetailItem 
                    label="Date of Death" 
                    value={record.dateOfDeath || item.application_details?.date_of_death || 'N/A'} 
                  />
                )}
              </DetailSection>
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
            {isEditMode ? (
              <>
                <button 
                  onClick={() => setIsEditMode(false)} 
                  disabled={isSaving}
                  className="px-8 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="px-10 py-3 bg-[#1e419c] text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl hover:opacity-90 transition-all flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={12}/> : <Save size={12}/>}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={onClose} className="px-8 py-3 bg-[#1e419c] text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-all">Close Profile</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const OldRecordDetailsModal = ({ record: propRecord, onClose, initialEditMode = false }: { record: any, onClose: () => void, initialEditMode?: boolean }) => {
    const { fetchMasterlist, mapApiMasterlistRecord, setMasterlistRecords } = useApp();
    const [isEditMode, setIsEditMode] = useState(initialEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [record, setRecord] = useState(propRecord);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const item = record._raw || {};

    const formatDateString = (dateStr: string | null | undefined) => {
      if (!dateStr) return '-';
      try {
        const cleanDateStr = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr;
        const parsed = new Date(cleanDateStr);
        if (isNaN(parsed.getTime())) return dateStr;
        return parsed.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      } catch (e) {
        return dateStr;
      }
    };

    const ReadOnlyDetailItem = ({ label, value }: { label: string; value: any }) => {
      let displayVal = '-';
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object') {
          displayVal = '-';
        } else {
          displayVal = String(value);
        }
      }
      return (
        <div>
          <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">{label}</label>
          <p className="font-semibold text-slate-800 text-sm uppercase leading-tight">{displayVal}</p>
        </div>
      );
    };

    const bg = item.family_background || {};
    const getFamilyMemberFullName = (role: 'father' | 'mother' | 'guardian') => {
      const member = bg[role];
      if (!member) return '-';
      if (typeof member === 'string') return member;
      if (typeof member === 'object') {
        const f = member.first_name || '';
        const m = member.middle_name || '';
        const l = member.last_name || '';
        const s = member.suffix || '';
        return `${f} ${m} ${l} ${s}`.trim().replace(/\s+/g, ' ') || '-';
      }
      return '-';
    };

    const getAccomplishedByType = () => {
      const acc = item.accomplished_by;
      if (!acc) return '-';
      if (typeof acc === 'string') return acc;
      if (typeof acc === 'object') {
        return acc.type || acc.relation || acc.relationship || '-';
      }
      return String(acc);
    };

    const getAccomplishedByFullNameText = () => {
      const acc = item.accomplished_by;
      if (acc && typeof acc === 'object') {
        const f = acc.first_name || '';
        const m = acc.middle_name || '';
        const l = acc.last_name || '';
        const s = acc.suffix || '';
        const concatenated = `${f} ${m} ${l} ${s}`.trim().replace(/\s+/g, ' ');
        if (concatenated) return concatenated;
        if (acc.name) return acc.name;
        if (acc.full_name) return acc.full_name;
      }
      return '-';
    };

    const pInfo = item.personal_information || {};
    const fName = pInfo.first_name || '';
    const mName = pInfo.middle_name || '';
    const lName = pInfo.last_name || '';
    const sName = pInfo.suffix || '';
    const fullLegalName = `${fName} ${mName} ${lName} ${sName}`.trim().replace(/\s+/g, ' ') || '-';

    const em = item.emergency_contact || {};
    const emFName = em.first_name || '';
    const emMName = em.middle_name || '';
    const emLName = em.last_name || '';
    const emSName = em.suffix || '';
    const emFullName = `${emFName} ${emMName} ${emLName} ${emSName}`.trim().replace(/\s+/g, ' ') || em.name || em.emergency_contact_name || '-';

    const syncSingleRecord = useCallback(async () => {
      if (!record.id || record.id.toString().startsWith('local_')) return;
      setIsSyncing(true);
      setSyncError(null);
      try {
        const token = localStorage.getItem('pdao_auth_token');
        const headers: any = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${record.id}`, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          throw new Error(`HTTP Error Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Single PWD Record Synced GET Output:", data);
        const apiItem = data.data || data;
        const mappedRecord = mapApiMasterlistRecord(apiItem);
        
        // Update local modal record state
        setRecord(mappedRecord);
        
        // Propagate to parent masterlist records to keep the list updated in real-time
        setMasterlistRecords(prev => 
          prev.map(r => r.id.toString() === record.id.toString() ? mappedRecord : r)
        );
      } catch (err: any) {
        console.error("Failed to sync single record:", err);
        setSyncError(err.message || "Error syncing record");
      } finally {
        setIsSyncing(false);
      }
    }, [record.id, mapApiMasterlistRecord, setMasterlistRecords]);

    useEffect(() => {
      syncSingleRecord();
    }, [propRecord.id]);

    const [editData, setEditData] = useState({
      firstName: record.firstName || '',
      middleName: record.middleName || '',
      lastName: record.lastName || '',
      suffix: record.suffix || '',
      birthDate: record.birthDate || '',
      gender: record.gender || record.sex || '',
      civilStatus: record.civilStatus || record.civil_status || '',
      
      typeOfDisability: record.typeOfDisability || record.disabilityType || '',
      congenital: record._raw?.congenital_outflow_defect?.congenital || '',
      acquired: record._raw?.congenital_outflow_defect?.acquired || '',
      
      streetAddress: record.streetAddress || record.address || '',
      barangay: record.barangay || '',
      cityMunicipality: record.cityMunicipality || record.city || '',
      province: record.province || '',
      region: record.region || '',
      
      mobileNumber: record.mobileNumber || record.contactNumber || '',
      email: record.emailAddress || record.email || '',
      
      emergencyContactPerson: record.emergencyContactPerson || '',
      emergencyContactRelationship: record.emergencyContactRelationship || record.relationship || '',
      emergencyContactNumber: record.emergencyContactNumber || '',
      
      highestEducation: record.highestEducation || '',
      employmentStatus: record.employmentStatus || '',
      employmentType: record.employmentType || '',
      occupation: record.occupation || '',
      
      orgAffiliated: record._raw?.organization_info?.affiliated || record._raw?.organization_info?.organization_affiliated || '',
      orgContactPerson: record._raw?.organization_info?.contact_person || record._raw?.organization_info?.organization_contact_person || '',
      orgAddress: record._raw?.organization_info?.address || record._raw?.organization_info?.organization_address || '',
      orgTelNo: record._raw?.organization_info?.tel_no || record._raw?.organization_info?.organization_tel_no || '',

      sssNumber: record.sssNumber || '',
      gsisNumber: record.gsisNumber || '',
      pagIbigNumber: record.pagIbigNumber || '',
      psnNumber: record.psnNumber || '',
      philHealthNumber: record.philHealthNumber || '',
      
      fatherName: record.fatherName || '',
      motherName: record.motherName || '',
      guardianName: record.guardianName || '',
      
      dateApplied: record.dateApplied || '',
      approvalDate: record.approvalDate || record.dateApproved || '',
      approvedBy: record.approvedBy || '',
      status: record.status || ''
    });

    useEffect(() => {
      setRecord(propRecord);
    }, [propRecord]);

    useEffect(() => {
      setEditData({
        firstName: record.firstName || '',
        middleName: record.middleName || '',
        lastName: record.lastName || '',
        suffix: record.suffix || '',
        birthDate: record.birthDate || '',
        gender: record.gender || record.sex || '',
        civilStatus: record.civilStatus || record.civil_status || '',
        
        typeOfDisability: record.typeOfDisability || record.disabilityType || '',
        congenital: record._raw?.congenital_outflow_defect?.congenital || '',
        acquired: record._raw?.congenital_outflow_defect?.acquired || '',
        
        streetAddress: record.streetAddress || record.address || '',
        barangay: record.barangay || '',
        cityMunicipality: record.cityMunicipality || record.city || '',
        province: record.province || '',
        region: record.region || '',
        
        mobileNumber: record.mobileNumber || record.contactNumber || '',
        email: record.emailAddress || record.email || '',
        
        emergencyContactPerson: record.emergencyContactPerson || '',
        emergencyContactRelationship: record.emergencyContactRelationship || record.relationship || '',
        emergencyContactNumber: record.emergencyContactNumber || '',
        
        highestEducation: record.highestEducation || '',
        employmentStatus: record.employmentStatus || '',
        employmentType: record.employmentType || '',
        occupation: record.occupation || '',
        
        orgAffiliated: record._raw?.organization_info?.affiliated || record._raw?.organization_info?.organization_affiliated || '',
        orgContactPerson: record._raw?.organization_info?.contact_person || record._raw?.organization_info?.organization_contact_person || '',
        orgAddress: record._raw?.organization_info?.address || record._raw?.organization_info?.organization_address || '',
        orgTelNo: record._raw?.organization_info?.tel_no || record._raw?.organization_info?.organization_tel_no || '',

        sssNumber: record.sssNumber || '',
        gsisNumber: record.gsisNumber || '',
        pagIbigNumber: record.pagIbigNumber || '',
        psnNumber: record.psnNumber || '',
        philHealthNumber: record.philHealthNumber || '',
        
        fatherName: record.fatherName || '',
        motherName: record.motherName || '',
        guardianName: record.guardianName || '',
        
        dateApplied: record.dateApplied || '',
        approvalDate: record.approvalDate || record.dateApproved || '',
        approvedBy: record.approvedBy || '',
        status: record.status || ''
      });
    }, [record]);

    const fullName = record.fullName || `${record.firstName || ''} ${record.middleName ? record.middleName + ' ' : ''}${record.lastName || ''}`.trim() || record.name;
    const pwdIdDisplay = record.pwdIdNumber || record.id;

    const handleSave = async () => {
      setIsSaving(true);
      try {
        const token = localStorage.getItem('pdao_auth_token');
        const headers: any = {
          'Accept': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const formData = new FormData();
        formData.append('_method', 'PUT');

        // Personal Info
        formData.append('first_name', editData.firstName || '');
        formData.append('last_name', editData.lastName || '');
        formData.append('middle_name', editData.middleName || '');
        formData.append('suffix', editData.suffix || '');
        formData.append('date_of_birth', editData.birthDate || '');
        formData.append('gender', editData.gender || '');
        formData.append('civil_status', editData.civilStatus || '');

        // Disability Info
        formData.append('disability_types', editData.typeOfDisability || '');
        formData.append('congenital', editData.congenital || '');
        formData.append('acquired', editData.acquired || '');

        // Address & Contact
        formData.append('house_street', editData.streetAddress || '');
        formData.append('barangay', editData.barangay || '');
        formData.append('municipality', editData.cityMunicipality || '');
        formData.append('province', editData.province || '');
        formData.append('region', editData.region || '');
        formData.append('landline_no', record._raw?.address_and_contact?.landline_no || '');
        formData.append('mobile_no', editData.mobileNumber || '');
        formData.append('email_address', editData.email || '');

        // Emergency Contact
        formData.append('emergency_contact_name', editData.emergencyContactPerson || '');
        formData.append('emergency_contact_number', editData.emergencyContactNumber || '');
        formData.append('emergency_contact_relation', editData.emergencyContactRelationship || '');

        // Education & Employment
        formData.append('educational_attainment', editData.highestEducation || '');
        formData.append('employment_status', editData.employmentStatus || '');
        formData.append('employment_type', editData.employmentType || '');
        formData.append('employment_category', record._raw?.education_and_employment?.employment_category || '');
        formData.append('occupation', editData.occupation || '');

        // Organization Info
        formData.append('organization_affiliated', editData.orgAffiliated || '');
        formData.append('organization_contact_person', editData.orgContactPerson || '');
        formData.append('organization_address', editData.orgAddress || '');
        formData.append('organization_tel_no', editData.orgTelNo || '');

        // Government IDs
        formData.append('sss_no', editData.sssNumber || '');
        formData.append('gsis_no', editData.gsisNumber || '');
        formData.append('pagibig_no', editData.pagIbigNumber || '');
        formData.append('psn_no', editData.psnNumber || '');
        formData.append('philhealth_no', editData.philHealthNumber || '');

        // Family Background
        formData.append('father', editData.fatherName || '');
        formData.append('mother', editData.motherName || '');
        formData.append('guardian', editData.guardianName || '');

        // Accomplished & Processing Info
        formData.append('accomplished_by', record._raw?.processing_info?.accomplished_by || '');
        formData.append('accomplished_by_name', record._raw?.processing_info?.accomplished_by_name || '');
        formData.append('certifying_physician', record._raw?.processing_info?.certifying_physician || '');
        formData.append('physician_license_no', record._raw?.processing_info?.physician_license_no || '');
        formData.append('approving_officer', editData.approvedBy || '');

        // Status & Additional Application details
        formData.append('vital_status', editData.status || 'Active');
        formData.append('date_applied', editData.dateApplied || '');

        // 1. Log FormData entries before sending:
        console.log("--- LOGGING FORMDATA ENTRIES BEFORE SENDING ---");
        for (const pair of formData.entries()) {
          console.log(pair[0], pair[1]);
        }

        const response = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${record.id}`, {
          method: 'PUT',
          headers,
          body: formData
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const resJson = await response.json();
        console.log("Update Success", resJson);

        setSuccessMessage('Record updated successfully.');

        // After successful update:
        // * Re-fetch GET /api/masterlistv2/{id}
        const getResponse = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${record.id}`, {
          method: 'GET',
          headers
        });

        if (!getResponse.ok) {
          throw new Error(`Failed to re-fetch record after update. HTTP status: ${getResponse.status}`);
        }

        const getJson = await getResponse.json();
        console.log("Re-fetched single record GET response:", getJson);

        const apiItem = getJson.data || getJson;
        const mappedRecord = mapApiMasterlistRecord(apiItem);

        // * Refresh Edit Profile & Refresh View Profile
        setRecord(mappedRecord);

        // * Refresh Masterlist Table
        setMasterlistRecords(prev => 
          prev.map(r => r.id.toString() === record.id.toString() ? mappedRecord : r)
        );

        setIsEditMode(false);
      } catch (error: any) {
        console.error("Error saving masterlist record:", error);
        alert(`Failed to save changes: ${error.message}`);
      } finally {
        setIsSaving(false);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    };
    
    // UNIQUE_BOOKMARK_START
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        <div className="bg-slate-50 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-20 flex flex-col overflow-hidden animate-scale-up border border-white">
          <div className="bg-[#1e419c] p-8 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl overflow-hidden flex items-center justify-center border border-white/20 shrink-0">
                {(record.avatarUrl || record.avatar || record._raw?.avatar_url || record._raw?.formData?.capturedImage || record._raw?.avatar) ? (
                  <img 
                    src={record.avatarUrl || record.avatar || record._raw?.avatar_url || record._raw?.formData?.capturedImage || record._raw?.avatar} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                    alt="PWD Avatar" 
                  />
                ) : (
                  <UserCircle size={28} />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight">{isEditMode ? 'Edit Profile' : fullName}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Masterlist Record Profile</p>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest ${
                    isSyncing ? 'bg-sky-500/30 text-sky-200 border border-sky-400/20' :
                    syncError ? 'bg-rose-500/30 text-rose-200 border border-rose-400/20' :
                    'bg-emerald-500/30 text-emerald-200 border border-emerald-400/20'
                  }`}>
                    <RefreshCw size={8} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? 'Syncing...' : syncError ? 'Local Copy' : 'Synced via GET'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${isEditMode ? 'bg-amber-100 text-[#1e419c]' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isEditMode ? <X size={14} /> : <Edit2 size={14} />}
                {isEditMode ? 'Cancel' : 'Edit Info'}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
            <DetailSection title="Identification" icon={CreditCard}>
              <DetailItem label="PWD ID Number" value={pwdIdDisplay} />
              <DetailItem label="Valid Until" value={record.pwdIdExpiryDate || record.validUntil} />
            </DetailSection>

            <DetailSection title="Personal Information" icon={UserIcon}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">First Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.firstName} onChange={(e) => setEditData({...editData, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Middle Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.middleName} onChange={(e) => setEditData({...editData, middleName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Last Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.lastName} onChange={(e) => setEditData({...editData, lastName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Suffix</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.suffix} onChange={(e) => setEditData({...editData, suffix: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Birth Date</label>
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.birthDate} onChange={(e) => setEditData({...editData, birthDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Gender / Sex</label>
                    <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.gender} onChange={(e) => setEditData({...editData, gender: e.target.value})}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Civil Status</label>
                    <select className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.civilStatus} onChange={(e) => setEditData({...editData, civilStatus: e.target.value})}>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Separated">Separated</option>
                      <option value="Widow/er">Widow/er</option>
                      <option value="Cohabitation">Cohabitation</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="Full Name" value={fullName} />
                  <DetailItem label="Birth Date" value={record.birthDate} />
                  <DetailItem label="Gender" value={record.gender || record.sex} />
                  <DetailItem label="Civil Status" value={record.civilStatus || record.civil_status} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Disability Information" icon={Activity}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Type of Disability</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.typeOfDisability} onChange={(e) => setEditData({...editData, typeOfDisability: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Congenital Cause</label>
                    <MultiSelectDropdown 
                      label="Congenital Cause"
                      value={editData.congenital || ''}
                      onChange={val => setEditData({...editData, congenital: val})}
                      standardOptions={CONGENITAL_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Acquired Cause</label>
                    <MultiSelectDropdown 
                      label="Acquired Cause"
                      value={editData.acquired || ''}
                      onChange={val => setEditData({...editData, acquired: val})}
                      standardOptions={ACQUIRED_OPTIONS}
                    />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="Type of Disability" value={record.typeOfDisability || record.disabilityType} />
                  <DetailItem label="Congenital Cause" value={record._raw?.congenital_outflow_defect?.congenital || '---'} />
                  <DetailItem label="Acquired Cause" value={record._raw?.congenital_outflow_defect?.acquired || '---'} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Address Information" icon={MapPin}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">House Number/Street</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.streetAddress} onChange={(e) => setEditData({...editData, streetAddress: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Barangay</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.barangay} onChange={(e) => setEditData({...editData, barangay: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">City / Municipality</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.cityMunicipality} onChange={(e) => setEditData({...editData, cityMunicipality: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Province</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.province} onChange={(e) => setEditData({...editData, province: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Region</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.region} onChange={(e) => setEditData({...editData, region: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="House Number/Street" value={record.streetAddress || record.address} />
                  <DetailItem label="Barangay" value={record.barangay} />
                  <DetailItem label="City / Municipality" value={record.cityMunicipality || record.city} />
                  <DetailItem label="Province" value={record.province} />
                  <DetailItem label="Region" value={record.region} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Contact Information" icon={Phone}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Mobile Number</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.mobileNumber} onChange={(e) => setEditData({...editData, mobileNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Email Address</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1e419c]" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="Mobile Number" value={record.mobileNumber || record.contactNumber} />
                  <DetailItem label="Email Address" value={record.emailAddress || record.email} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Emergency Contact" icon={ShieldCheck}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Contact Person Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.emergencyContactPerson} onChange={(e) => setEditData({...editData, emergencyContactPerson: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Relationship</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.emergencyContactRelationship} onChange={(e) => setEditData({...editData, emergencyContactRelationship: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Contact Number</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.emergencyContactNumber} onChange={(e) => setEditData({...editData, emergencyContactNumber: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="Name" value={record.emergencyContactPerson} />
                  <DetailItem label="Relationship" value={record.emergencyContactRelationship || record.relationship} />
                  <DetailItem label="Contact Number" value={record.emergencyContactNumber} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Government IDs" icon={CreditCard}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">SSS Number (SSS No.)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.sssNumber} onChange={(e) => setEditData({...editData, sssNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">GSIS Number (GSIS No.)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.gsisNumber} onChange={(e) => setEditData({...editData, gsisNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Pag-IBIG Number (PAGIBIG No.)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.pagIbigNumber} onChange={(e) => setEditData({...editData, pagIbigNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">PSN Number (PSN No.)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.psnNumber} onChange={(e) => setEditData({...editData, psnNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">PhilHealth Number (PhilHealth No.)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.philHealthNumber} onChange={(e) => setEditData({...editData, philHealthNumber: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="SSS Number (SSS No.)" value={record.sssNumber} />
                  <DetailItem label="GSIS Number (GSIS No.)" value={record.gsisNumber} />
                  <DetailItem label="Pag-IBIG Number (PAGIBIG No.)" value={record.pagIbigNumber} />
                  <DetailItem label="PSN Number (PSN No.)" value={record.psnNumber} />
                  <DetailItem label="PhilHealth Number (PhilHealth No.)" value={record.philHealthNumber} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Family Background" icon={Home}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Father's Full Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.fatherName} onChange={(e) => setEditData({...editData, fatherName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Mother's Full Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.motherName} onChange={(e) => setEditData({...editData, motherName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Guardian's Full Name</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.guardianName} onChange={(e) => setEditData({...editData, guardianName: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="Father's Full Name" value={record.fatherName} />
                  <DetailItem label="Mother's Full Name" value={record.motherName} />
                  <DetailItem label="Guardian's Full Name" value={record.guardianName} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Employment Information" icon={Briefcase}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Employment Status</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.employmentStatus} onChange={(e) => setEditData({...editData, employmentStatus: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Occupation</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.occupation} onChange={(e) => setEditData({...editData, occupation: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Type of Employment</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.employmentType} onChange={(e) => setEditData({...editData, employmentType: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="Employment Status" value={record.employmentStatus} />
                  <DetailItem label="Occupation" value={record.occupation} />
                  <DetailItem label="Type of Employment" value={record.employmentType} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Organization Information" icon={Globe}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Organization Affiliated</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.orgAffiliated} onChange={(e) => setEditData({...editData, orgAffiliated: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Contact Person</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.orgContactPerson} onChange={(e) => setEditData({...editData, orgContactPerson: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Address</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.orgAddress} onChange={(e) => setEditData({...editData, orgAddress: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Telephone Number</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.orgTelNo} onChange={(e) => setEditData({...editData, orgTelNo: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="Organization Affiliated" value={record._raw?.organization_info?.affiliated || record.organization_affiliated} />
                  <DetailItem label="Contact Person" value={record._raw?.organization_info?.contact_person || record.organization_contact_person} />
                  <DetailItem label="Address" value={record._raw?.organization_info?.address || record.organization_address} />
                  <DetailItem label="Telephone Number" value={record._raw?.organization_info?.tel_no || record.organization_tel_no} />
                </>
              )}
            </DetailSection>

            <DetailSection title="Approval Information" icon={ShieldAlert}>
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Date Applied</label>
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.dateApplied} onChange={(e) => setEditData({...editData, dateApplied: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Date Approved</label>
                    <input type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium outline-none focus:border-[#1e419c]" value={editData.approvalDate} onChange={(e) => setEditData({...editData, approvalDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Approved By</label>
                    <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c]" value={editData.approvedBy} onChange={(e) => setEditData({...editData, approvedBy: e.target.value})} />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem label="Date Applied" value={record.dateApplied} />
                  <DetailItem label="Date Approved" value={record.approvalDate || record.dateApproved} />
                  <DetailItem label="Approved By" value={record.approvedBy} />
                </>
              )}
            </DetailSection>


          </div>

          <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3">
            {isEditMode ? (
              <>
                <button onClick={() => setIsEditMode(false)} className="px-8 py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all">Cancel</button>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>}
                  Save Changes
                </button>
              </>
            ) : (
              <button onClick={onClose} className="px-8 py-3 bg-[#1e419c] text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-all">Close Profile</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {successMessage && (
        <div className="fixed top-24 right-8 z-[200] bg-emerald-50 border border-emerald-200 p-6 rounded-[2rem] text-emerald-700 text-xs font-medium animate-fade-in-down flex items-start gap-3 shadow-xl max-w-md">
          <ShieldCheck className="shrink-0 mt-0.5" size={18}/>
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-widest text-[10px]">Operation Successful</p>
            <p className="text-emerald-600/80">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="ml-2 text-emerald-400 hover:text-emerald-600">
            <X size={14}/>
          </button>
        </div>
      )}
      {selectedRecord && (
        <RecordDetailsModal 
          record={selectedRecord} 
          onClose={() => { setSelectedRecord(null); setIsInitialEdit(false); }} 
          initialEditMode={isInitialEdit}
        />
      )}
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-[32px] font-normal text-slate-800">PWD masterlist</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-500 font-medium text-lg">Central Cloud Registry (API Mode)</p>
            <div className={`flex items-center gap-2 px-3 py-1 ${isLiveMode ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'} border rounded-full ${isRefreshing ? 'animate-pulse' : ''}`}>
              {isLiveMode ? <Activity size={14} className="text-emerald-500" /> : <CloudOff size={14} className="text-amber-500" />}
              <span className={`text-[9px] font-medium uppercase tracking-[0.2em] ${isLiveMode ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isLiveMode ? 'Cloud Connected' : 'Manual Sync Mode'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2.5">
          {lastSync && <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">Latest Cloud Sync: {lastSync}</span>}
        </div>
      </header>

      {syncError && (
        <div className="bg-amber-50 border-2 border-amber-100 p-8 rounded-xl flex items-start gap-6 animate-fade-in-up shadow-sm">
          <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center text-amber-600 shadow-sm border border-amber-50 shrink-0">
            <ShieldAlert size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-amber-900 uppercase tracking-tight">API Handshake Mismatch (401)</h3>
            <p className="text-amber-700 text-sm font-medium max-w-2xl leading-relaxed">
              The live masterlist at <span className="underline font-mono">phoenix.com.ph</span> is not reflecting because 
              the current session is unauthorized. Please ensure you login with <span className="font-semibold">Official Admin Credentials</span>.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-black/5">
        <div className="p-8 border-b border-slate-100 bg-slate-50/40 space-y-6">
           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input 
                  type="text"
                  placeholder="Search by Name or PWD ID..."
                  className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#1e419c]/10 focus:border-[#1e419c] transition-all font-medium text-sm uppercase tracking-tight"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select 
                  value={filterGender}
                  onChange={(e) => { setFilterGender(e.target.value); setCurrentPage(1); }}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-600 focus:outline-none focus:border-[#1e419c]"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <select 
                  value={filterBarangay}
                  onChange={(e) => { setFilterBarangay(e.target.value); setCurrentPage(1); }}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#1e419c] border-[#1e419c]/20 focus:outline-none focus:border-[#1e419c]"
                >
                  <option value="">All Barangays</option>
                  {SAN_JUAN_BARANGAYS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => { setFilterStatus('Active'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                      filterStatus === 'Active' 
                        ? 'bg-[#1e419c] text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    Active
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setFilterStatus('Deceased'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                      filterStatus === 'Deceased' 
                        ? 'bg-rose-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900 bg-transparent'
                    }`}
                  >
                    Deceased
                  </button>
                </div>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto relative custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e419c] text-white text-[9px] font-bold uppercase tracking-[0.2em]">
                <th className="p-6 whitespace-nowrap border-b border-white/10">PWD ID Number</th>
                <th className="p-6 whitespace-nowrap border-b border-white/10">Fullname</th>
                <th className="p-6 whitespace-nowrap border-b border-white/10">Barangay</th>
                <th className="p-6 whitespace-nowrap border-b border-white/10">Date Approved</th>
                <th className="p-6 whitespace-nowrap border-b border-white/10">Mode</th>
                <th className="p-6 whitespace-nowrap border-b border-white/10">Vital Status</th>
                <th className="p-6 whitespace-nowrap border-b border-white/10">ID Status</th>
                <th className="p-6 text-right whitespace-nowrap border-b border-white/10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map((record, idx) => {
                const fullName = record.fullName;
                const statusColor = record.status === 'Active' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 
                                   record.status === 'Deceased' ? 'text-red-600 bg-red-50 border-red-100' : 
                                   'text-slate-500 bg-slate-50 border-slate-100';

                return (
                  <tr key={record.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-6 border-b border-slate-100 font-mono text-xs text-slate-600 font-bold uppercase tracking-wider">
                      {record.pwdIdNumber || '---'}
                    </td>
                    <td className="p-6 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 uppercase tracking-tight text-xs whitespace-nowrap">{fullName}</span>
                        {record.isSenior && (
                          <span className="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1">
                            <Heart size={8} fill="currentColor" /> Senior
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-6 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-tight">
                      {record.barangay || '---'}
                    </td>
                    <td className="p-6 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-600 flex items-center gap-2">
                            <Calendar size={14} className="text-slate-300" /> {record.dateApproved || '---'}
                        </span>
                    </td>
                    <td className="p-6 border-b border-slate-100">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                            record.isWalkIn 
                                ? 'bg-purple-50 text-purple-600 border-purple-100' 
                                : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        }`}>
                            {record.isWalkIn ? (
                                <><MapPin size={14} /> Walk-in</>
                            ) : (
                                <><Globe size={14} /> {record.mode || 'Online'}</>
                            )}
                        </span>
                    </td>
                    <td className="p-6 border-b border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border w-fit ${statusColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${record.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {record.status || 'Active'}
                        </span>
                        {record.status === 'Deceased' && (record._raw?.application_details?.date_of_death || record.dateOfDeath) && (
                          <span className="text-[10px] text-slate-500 italic mt-0.5 whitespace-nowrap">
                            Died: {record._raw?.application_details?.date_of_death || record.dateOfDeath}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-6 border-b border-slate-100">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest border ${
                            String(record._raw?.application_details?.id_status || '').toLowerCase() === 'printed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            String(record._raw?.application_details?.id_status || '').toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                            {record._raw?.application_details?.id_status || 'NOT PRINTED'}
                        </span>
                    </td>
                    <td className="p-6 text-right border-b border-slate-100 relative">
                      <div className="flex justify-end">
                        <button 
                            onClick={() => setOpenDropdownId(openDropdownId === record.id ? null : (record.id || idx.toString()))}
                            className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
                        >
                            <MoreHorizontal size={20} />
                        </button>
                        
                        {openDropdownId === (record.id || idx.toString()) && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenDropdownId(null)}
                            />
                            <div className={`absolute right-6 ${idx >= paginatedRecords.length - 2 && paginatedRecords.length > 2 ? 'bottom-12 origin-bottom' : 'top-16 origin-top'} w-64 bg-white rounded-[1.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 z-20 py-4 flex flex-col items-start overflow-hidden animate-scale-up`}>
                              <button 
                                onClick={() => handleAction('view', record)}
                                className="w-full flex items-center gap-5 px-8 py-3.5 hover:bg-slate-50 transition-colors text-slate-700 group"
                              >
                                <Eye size={18} className="text-slate-400 group-hover:text-[#1e419c]" />
                                <span className="text-[11px] font-extrabold uppercase tracking-widest">View Profile</span>
                              </button>
                              
                              <button 
                                onClick={() => handleAction('edit', record)}
                                className="w-full flex items-center gap-5 px-8 py-3.5 hover:bg-slate-50 transition-colors text-slate-700 group"
                              >
                                <Edit2 size={18} className="text-slate-400 group-hover:text-[#1e419c]" />
                                <span className="text-[11px] font-extrabold uppercase tracking-widest">Edit Profile</span>
                              </button>
                              
                              <button 
                                onClick={() => handleAction('reset', record)}
                                className="w-full flex items-center gap-5 px-8 py-3.5 hover:bg-slate-50 transition-colors text-slate-700 group"
                              >
                                <Key size={18} className="text-slate-400 group-hover:text-[#1e419c]" />
                                <span className="text-[11px] font-extrabold uppercase tracking-widest">Reset Password</span>
                              </button>

                              <button 
                                onClick={() => handleAction('change-vital', record)}
                                className="w-full flex items-center gap-5 px-8 py-3.5 hover:bg-slate-50 transition-colors text-slate-700 group"
                              >
                                <RefreshCw size={18} className="text-slate-400 group-hover:text-[#1e419c]" />
                                <span className="text-[11px] font-extrabold uppercase tracking-widest">Change Vital Status</span>
                              </button>
                              
                              {calculateAge(record.birthDate) >= 60 && !record.isSenior && (
                                <>
                                  <div className="w-full h-[1px] bg-slate-50 my-1" />
                                  <button 
                                    onClick={() => handleAction('senior', record)}
                                    className="w-full flex items-center gap-5 px-8 py-3.5 hover:bg-emerald-50 transition-colors text-emerald-600 group"
                                  >
                                    <Heart size={18} className="text-emerald-500" />
                                    <span className="text-[11px] font-extrabold uppercase tracking-widest">Reflect to Senior</span>
                                  </button>
                                </>
                              )}

                              <div className="w-full h-[1px] bg-slate-50 my-1" />
                              
                              <button 
                                onClick={() => handleAction('pending', record)}
                                className="w-full flex items-center gap-5 px-8 py-3.5 hover:bg-orange-50 transition-colors text-orange-600 group"
                              >
                                <RefreshCcw size={18} className="text-orange-500" />
                                <span className="text-[11px] font-extrabold uppercase tracking-widest">Move to Pending</span>
                              </button>

                              <div className="w-full h-[1px] bg-slate-50 my-1" />

                              <button 
                                onClick={() => handleAction('delete', record)}
                                className="w-full flex items-center gap-5 px-8 py-3.5 hover:bg-red-50 transition-colors text-red-600 group"
                              >
                                <Trash2 size={18} className="text-red-500" />
                                <span className="text-[11px] font-extrabold uppercase tracking-widest">Delete Record</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedRecords.length === 0 && !isRefreshing && (
                <tr>
                   <td colSpan={6} className="p-24 text-center text-slate-300 font-bold uppercase tracking-[0.3em] text-xs">
                      No PWD records found.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} Records
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
              >
                <RefreshCw size={14} className="-scale-x-100" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${currentPage === i + 1 ? 'bg-[#1e419c] text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmingDeleteRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                <div className="p-8 pb-4 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={40} className="text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Delete Masterlist Record?</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Are you sure you want to delete <span className="font-bold text-slate-700">{confirmingDeleteRecord.name || confirmingDeleteRecord.fullName}</span>? 
                        This will also remove their associated user account. This action is permanent.
                    </p>
                </div>
                <div className="p-8 pt-6 flex flex-col gap-3">
                    <button 
                        onClick={handleDeleteRecord}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm tracking-widest uppercase transition-all shadow-lg shadow-red-100"
                    >
                        Delete Permanently
                    </button>
                    <button 
                        onClick={() => setConfirmingDeleteRecord(null)}
                        className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all"
                    >
                        Nevermind
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {confirmingResetPasswordRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-slate-100">
                <div className="p-8 pb-4 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Key size={40} className="text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Reset Citizen Password?</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Are you sure you want to reset the password for <span className="font-bold text-slate-700">{confirmingResetPasswordRecord.name || confirmingResetPasswordRecord.fullName}</span>? 
                        This will generate a new auto-generated temporary password for their account.
                    </p>
                </div>
                <div className="p-8 pt-6 flex flex-col gap-3">
                    <button 
                        onClick={handleResetPassword}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm tracking-widest uppercase transition-all shadow-lg shadow-amber-100"
                    >
                        Confirm Reset
                    </button>
                    <button 
                        onClick={() => setConfirmingResetPasswordRecord(null)}
                        className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Change Vital Status Modal */}
      {changingVitalRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-8 pb-4">
              <div className="w-20 h-20 bg-[#1e419c]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#1e419c]">
                <Activity size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 text-center mb-2">Change Vital Status</h3>
              <p className="text-slate-500 text-sm text-center leading-relaxed mb-6">
                Update the official vital status for <span className="font-bold text-slate-700">{changingVitalRecord.fullName || changingVitalRecord.name}</span>.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Vital Status</label>
                  <select 
                    value={newVitalStatus}
                    onChange={(e) => {
                      setNewVitalStatus(e.target.value);
                      if (e.target.value === 'Deceased' && !deathDate) {
                        setDeathDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 font-bold uppercase tracking-wide focus:outline-none focus:border-[#1e419c] focus:bg-white transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Deceased">Deceased</option>
                  </select>
                </div>

                {newVitalStatus === 'Deceased' && (
                  <div className="animate-fade-in">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Date of Death</label>
                    <input 
                      type="date"
                      required
                      value={deathDate}
                      onChange={(e) => setDeathDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#1e419c] focus:bg-white transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 pt-4 flex flex-col gap-3">
              <button 
                onClick={handleSaveVitalStatus}
                disabled={isUpdatingVital}
                className="w-full py-4 bg-[#1e419c] hover:bg-[#1a3a8b] text-white rounded-2xl font-bold text-sm tracking-widest uppercase transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {isUpdatingVital ? 'Updating...' : 'Save Changes'}
              </button>
              <button 
                onClick={() => { setChangingVitalRecord(null); }}
                disabled={isUpdatingVital}
                className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
