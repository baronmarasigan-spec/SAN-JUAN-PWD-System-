import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ApplicationStatus, ApplicationType, Role, User, Application } from '../../types';
import { IDCard } from '../../components/IDCard';
import { 
  Printer, CheckCircle, Search, CreditCard, XCircle, Clock, Archive, 
  UserPlus, Info, Calendar, User as UserIcon, X, ShieldCheck, Heart, 
  Eye, Download, FileText, AlertCircle, Trash2, MapPin, Phone, 
  ShieldAlert, Globe, Fingerprint, Camera, Upload, ArrowRight, ArrowLeft,
  AlertTriangle, ZoomIn, ZoomOut, File, Tag, HelpCircle, RefreshCw, Activity, CloudOff, Database, ClipboardList, Layers, MapPinned, MoreHorizontal, Check, Edit3, Filter, ChevronLeft, ChevronRight,
  ExternalLink
} from 'lucide-react';

// Date Formatter Helper
const formatReadableDate = (dateStr: any) => {
  if (!dateStr) return "-";
  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      return dateStr;
    }
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

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
    cleanPath = cleanPath.trim().replace(/\\/g, '/');
    if (!cleanPath.startsWith('http') && !cleanPath.startsWith('data:')) {
      const host = 'https://api-dbpwd.drchiocms.com';
      cleanPath = cleanPath.startsWith('/') ? `${host}${cleanPath}` : `${host}/${cleanPath}`;
    }
    return cleanPath;
  }
  return null;
};

// Convert Base64 Data URL to standard Blob object
const dataURLtoBlob = (dataurl: string): Blob | null => {
  try {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error("Error converting data URL to blob:", e);
    return null;
  }
};

// Attachment helper component
const AttachmentItem = ({ label, value, downloadable = true }: { label: string, value: any, downloadable?: boolean }) => {
  const parsedPath = safeParseAttachment(value);
  
  if (!parsedPath) {
    return (
      <div className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-2xl">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
        <span className="text-xs text-slate-400 italic font-semibold mt-1">No attachment uploaded</span>
      </div>
    );
  }

  // Handle case-insensitive image file extensions and data urls
  const isImage = typeof parsedPath === 'string' && (!!parsedPath.match(/\.(jpg|jpeg|png|gif|webp)/i) || parsedPath.startsWith('data:image/'));
  
  return (
    <div className="flex flex-col p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-[#1e419c]/40 transition-all">
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">{label}</span>
      {isImage ? (
        <div className="relative group w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 mb-2">
          <img 
            src={parsedPath} 
            alt={label} 
            className="w-full h-full object-cover" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }} 
          />
        </div>
      ) : (
        <div className="w-full h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 mb-2">
          <FileText size={20} className="text-[#1e419c]" />
        </div>
      )}
      {downloadable && (
        <a 
          href={parsedPath} 
          download 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-auto px-4 py-2 bg-[#1e419c] text-white hover:bg-opacity-90 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center transition-colors flex items-center justify-center gap-1.5"
        >
          <Download size={12} /> Download
        </a>
      )}
    </div>
  );
};

const normalizeStatusValue = (val: string): string => {
  const s = String(val || '').toLowerCase().trim();
  if (s === 'rejected' || s === 'disapproved') {
    return 'disapproved';
  }
  if (s === 'approved') return 'approved';
  if (s === 'released') return 'released';
  return 'pending';
};

const formatStatusForDisplay = (status: string): string => {
  if (!status) return '-';
  const s = status.toLowerCase().trim();
  if (s === 'pending') return 'Pending';
  if (s === 'approved') return 'Approved';
  if (s === 'rejected' || s === 'disapproved') return 'Disapproved';
  if (s === 'released') return 'Released';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const AdminIssuance: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { users, addApplication, getNextPwdIdNumber, masterlistRecords, setMasterlistRecords, currentUser } = useApp();

  // Helper to synchronize status changes to masterlistv2 API via PUT request
  const syncIdStatusToMasterlistApi = async (record: any, newStatus: string) => {
    if (!record) return;
    const lowercaseStatus = normalizeStatusValue(newStatus);

    // Find the matched record from the loaded masterlistRecords
    const matchedMasterlistRecord = masterlistRecords.find((m: any) => {
      const pwdNum = (m.pwdIdNumber || m.id_number || m.control_number || '').toString().toLowerCase().trim();
      const mId = (m.id || '').toString().toLowerCase().trim();
      const fullName = (m.name || m.fullName || '').toString().toLowerCase().trim();
      const firstName = (m.firstName || '').toString().toLowerCase().trim();
      const lastName = (m.lastName || '').toString().toLowerCase().trim();

      const rPwdNum = (record.personal_information?.pwd_number || record.personal_information?.pwd_id_number || record.pwd_number || record.personal_information?.control_number || '').toString().toLowerCase().trim();
      const rFullName = (record.personal_information?.full_name || record.full_name || '').toString().toLowerCase().trim();
      const rFirstName = (record.personal_information?.first_name || record.first_name || '').toString().toLowerCase().trim();
      const rLastName = (record.personal_information?.last_name || record.last_name || '').toString().toLowerCase().trim();

      // Check various degrees of matching to ensure perfect alignment
      const matchesPwd = rPwdNum && (rPwdNum === pwdNum || rPwdNum === mId);
      const matchesFullName = rFullName && (rFullName === fullName || rFullName.includes(fullName) || fullName.includes(rFullName));
      const matchesFirstLastObj = (rFirstName && rLastName) && (firstName === rFirstName && lastName === rLastName);

      return matchesPwd || matchesFullName || matchesFirstLastObj;
    });

    if (matchedMasterlistRecord) {
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
        formData.append('id_status', lowercaseStatus);

        let res = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${matchedMasterlistRecord.id}`, {
          method: 'POST',
          headers,
          body: formData
        });

        if (!res.ok) {
          res = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${matchedMasterlistRecord.id}`, {
            method: 'PUT',
            headers,
            body: formData
          });
        }

        if (!res.ok) {
          console.warn(`Masterlist status sync failed for record ID: ${matchedMasterlistRecord.id}, Status: ${res.status}`);
        } else {
          console.log(`Successfully synced id_status: ${lowercaseStatus} to masterlistv2 for record ID: ${matchedMasterlistRecord.id}`);
        }
      } catch (error) {
        console.error("Error syncing status to masterlist v2 endpoint:", error);
      }
    } else {
      console.warn("Could not find matching masterlist record for remote API sync", record);
    }
  };

  // Helper to synchronize status changes from ID Issuance back to corresponding PWD Masterlist records in local state & storage
  const syncIdStatusToMasterlist = (record: any, newStatus: string) => {
    if (!record) return;
    const targetStatusMapped = normalizeStatusValue(newStatus);

    setMasterlistRecords((prev: any[]) => {
      let updated = false;
      const nextRecords = prev.map(m => {
        const pwdNum = (m.pwdIdNumber || m.id_number || m.control_number || '').toString().toLowerCase().trim();
        const mId = (m.id || '').toString().toLowerCase().trim();
        const fullName = (m.name || m.fullName || '').toString().toLowerCase().trim();
        const firstName = (m.firstName || '').toString().toLowerCase().trim();
        const lastName = (m.lastName || '').toString().toLowerCase().trim();

        const rPwdNum = (record.personal_information?.pwd_number || record.personal_information?.pwd_id_number || record.pwd_number || record.personal_information?.control_number || '').toString().toLowerCase().trim();
        const rFullName = (record.personal_information?.full_name || record.full_name || '').toString().toLowerCase().trim();
        const rFirstName = (record.personal_information?.first_name || record.first_name || '').toString().toLowerCase().trim();
        const rLastName = (record.personal_information?.last_name || record.last_name || '').toString().toLowerCase().trim();

        // Check various degrees of matching to ensure perfect alignment
        const matchesPwd = rPwdNum && (rPwdNum === pwdNum || rPwdNum === mId);
        const matchesFullName = rFullName && (rFullName === fullName || rFullName.includes(fullName) || fullName.includes(rFullName));
        const matchesFirstLastObj = (rFirstName && rLastName) && (firstName === rFirstName && lastName === rLastName);

        if (matchesPwd || matchesFullName || matchesFirstLastObj) {
          updated = true;
          const updatedRaw = {
            ...(m._raw || {}),
            application_details: {
              ...(m._raw?.application_details || {}),
              id_status: targetStatusMapped
            }
          };

          const updatedAppDetails = {
            ...(m.application_details || {}),
            id_status: targetStatusMapped
          };

          return {
            ...m,
            id_status: targetStatusMapped,
            application_details: updatedAppDetails,
            _raw: updatedRaw
          };
        }
        return m;
      });

      if (updated) {
        localStorage.setItem('pdao_masterlist_records', JSON.stringify(nextRecords));
      }
      return nextRecords;
    });
  };

  // Dynamic ID Issuance States
  const [issuanceRecords, setIssuanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRequestType, setFilterRequestType] = useState('all');
  const [filterModality, setFilterModality] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Active Modals & Operations
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [confirmingReleaseRecord, setConfirmingReleaseRecord] = useState<any | null>(null);
  const [rejectingRecord, setRejectingRecord] = useState<any | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');

  // Status transition states
  const [pendingStatusFlow, setPendingStatusFlow] = useState<{
    record: any;
    targetStatus: 'approved' | 'disapproved' | 'pending' | 'released' | string;
    step: 'confirm' | 'disapproval_reason' | 'release_details' | string;
  } | null>(null);
  const [statusReasonText, setStatusReasonText] = useState('');
  const [statusReleaseDate, setStatusReleaseDate] = useState('');
  const [statusDateReviewed, setStatusDateReviewed] = useState('');
  const [statusExpirationDate, setStatusExpirationDate] = useState('');
  
  // Custom states for streamlined table ellipsis actions
  const [openMenuRowId, setOpenMenuRowId] = useState<string | number | null>(null);
  const [previewingIdRecord, setPreviewingIdRecord] = useState<any | null>(null);
  const [printingRecord, setPrintingRecord] = useState<any | null>(null);
  const [idCardSide, setIdCardSide] = useState<'front' | 'back'>('front');
  const [isIframe, setIsIframe] = useState(false);

  // Walk-in Registration states (integrated)
  const [isApplying, setIsApplying] = useState<any | null>(null);
  const [walkInStep, setWalkInStep] = useState(1);
  const [walkInSubTab, setWalkInSubTab] = useState<'new' | 'renewal' | 'lost_damage'>('new');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [files, setFiles] = useState<string[]>([]);

  // Open / Editable fields for walk-in application form
  const [bloodType, setBloodType] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [lostOrDamaged, setLostOrDamaged] = useState<'Lost' | 'Damaged'>('Lost');

  // Signature canvas states
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const [idFormData, setIdFormData] = useState({
    firstName: '', middleName: '', lastName: '', suffix: '', birthDate: '', birthPlace: '', sex: '', citizenship: 'Filipino', civil_status: '',
    address: '', contactNumber: '', emergencyContactPerson: '', emergencyContactNumber: '', joinFederation: false, disability_types: '', capturedImage: undefined as string | undefined,
    controlNo: ''
  });

  // Edit fields states
  const [editFormData, setEditFormData] = useState<any>(null);

  // Fetch ID Issuance records dynamically
  const fetchIssuanceRecords = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: any = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('https://api-dbpwd.drchiocms.com/api/id-issuance', {
        method: 'GET',
        headers
      });
      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }
      const resData = await response.json();
      const list = Array.isArray(resData.data) ? resData.data : (Array.isArray(resData) ? resData : []);
      setIssuanceRecords(list);
    } catch (err: any) {
      console.error("Error fetching ID issuance:", err);
      setErrorMsg(err.message || "Failed to retrieve ID issuance records.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger printing routine
  const handlePrintID = (record: any) => {
    setPrintingRecord(record);
  };

  // Sync printId query parameter with state
  useEffect(() => {
    const printIdFromUrl = searchParams.get('printId');
    if (printIdFromUrl && issuanceRecords.length > 0) {
      const record = issuanceRecords.find(r => String(r.id) === String(printIdFromUrl));
      if (record) {
        setPrintingRecord(record);
      }
    }
  }, [searchParams, issuanceRecords]);

  // Clean printId query parameter when printingRecord is cleared
  const handleClosePrintStudio = () => {
    setPrintingRecord(null);
    if (searchParams.has('printId')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('printId');
      setSearchParams(newParams);
    }
  };

  // Construct URL for new tab printing with custom query parameter
  const newTabUrl = useMemo(() => {
    if (!printingRecord) return '#';
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/admin/id/${tab || 'issued'}?printId=${printingRecord.id}`;
  }, [tab, printingRecord]);

  // Sync data automatically on mount
  useEffect(() => {
    fetchIssuanceRecords();
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, [tab, fetchIssuanceRecords]);

  // Automatically invoke the browser's printer dialog window as soon as printing record is selected
  useEffect(() => {
    if (printingRecord) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingRecord]);

  // Handle Edit Input changes in modal
  const handleEditInputChange = (section: string, field: string, value: any) => {
    setEditFormData((prev: any) => {
      const copy = { ...prev };
      if (!copy[section]) {
        copy[section] = {};
      }
      copy[section][field] = value;
      if (section === 'application_status' && field === 'status') {
        copy[section]['id_status'] = value;
      }
      return copy;
    });
  };

  // PUT - update record
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: any = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Normalize status value to lowercase (pending, approved, disapproved, released)
      const inputStatus = editFormData?.application_status?.status || editFormData?.application_status?.id_status || '';
      const normalizedStatus = normalizeStatusValue(inputStatus);

      const normalizedEditFormData = {
        ...editFormData,
        id_status: normalizedStatus,
        application_status: {
          ...(editFormData?.application_status || {}),
          status: normalizedStatus,
          id_status: normalizedStatus
        }
      };

      const response = await fetch(`https://api-dbpwd.drchiocms.com/api/id-issuance/${editingRecord.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(normalizedEditFormData)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      setSuccessMessage('Record updated successfully.');
      syncIdStatusToMasterlist(editingRecord, normalizedStatus);
      await syncIdStatusToMasterlistApi(editingRecord, normalizedStatus);
      setEditingRecord(null);
      fetchIssuanceRecords();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // PUT - release record
  const handleReleaseSubmit = async () => {
    if (!confirmingReleaseRecord) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: any = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const today = new Date().toISOString().split('T')[0];
      const payload = {
        ...confirmingReleaseRecord,
        id_status: 'released',
        application_status: {
          ...(confirmingReleaseRecord.application_status || {}),
          id_status: 'released',
          status: 'released'
        },
        issuance_details: {
          ...(confirmingReleaseRecord.issuance_details || {}),
          released_date: today
        }
      };

      const response = await fetch(`https://api-dbpwd.drchiocms.com/api/id-issuance/${confirmingReleaseRecord.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      setSuccessMessage('ID card successfully released.');
      syncIdStatusToMasterlist(confirmingReleaseRecord, 'released');
      await syncIdStatusToMasterlistApi(confirmingReleaseRecord, 'released');
      setConfirmingReleaseRecord(null);
      fetchIssuanceRecords();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to release: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // PUT - reject record
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRecord) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: any = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        ...rejectingRecord,
        id_status: 'disapproved',
        application_status: {
          ...(rejectingRecord.application_status || {}),
          id_status: 'disapproved',
          status: 'disapproved'
        },
        issuance_details: {
          ...(rejectingRecord.issuance_details || {}),
          rejection_remarks: rejectionRemarks
        }
      };

      const response = await fetch(`https://api-dbpwd.drchiocms.com/api/id-issuance/${rejectingRecord.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      setSuccessMessage('Application rejected successfully.');
      syncIdStatusToMasterlist(rejectingRecord, 'disapproved');
      await syncIdStatusToMasterlistApi(rejectingRecord, 'disapproved');
      setRejectingRecord(null);
      setRejectionRemarks('');
      fetchIssuanceRecords();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to reject app: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper and handler for modular status change
  const handleUpdateStatus = async (record: any, newStatus: string) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: any = {
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const today = new Date().toISOString().split('T')[0];
      const normalizedStatus = normalizeStatusValue(newStatus);

      const formData = new FormData();
      formData.append('_method', 'PUT');
      formData.append('id_status', normalizedStatus);
      formData.append('date_reviewed', today);

      let response = await fetch(`https://api-dbpwd.drchiocms.com/api/id-issuance/${record.id}`, {
        method: 'PUT',
        headers,
        body: formData
      });

      if (!response.ok && response.status === 405) {
        response = await fetch(`https://api-dbpwd.drchiocms.com/api/id-issuance/${record.id}`, {
          method: 'POST',
          headers,
          body: formData
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      setSuccessMessage(`ID status successfully updated to ${normalizedStatus}.`);
      syncIdStatusToMasterlist(record, normalizedStatus);
      await syncIdStatusToMasterlistApi(record, normalizedStatus);
      fetchIssuanceRecords();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Error updating status:", err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom helpers for structured status transition workflows
  const computeExpirationDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    date.setFullYear(date.getFullYear() + 3);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleReleaseDateChange = (val: string) => {
    setStatusReleaseDate(val);
    setStatusExpirationDate(computeExpirationDate(val));
  };

  const getConfirmationMessage = (record: any, targetStatus: string): string => {
    if (targetStatus === 'approved') {
      return 'Are you sure you want to change the status to Approved?';
    }
    if (targetStatus === 'disapproved') {
      return 'Are you sure you want to change the status to Disapproved?';
    }
    if (targetStatus === 'pending') {
      return 'Are you sure you want to move this record back to Pending?';
    }
    if (targetStatus === 'released') {
      return 'Are you sure you want to mark this ID as Released?';
    }
    return `Are you sure you want to change the status to ${targetStatus}?`;
  };

  const handleInitiateStatusChange = (record: any, targetStatus: string) => {
    setStatusReasonText('');
    setStatusReleaseDate('');
    setStatusExpirationDate('');
    const today = new Date().toISOString().split('T')[0];
    setStatusDateReviewed(today);

    if (targetStatus === 'disapproved') {
      setPendingStatusFlow({
        record,
        targetStatus,
        step: 'disapproval_reason'
      });
    } else if (targetStatus === 'released') {
      setStatusReleaseDate(today);
      setStatusExpirationDate(computeExpirationDate(today));
      setPendingStatusFlow({
        record,
        targetStatus,
        step: 'release_details'
      });
    } else {
      setPendingStatusFlow({
        record,
        targetStatus,
        step: 'confirm'
      });
    }
  };

  const handleExecuteStatusFlowSubmit = async () => {
    if (!pendingStatusFlow) return;
    const { record, targetStatus } = pendingStatusFlow;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: any = {
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const today = new Date().toISOString().split('T')[0];
      const normalizedStatus = normalizeStatusValue(targetStatus);

      const formData = new FormData();
      formData.append('_method', 'PUT');
      formData.append('id_status', normalizedStatus);
      
      if (normalizedStatus === 'disapproved') {
        formData.append('rejection_remarks', statusReasonText);
        formData.append('issuance_details[rejection_remarks]', statusReasonText);
        formData.append('date_reviewed', statusDateReviewed || today);
        formData.append('issuance_details[date_reviewed]', statusDateReviewed || today);
      } else if (normalizedStatus === 'released') {
        formData.append('released_date', statusReleaseDate || today);
        formData.append('issuance_details[released_date]', statusReleaseDate || today);
        formData.append('date_reviewed', today);
        formData.append('issuance_details[date_reviewed]', today);
      } else {
        formData.append('date_reviewed', today);
      }

      let response = await fetch(`https://api-dbpwd.drchiocms.com/api/id-issuance/${record.id}`, {
        method: 'PUT',
        headers,
        body: formData
      });

      if (!response.ok && response.status === 405) {
        response = await fetch(`https://api-dbpwd.drchiocms.com/api/id-issuance/${record.id}`, {
          method: 'POST',
          headers,
          body: formData
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      setSuccessMessage(`ID status successfully updated.`);
      syncIdStatusToMasterlist(record, normalizedStatus);
      await syncIdStatusToMasterlistApi(record, normalizedStatus);
      setPendingStatusFlow(null);
      setStatusReasonText('');
      setStatusReleaseDate('');
      setStatusExpirationDate('');
      fetchIssuanceRecords();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Error updating status:", err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Sort: latest records first (by created_at or id descending)
  const sortedRecords = useMemo(() => {
    return [...issuanceRecords].sort((a, b) => {
      const timeA = a.metadata?.created_at ? new Date(a.metadata.created_at).getTime() : 0;
      const timeB = b.metadata?.created_at ? new Date(b.metadata.created_at).getTime() : 0;
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      return (b.id || 0) - (a.id || 0);
    });
  }, [issuanceRecords]);

  // Searches on: PWD Number, Full Name, Barangay, Status
  const searchedAndFiltered = useMemo(() => {
    let result = sortedRecords;

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter(r => {
        const pwdNum = (r.personal_information?.pwd_number || '').toLowerCase();
        const fullName = (r.personal_information?.full_name || '').toLowerCase();
        const barangay = (r.address?.barangay || '').toLowerCase();
        const status = (r.application_status?.id_status || r.application_status?.status || '').toLowerCase();
        return pwdNum.includes(query) || fullName.includes(query) || barangay.includes(query) || status.includes(query);
      });
    }

    if (filterStatus !== 'all') {
      result = result.filter(r => (r.application_status?.id_status || r.application_status?.status || '').toLowerCase() === filterStatus.toLowerCase());
    }

    if (filterRequestType !== 'all') {
      result = result.filter(r => (r.application_status?.request_type || '').toLowerCase() === filterRequestType.toLowerCase());
    }

    if (filterModality !== 'all') {
      result = result.filter(r => (r.application_status?.modality || '').toLowerCase() === filterModality.toLowerCase());
    }

    return result;
  }, [sortedRecords, searchTerm, filterStatus, filterRequestType, filterModality]);

  // Unique lists for filters
  const statusOptions = useMemo(() => {
    const list = issuanceRecords.map(r => r.application_status?.id_status || r.application_status?.status).filter(Boolean);
    return ['all', ...Array.from(new Set(list))];
  }, [issuanceRecords]);

  const requestTypeOptions = useMemo(() => {
    const list = issuanceRecords.map(r => r.application_status?.request_type).filter(Boolean);
    return ['all', ...Array.from(new Set(list))];
  }, [issuanceRecords]);

  const modalityOptions = useMemo(() => {
    const list = issuanceRecords.map(r => r.application_status?.modality).filter(Boolean);
    return ['all', ...Array.from(new Set(list))];
  }, [issuanceRecords]);

  // Pagination Handler
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterRequestType, filterModality]);

  const paginatedResponse = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return searchedAndFiltered.slice(start, start + itemsPerPage);
  }, [searchedAndFiltered, currentPage]);

  const totalPages = Math.ceil(searchedAndFiltered.length / itemsPerPage) || 1;

  // Render Badge
  const renderStatusBadge = (status: string) => {
    if (!status) return <span>-</span>;
    const s = status.toLowerCase();
    let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (s === 'pending') {
      badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (s === 'approved') {
      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (s === 'rejected' || s === 'disapproved') {
      badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (s === 'released') {
      badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
    }
    return (
      <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full border ${badgeClass}`}>
        {status}
      </span>
    );
  };

  // Initialise edit state
  const startEditing = (record: any) => {
    setEditingRecord(record);
    setEditFormData({
      personal_information: {
        pwd_number: record.personal_information?.pwd_number || '',
        full_name: record.personal_information?.full_name || '',
        first_name: record.personal_information?.first_name || '',
        middle_name: record.personal_information?.middle_name || '',
        last_name: record.personal_information?.last_name || '',
        suffix: record.personal_information?.suffix || '',
        gender: record.personal_information?.gender || '',
        date_of_birth: record.personal_information?.date_of_birth || '',
        civil_status: record.personal_information?.civil_status || '',
        mobile_no: record.personal_information?.mobile_no || ''
      },
      address: {
        house_street: record.address?.house_street || '',
        barangay: record.address?.barangay || '',
        municipality: record.address?.municipality || '',
        province: record.address?.province || '',
        region: record.address?.region || ''
      },
      emergency_contact: {
        name: record.emergency_contact?.name || '',
        number: record.emergency_contact?.number || ''
      },
      application_status: {
        id_status: record.application_status?.id_status || record.application_status?.status || '',
        status: record.application_status?.status || '',
        request_type: record.application_status?.request_type || '',
        modality: record.application_status?.modality || '',
        application_date: record.application_status?.application_date || ''
      },
      issuance_details: {
        date_reviewed: record.issuance_details?.date_reviewed || '',
        released_date: record.issuance_details?.released_date || '',
        expiration_date: record.issuance_details?.expiration_date || '',
        rejection_remarks: record.issuance_details?.rejection_remarks || ''
      }
    });
  };

  // Walk-in requirements helper functions
  const validateWalkInStep1 = () => {
    const newErrors: string[] = [];
    if (!idFormData.firstName.trim()) newErrors.push('firstName');
    if (!idFormData.lastName.trim()) newErrors.push('lastName');
    if (!idFormData.birthDate.trim()) newErrors.push('birthDate');
    if (!idFormData.disability_types.trim()) newErrors.push('disability_types');
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setIdFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    if (errors.includes(name)) {
      setErrors(prev => prev.filter(err => err !== name));
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      const size = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight);
      const x = (videoRef.current.videoWidth - size) / 2;
      const y = (videoRef.current.videoHeight - size) / 2;
      canvasRef.current.width = 600;
      canvasRef.current.height = 600;
      ctx?.drawImage(videoRef.current, x, y, size, size, 0, 0, 600, 600);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      setIdFormData(prev => ({ ...prev, capturedImage: dataUrl }));
      setFiles(prev => [...prev.filter(f => !f.includes('Bio_Photo')), `WalkIn_Biometric_Photo_${Date.now()}.jpg`]);
      setErrors(prev => prev.filter(err => err !== 'capturedImage'));
      setIsCameraOpen(false);
      if (videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    }
  };

  // Signature Drawing functions page handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e419c';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirmApplication = async () => {
    if (!capturedImage) {
      setErrors(['capturedImage']);
      return;
    }
    if (!isApplying) return;

    let appType = ApplicationType.ID_NEW;
    let desc = 'Walk-in ID Application Form Submitted by Admin.';

    if (walkInSubTab === 'renewal') {
      appType = ApplicationType.ID_RENEWAL;
      desc = 'Walk-in ID Renewal Form Submitted by Admin.';
    } else if (walkInSubTab === 'lost_damage') {
      appType = ApplicationType.ID_REPLACEMENT;
      desc = 'Walk-in ID Replacement (Lost / Damage) Form Submitted by Admin.';
    }

    const signatureData = sigCanvasRef.current ? sigCanvasRef.current.toDataURL('image/png') : '';

    const { citizenship, civil_status, contactNumber, ...restIdFormData } = idFormData;
    const res = await addApplication({
        userId: isApplying.id,
        userName: isApplying.name || isApplying.fullName || `${idFormData.firstName} ${idFormData.lastName}`,
        type: appType,
        description: desc,
        documents: files,
        formData: { 
          ...restIdFormData, 
          bloodType: bloodType,
          emergencyContactPerson: emergencyName,
          emergencyContactNumber: emergencyPhone,
          signature: signatureData,
          isWalkIn: true 
        } as any
    });

    // POST to the external API
    try {
      const token = localStorage.getItem('pdao_auth_token');
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const isLoggedAsAdmin = !!(currentUser && currentUser.role && currentUser.role !== Role.CITIZEN);
      const id_modality = isLoggedAsAdmin ? "Walk-in" : "Online";

      let id_request_type: 'New ID' | 'Renewal' | 'Lost' | 'Damaged' = 'New ID';
      if (walkInSubTab === 'renewal') {
        id_request_type = 'Renewal';
      } else if (walkInSubTab === 'lost_damage') {
        id_request_type = lostOrDamaged;
      }

      const formData = new FormData();
      const pwdNoValue = idFormData.controlNo || isApplying.pwdIdNumber || isApplying.id || '';
      formData.append('controlNo', pwdNoValue);
      formData.append('pwd_number', pwdNoValue);
      formData.append('pwdNo', pwdNoValue);
      formData.append('pwd_id_num', pwdNoValue);
      formData.append('pwdIdNumber', pwdNoValue);
      formData.append('firstName', idFormData.firstName);
      formData.append('middleName', idFormData.middleName || '');
      formData.append('lastName', idFormData.lastName);
      formData.append('suffix', idFormData.suffix || '');
      formData.append('birthDate', idFormData.birthDate);
      formData.append('sex', idFormData.sex);
      formData.append('address', idFormData.address);
      formData.append('disability_types', idFormData.disability_types);
      formData.append('bloodType', bloodType || '');
      formData.append('emergency_contact_name', emergencyName || '');
      formData.append('emergency_contact_number', emergencyPhone || '');
      formData.append('id_modality', id_modality);
      formData.append('id_request_type', id_request_type);
      formData.append('applicationType', appType);
      formData.append('description', desc);
      formData.append('dateIssued', new Date().toISOString().split('T')[0]);
      formData.append('dateExpiry', new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0]);

      // Handle converting and appending signature (Base64 signature from signature pad canvas)
      if (signatureData) {
        const signatureBlob = dataURLtoBlob(signatureData);
        if (signatureBlob) {
          formData.append('signature', signatureBlob, 'signature.png');
        } else {
          formData.append('signature', signatureData);
        }
      }

      // Handle converting and appending digital portrait
      if (capturedImage && capturedImage.startsWith('data:')) {
        const photoBlob = dataURLtoBlob(capturedImage);
        if (photoBlob) {
          formData.append('photo', photoBlob, 'portrait.png');
        } else {
          formData.append('photo', capturedImage);
        }
      } else if (capturedImage) {
        formData.append('photo', capturedImage);
      }

      // 7. Temporarily log the actual payload being received by the API
      console.log('--- TEMPORARY API REQUEST LOG ---');
      console.log('API POST Target: https://api-dbpwd.phoenix.com.ph/api/id-issuance');
      for (const pair of (formData as any).entries()) {
        const key = pair[0];
        const val = pair[1];
        if (val instanceof Blob) {
          console.log(`[Form Field-File] ${key}: Blob Name/Type="${(val as any).name || 'Blob'}", Size=${val.size} bytes, MimeType="${val.type}"`);
        } else {
          console.log(`[Form Field-Text] ${key}:`, val);
        }
      }
      console.log('---------------------------------');

      const response = await fetch('https://api-dbpwd.phoenix.com.ph/api/id-issuance', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.error('External API registration failed error details:', errJson);
        
        let customMessage = 'Failed to submit form to external API.';
        if (errJson.errors) {
          const detailedErrors = Object.entries(errJson.errors)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          customMessage += ` (${detailedErrors})`;
        } else if (errJson.message) {
          customMessage += ` (${errJson.message})`;
        }
        
        setErrorMsg(customMessage);
        // Clear message after 15 seconds
        setTimeout(() => setErrorMsg(null), 15000);
        throw new Error(customMessage);
      } else {
        const successData = await response.json().catch(() => ({}));
        console.log('External API registration success response:', successData);
      }
    } catch (apiErr: any) {
      console.error("Error posting to external system-specific API endpoint:", apiErr);
    }

    if (res.ok) {
        setIsApplying(null);
        setSuccessMessage("Walk-in ID application reflected in database.");
        setTimeout(() => setSuccessMessage(null), 5000);
        navigate('/admin/id/all');
    }
  };

  const getFieldClass = (fieldName: string) => {
    const hasError = errors.includes(fieldName);
    return `w-full bg-slate-50 border ${hasError ? 'border-red-500 bg-red-50/30' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c] transition-all`;
  };

  useEffect(() => {
    if (isApplying) {
      const fullNameStr = isApplying.name || isApplying.fullName || '';
      const nameParts = fullNameStr.split(' ');

      // Robust Civil Status normalization to match Title Case dropdown options
      const rawCivilStatus = isApplying.civil_status || isApplying.personal_information?.civil_status || isApplying.civilStatus || '';
      let normCivilStatus = '';
      if (rawCivilStatus) {
        const lowerStatus = rawCivilStatus.toLowerCase().trim();
        if (lowerStatus === 'married' || lowerStatus === 'm') normCivilStatus = 'Married';
        else if (lowerStatus === 'single' || lowerStatus === 's') normCivilStatus = 'Single';
        else if (lowerStatus === 'widowed' || lowerStatus === 'w') normCivilStatus = 'Widowed';
        else if (lowerStatus === 'separated' || lowerStatus === 'sep') normCivilStatus = 'Separated';
        else {
          normCivilStatus = rawCivilStatus.charAt(0).toUpperCase() + rawCivilStatus.slice(1).toLowerCase();
        }
      }

      // Robust Disability Type normalization
      let normDisability = isApplying.disability_types || isApplying.disabilityType || isApplying.typeOfDisability || '';
      if (!normDisability || normDisability === 'Not Specified') {
        const rawItem = isApplying._raw || {};
        normDisability = rawItem.disability_details?.disability_types || rawItem.congenital_outflow_defect?.types || normDisability;
      }
      if (!normDisability) {
        normDisability = 'Not Specified';
      }

      setIdFormData({
        firstName: isApplying.firstName || nameParts[0] || '',
        middleName: isApplying.middleName || '',
        lastName: isApplying.lastName || nameParts[nameParts.length - 1] || '',
        suffix: isApplying.suffix || '',
        birthDate: isApplying.birthDate || '',
        birthPlace: isApplying.birthPlace || '',
        sex: isApplying.sex || isApplying.gender || 'N/A',
        citizenship: isApplying.citizenship || 'Filipino',
        civil_status: normCivilStatus,
        address: isApplying.address || '',
        contactNumber: isApplying.contactNumber || isApplying.phone || '',
        emergencyContactPerson: isApplying.emergencyContactPerson || '',
        emergencyContactNumber: isApplying.emergencyContactNumber || '',
        joinFederation: isApplying.joinFederation || false,
        disability_types: normDisability,
        capturedImage: undefined,
        controlNo: isApplying.pwdIdNumber || isApplying.id || ''
      });
      setBloodType(isApplying.bloodType || '');
      setEmergencyName(isApplying.emergencyContactPerson || '');
      setEmergencyPhone(isApplying.emergencyContactNumber || '');
      setCapturedImage(isApplying.avatarUrl || null);
      setFiles(['Verified_By_Admin_Physical_Copy.pdf']);
      setWalkInStep(1);
      setHasSignature(false);
      setErrors([]);
      
      // Clear signature canvas after rendering dialog
      setTimeout(() => {
        if (sigCanvasRef.current) {
          const ctx = sigCanvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
        }
      }, 200);
    }
  }, [isApplying]);

  // Walk-in main screen
  if (tab === 'walk-in') {
    const walkinCitizens = masterlistRecords.filter(m => {
      const query = searchTerm.toLowerCase();
      const pwdNum = (m.pwdIdNumber || '').toLowerCase();
      const fullName = (m.name || m.fullName || '').toLowerCase();
      const barangay = (m.barangay || '').toLowerCase();
      const idVal = (m.id || '').toLowerCase();
      const matchesSearch = pwdNum.includes(query) || fullName.includes(query) || barangay.includes(query) || idVal.includes(query);
      
      if (!matchesSearch) return false;

      // Filter: if tab is "New ID" (walkInSubTab === 'new')
      if (walkInSubTab === 'new') {
        const idStatus = (
          m._raw?.application_details?.id_status || 
          m.application_details?.id_status || 
          m.id_status || 
          ''
        ).toLowerCase();

        // 1. Only display if id status = Pending
        if (idStatus !== 'pending') {
          return false;
        }

        // 2. Only display if NO record in PWD ID Issuance > management table at all
        const hasExistingManagementRecord = issuanceRecords.some(r => {
          const rPwdNum = (r.personal_information?.pwd_number || r.pwd_number || '').toLowerCase();
          const rFullName = (r.personal_information?.full_name || r.full_name || r.fullname || '').toLowerCase();
          
          const isSameCitizen = 
            (rPwdNum && (rPwdNum === pwdNum || rPwdNum === idVal)) ||
            (rFullName && rFullName === fullName);

          return isSameCitizen;
        });

        if (hasExistingManagementRecord) {
          return false;
        }
      }

      // Filter: if tab is "Renewal" or "Lost / Damage" (walkInSubTab === 'renewal' || walkInSubTab === 'lost_damage')
      if (walkInSubTab === 'renewal' || walkInSubTab === 'lost_damage') {
        const idStatus = (
          m._raw?.application_details?.id_status || 
          m.application_details?.id_status || 
          m.id_status || 
          ''
        ).toLowerCase();

        // Only display if id status = Released
        if (idStatus !== 'released') {
          return false;
        }
      }

      return true;
    });
    return (
      <div className="space-y-6 animate-fade-in" id="walkin-view-container">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-[32px] font-normal text-slate-800 uppercase tracking-tight">Walk-in ID Application</h1>
            <p className="text-slate-500 font-medium">Search registry and initiate ID issuance processes for on-site citizens.</p>
          </div>
        </header>

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-700 text-xs font-medium uppercase tracking-widest animate-fade-in-down flex items-center gap-2">
            <CheckCircle size={16}/> {successMessage}
          </div>
        )}

        {/* 3 Tab Selection for ID Application Modality */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-md w-full border border-slate-200">
          <button
            onClick={() => setWalkInSubTab('new')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              walkInSubTab === 'new'
                ? 'bg-white text-[#1e419c] shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            New ID
          </button>
          <button
            onClick={() => setWalkInSubTab('renewal')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              walkInSubTab === 'renewal'
                ? 'bg-white text-[#1e419c] shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Renewal
          </button>
          <button
            onClick={() => setWalkInSubTab('lost_damage')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              walkInSubTab === 'lost_damage'
                ? 'bg-white text-[#1e419c] shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Lost / Damage
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="relative max-w-xl">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="text" placeholder="Search registry by name, database ID or PWD Number..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#1e419c]/10 transition-all font-medium text-sm text-slate-900 uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-[#1e419c] text-white text-[10px] font-normal uppercase tracking-[0.2em]">
                    <tr>
                      <th className="p-8">PWD Number</th>
                      <th className="p-8">Full Name</th>
                      <th className="p-8">Barangay</th>
                      <th className="p-8 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {walkinCitizens.map(user => (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-8">
                                <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                                  {user.pwdIdNumber || '---'}
                                </span>
                              </td>
                              <td className="p-8">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                                          <img 
                                              src={user.avatarUrl || 'https://www.phoenix.com.ph/wp-content/uploads/2026/03/Group-260-e1773292822209.png'} 
                                              alt={user.name} 
                                              className="w-full h-full object-cover"
                                              referrerPolicy="no-referrer"
                                          />
                                      </div>
                                      <div className="flex flex-col">
                                          <p className="font-medium text-slate-800 uppercase tracking-tight text-sm leading-tight">{user.name}</p>
                                          <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-widest">Entry #{user.id}</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="p-8 text-xs font-medium text-slate-500 uppercase">
                                {user.barangay || user.address?.split(',')[1]?.trim() || '---'}
                              </td>
                              <td className="p-8 text-right">
                                <button onClick={() => setIsApplying(user)} className="px-6 py-3 bg-[#1e419c] text-white rounded-xl font-medium text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-all inline-flex items-center gap-2 group">
                                  <span>Proceed</span>
                                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                                </button>
                              </td>
                          </tr>
                      ))}
                      {walkinCitizens.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-16 text-center text-slate-400 font-semibold text-xs uppercase tracking-widest">
                            No citizens found in registry.
                          </td>
                        </tr>
                      )}
                  </tbody>
              </table>
          </div>
        </div>

        {isApplying && (() => {
          const previewUser = {
            id: idFormData.controlNo || isApplying?.id?.toString() || 'PWD-ID',
            role: Role.CITIZEN,
            name: `${idFormData.firstName} ${idFormData.middleName ? idFormData.middleName + ' ' : ''}${idFormData.lastName} ${idFormData.suffix}`.trim().toUpperCase() || 'JUAN DELA CRUZ',
            firstName: idFormData.firstName,
            lastName: idFormData.lastName,
            middleName: idFormData.middleName,
            suffix: idFormData.suffix,
            pwdIdNumber: idFormData.controlNo || '13-7405-000-00000',
            barangay: isApplying?.barangay || idFormData.address?.split(',')[1]?.trim() || 'SAN JUAN CITY',
            address: idFormData.address || 'SAN JUAN CITY, METRO MANILA',
            birthDate: idFormData.birthDate,
            sex: idFormData.sex || 'MALE',
            gender: idFormData.sex || 'MALE',
            disabilityType: idFormData.disability_types || 'ORTHOPEDIC',
            bloodType: bloodType || 'O+',
            avatarUrl: capturedImage || undefined,
            emergencyContactPerson: emergencyName || 'N/A',
            emergencyContactNumber: emergencyPhone || 'N/A',
            contactNumber: isApplying.contactNumber || isApplying.phone || 'N/A',
            pwdIdIssueDate: new Date().toISOString().split('T')[0],
            pwdIdExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0]
          };

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setIsApplying(null)} />
              <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-20 flex flex-col overflow-hidden animate-scale-up">
                <div className="bg-[#1e419c] p-8 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl"><CreditCard size={24} /></div>
                    <div>
                      <h2 className="text-xl font-normal uppercase tracking-widest text-[16px] md:text-xl">
                        {walkInSubTab === 'new' && 'Walk-in ID Application Form (New ID)'}
                        {walkInSubTab === 'renewal' && 'Walk-in ID Application Form (Renewal)'}
                        {walkInSubTab === 'lost_damage' && 'Walk-in ID Application Form (Replacement)'}
                      </h2>
                      <p className="text-[10px] text-white/60 font-semibold uppercase mt-1.5 tracking-wider">
                        {walkInStep === 1 && 'Step 1 of 3: Profile Details & Form'}
                        {walkInStep === 2 && 'Step 2 of 3: Photo Capture'}
                        {walkInStep === 3 && 'Step 3 of 3: Signature Capture'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setIsApplying(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                </div>

                {/* PAGE 1: Profile Details & Intake Form */}
                <div className={`flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar ${walkInStep === 1 ? 'block' : 'hidden'}`}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    
                    {/* Left Column: Personal details */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          Personal & Demographics Details
                        </h3>
                        <span className="text-[9px] bg-[#1e419c]/10 text-[#1e419c] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">SEC I</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">First Name <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            name="firstName" 
                            value={idFormData.firstName} 
                            onChange={handleInputChange} 
                            className={getFieldClass('firstName')}
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Middle Name</label>
                          <input 
                            type="text" 
                            name="middleName" 
                            value={idFormData.middleName} 
                            onChange={handleInputChange} 
                            className={getFieldClass('middleName')}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Last Name <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            name="lastName" 
                            value={idFormData.lastName} 
                            onChange={handleInputChange} 
                            className={getFieldClass('lastName')}
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Suffix (e.g. JR., III)</label>
                          <input 
                            type="text" 
                            name="suffix" 
                            value={idFormData.suffix} 
                            onChange={handleInputChange} 
                            className={getFieldClass('suffix')}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Birth Date <span className="text-red-500">*</span></label>
                          <input 
                            type="date" 
                            name="birthDate" 
                            value={idFormData.birthDate} 
                            onChange={handleInputChange} 
                            className={getFieldClass('birthDate')}
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Sex</label>
                          <select 
                            name="sex" 
                            value={idFormData.sex} 
                            onChange={handleInputChange} 
                            className={getFieldClass('sex')}
                          >
                            <option value="MALE">MALE</option>
                            <option value="FEMALE">FEMALE</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Home Address</label>
                        <textarea 
                          name="address" 
                          value={idFormData.address} 
                          onChange={(e) => {
                            setIdFormData(prev => ({ ...prev, address: e.target.value }));
                          }} 
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-medium uppercase outline-none focus:border-[#1e419c] transition-all"
                        />
                      </div>
                    </div>
                    
                    {/* Right Column: Editable details */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          Contact, emergency & Registry details
                        </h3>
                        <span className="text-[9px] bg-indigo-50 text-[#1e419c] border border-indigo-100 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">SEC II</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">PWD ID Number</label>
                          <input 
                            type="text" 
                            name="controlNo" 
                            value={idFormData.controlNo} 
                            readOnly
                            className={`${getFieldClass('controlNo')} bg-slate-100 text-slate-500 cursor-not-allowed`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#1e419c] uppercase tracking-wider ml-1 block">Classified (Disability Type) <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            name="disability_types" 
                            value={idFormData.disability_types} 
                            onChange={handleInputChange} 
                            placeholder="e.g. ORTHOPEDIC, VISUAL"
                            className={getFieldClass('disability_types')}
                          />
                        </div>
                      </div>

                      {walkInSubTab === 'lost_damage' && (
                        <div className="space-y-1.5 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-fade-in">
                          <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider ml-1 block">Replacement Type / Reason <span className="text-red-500">*</span></label>
                          <select 
                            value={lostOrDamaged} 
                            onChange={(e) => setLostOrDamaged(e.target.value as 'Lost' | 'Damaged')} 
                            className="w-full bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-900 font-bold uppercase outline-none focus:border-amber-500 hover:border-amber-400 transition-colors"
                          >
                            <option value="Lost">Lost ID Card</option>
                            <option value="Damaged">Damaged ID Card</option>
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#1e419c] uppercase tracking-wider ml-1 block">Blood Type</label>
                          <select 
                            value={bloodType} 
                            onChange={(e) => setBloodType(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold uppercase outline-none focus:border-[#1e419c] transition-colors"
                          >
                            <option value="">Select Blood Type</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#1e419c] uppercase tracking-wider ml-1 block">Emergency Contact Name</label>
                          <input 
                            type="text" 
                            value={emergencyName} 
                            onChange={(e) => setEmergencyName(e.target.value)} 
                            placeholder="Full Name of Contact Person" 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold uppercase outline-none focus:border-[#1e419c] transition-colors"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#1e419c] uppercase tracking-wider ml-1 block">Emergency Contact Number</label>
                          <input 
                            type="text" 
                            value={emergencyPhone} 
                            onChange={(e) => setEmergencyPhone(e.target.value)} 
                            placeholder="e.g. 0917XXXXXXX" 
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold uppercase outline-none focus:border-[#1e419c] transition-colors"
                          />
                        </div>
                      </div>

                      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] text-slate-700 space-y-2 mt-4 animate-fade-in">
                        <div className="flex items-center gap-2 font-bold text-[10px] text-emerald-800 uppercase tracking-widest">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Information Verification
                        </div>
                        <p className="text-[11px] leading-relaxed text-emerald-800 font-semibold font-sans">
                          All the fields above are open and editable. Please review and refine the client information, then click Continue to proceed to biometric photograph capture.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* PAGE 2: Isolated Biometric Photograph Capture */}
                <div className={`flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar ${walkInStep === 2 ? 'block' : 'hidden'}`}>
                  <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                    
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Camera size={16} className="text-[#1e419c]" />
                        Biometric Photograph Capture
                      </h3>
                      <span className="text-[9px] bg-indigo-50 text-[#1e419c] border border-indigo-100 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Step 2 of 4</span>
                    </div>

                    {/* Camera Biometrics Container */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Camera size={14} className="text-[#1e419c]" />
                          Digital Photograph
                        </h4>
                        {capturedImage && (
                          <span className="text-[8px] bg-emerald-500 text-white font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest">Captured</span>
                        )}
                      </div>

                      <div className={`border-2 border-dashed rounded-2xl h-80 flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 ${errors.includes('capturedImage') ? 'border-red-500 bg-red-50/20 animate-pulse' : 'border-slate-200'}`}>
                        {capturedImage ? (
                          <>
                            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured Biological Photo" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => setCapturedImage(null)} 
                              className="absolute top-3 right-3 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg hover:scale-105 transition-all text-xs"
                              title="Retake Photo"
                              type="button"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => { setIsCameraOpen(true); startCamera(); }} 
                            className="flex flex-col items-center gap-3 text-[#1e419c] hover:text-[#153073] transition-all font-bold uppercase text-[11px] p-6 text-center focus:outline-none"
                            type="button"
                          >
                            <div className="p-4 bg-[#1e419c]/10 text-[#1e419c] rounded-full mb-1">
                              <Camera size={32} />
                            </div>
                            <span>Activate Webcam</span>
                            <span className="text-[9px] text-slate-400 font-medium lowercase tracking-normal">Requires security video feedback</span>
                          </button>
                        )}
                      </div>
                      {errors.includes('capturedImage') && (
                        <p className="text-[9px] text-red-500 font-bold text-center uppercase tracking-wider animate-bounce">Face photograph capture is strictly required</p>
                      )}
                      <p className="text-[9px] text-slate-400 font-semibold text-center uppercase tracking-wider leading-relaxed">
                        Ensure client faces the center of the camera frame with natural lighting.
                      </p>
                    </div>

                  </div>
                </div>

                {/* PAGE 3: Isolated Wet Stylus Signature */}
                <div className={`flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar ${walkInStep === 3 ? 'block' : 'hidden'}`}>
                  <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                    
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Fingerprint size={16} className="text-[#1e419c]" />
                        Applicant Digital Signature
                      </h3>
                      <span className="text-[9px] bg-indigo-50 text-[#1e419c] border border-indigo-100 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Step 3 of 4</span>
                    </div>

                    {/* Signature Pad Interactive Canvas */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Edit3 size={14} className="text-[#1e419c]" />
                          Applicant Sign-off
                        </h4>
                        {hasSignature && (
                          <button onClick={clearSignature} className="text-[10px] text-rose-600 hover:text-rose-700 font-bold uppercase tracking-wider transition-colors focus:outline-none">
                            Clear Frame
                          </button>
                        )}
                      </div>

                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                        <canvas 
                          ref={sigCanvasRef} 
                          width={400}
                          height={224}
                          className="w-full h-56 cursor-crosshair touch-none bg-slate-50/50"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold text-center uppercase tracking-wider leading-relaxed">
                        Draw stylus/mouse signature inside the secure bounding box.
                      </p>
                    </div>

                    <div className="bg-slate-100 border border-slate-200/60 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-4">
                      <ShieldCheck size={28} className="text-[#1e419c] shrink-0" />
                      <div className="text-center md:text-left">
                        <h5 className="font-bold text-[10px] text-slate-700 uppercase tracking-wider font-sans">Administrative Sign-Off Compliance</h5>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
                          Pursuant to government guidelines, registering an authoritative electronic signature is recommended to validate credentials issuance.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* MODAL FOOTER STEPS CONTROLLER */}
                <div className="p-8 bg-white border-t border-slate-100 flex justify-end items-center gap-3 shrink-0">
                  {walkInStep === 1 && (
                    <>
                      <button onClick={() => setIsApplying(null)} className="px-10 py-3 text-slate-400 font-semibold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                      <button 
                        onClick={() => {
                          if (validateWalkInStep1()) {
                            setWalkInStep(2);
                          }
                        }} 
                        className="px-14 py-3 bg-[#1e419c] hover:bg-[#153073] text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-colors flex items-center gap-2"
                      >
                        <span>Continue to Photo</span>
                        <ArrowRight size={14} />
                      </button>
                    </>
                  )}
                  {walkInStep === 2 && (
                    <>
                      <button onClick={() => setWalkInStep(1)} className="px-10 py-3 text-slate-400 font-semibold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors">Back to Form</button>
                      <button 
                        onClick={() => {
                          if (!capturedImage) {
                            setErrors(['capturedImage']);
                          } else {
                            setErrors([]);
                            setWalkInStep(3);
                          }
                        }} 
                        className="px-14 py-3 bg-[#1e419c] hover:bg-[#153073] text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-colors flex items-center gap-2"
                      >
                        <span>Continue to Signature</span>
                        <ArrowRight size={14} />
                      </button>
                    </>
                  )}
                  {walkInStep === 3 && (
                    <>
                      <button onClick={() => setWalkInStep(2)} className="px-10 py-3 text-slate-400 font-semibold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-colors">Back to Photo</button>
                      <button 
                        onClick={handleConfirmApplication} 
                        className="px-14 py-3 bg-[#1e419c] hover:bg-[#153073] text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-colors flex items-center gap-2"
                      >
                        <ShieldCheck size={14} />
                        <span>Issue PWD ID</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {isCameraOpen && <div className="fixed inset-0 z-[100] bg-slate-900/95 flex flex-col items-center justify-center p-4"><div className="w-full max-w-xl bg-black rounded-3xl overflow-hidden relative border-4 border-white/10 shadow-2xl"><video ref={videoRef} autoPlay playsInline className="w-full h-auto" /><div className="absolute inset-0 pointer-events-none flex items-center justify-center"><div className="w-[300px] h-[300px] border-4 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"></div></div><div className="absolute top-6 left-6 right-6 flex justify-between items-start"><div className="bg-[#1e419c] text-white px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest shadow-lg">Bio Scan Active</div><button onClick={() => { setIsCameraOpen(false); if(videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); }} className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-all"><X size={24}/></button></div><div className="absolute bottom-8 left-0 right-0 flex justify-center"><button onClick={capturePhoto} className="p-1 bg-white rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all"><div className="w-16 h-16 rounded-full border-4 border-slate-900 flex items-center justify-center"><div className="w-12 h-12 bg-slate-900 rounded-full"></div></div></button></div></div></div>}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // Management tab / default view (GET api-dbpwd.drchiocms.com/api/id-issuance)
  return (
    <div className="space-y-6 animate-fade-in" id="management-view-container">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-[32px] font-normal text-slate-800 uppercase tracking-tight">ID Issuance Management</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-500 font-medium text-lg">Central ID Lifecycle Registry</p>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
              <Activity size={14} className="text-emerald-500" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600">API Sync Live</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={fetchIssuanceRecords} 
            disabled={isLoading} 
            className="flex items-center gap-2 px-6 py-3 bg-[#1e419c] text-white rounded-2xl font-medium text-[10px] uppercase tracking-widest hover:opacity-90 shadow-xl disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Fetching State...' : 'Sync Database'}
          </button>
        </div>
      </header>

      {/* SUCCESS / ERROR TOP-BAR */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-[2rem] text-emerald-700 text-xs font-medium animate-fade-in-down flex items-start gap-3 shadow-sm">
          <CheckCircle className="shrink-0 mt-0.5" size={18}/>
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-widest text-[10px]">Operation Successful</p>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] text-rose-700 text-xs font-medium animate-fade-in-down flex items-start gap-3 shadow-sm">
          <AlertCircle className="shrink-0 mt-0.5 animate-bounce" size={18}/>
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-widest text-[10px]">Application Core Error</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR PANEL */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-black/5">
        <div className="p-8 border-b border-slate-100 bg-slate-50/40 space-y-6">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-[#1e419c]" size={20} />
              <input 
                type="text" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Search by PWD Number, Full Name, Barangay, Status..." 
                className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#1e419c]/10 outline-none transition-all text-sm text-slate-900 font-medium uppercase tracking-tight" 
              />
            </div>
            
            {/* Stat Tag */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-white rounded-2xl border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0 self-start xl:self-auto">
              <Database size={12} className="text-[#1e419c]" /> Registered ID Application Count: {searchedAndFiltered.length}
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {/* Status Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Filter Application Status</label>
              <div className="relative">
                <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-700 font-bold uppercase outline-none focus:border-[#1e419c]"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">ALL STATUSES</option>
                  {statusOptions.filter(o => o !== 'all').map(opt => (
                    <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Request Type Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Filter Request Type</label>
              <div className="relative">
                <ClipboardList size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-700 font-bold uppercase outline-none focus:border-[#1e419c]"
                  value={filterRequestType}
                  onChange={e => setFilterRequestType(e.target.value)}
                >
                  <option value="all">ALL REQUEST TYPES</option>
                  {requestTypeOptions.filter(o => o !== 'all').map(opt => (
                    <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modality Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Filter Modality</label>
              <div className="relative">
                <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-700 font-bold uppercase outline-none focus:border-[#1e419c]"
                  value={filterModality}
                  onChange={e => setFilterModality(e.target.value)}
                >
                  <option value="all">ALL MODALITIES</option>
                  {modalityOptions.filter(o => o !== 'all').map(opt => (
                    <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* DATA TABLE CONTAINER */}
        {isLoading ? (
          <div className="p-32 text-center flex flex-col items-center justify-center gap-4">
            <RefreshCw className="animate-spin text-[#1e419c] drop-shadow-md" size={48} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">
              Retrieving dynamic ID issuance logs...
            </p>
          </div>
        ) : searchedAndFiltered.length === 0 ? (
          <div className="p-32 text-center text-slate-300">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Database size={60} className="opacity-10" />
            </div>
            <p className="font-bold uppercase tracking-[0.3em] text-xs text-slate-400">No records found matching query filters.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto select-none">
            <table className="w-full text-left border-collapse table-auto min-w-[1100px]">
              <thead className="bg-[#1e419c] text-white text-[10px] font-bold uppercase tracking-[0.2em]">
                <tr>
                  <th className="p-6">PWD Number</th>
                  <th className="p-6">Fullname</th>
                  <th className="p-6">Barangay</th>
                  <th className="p-6">Application Date</th>
                  <th className="p-6">Request Type</th>
                  <th className="p-6">Modality</th>
                  <th className="p-6">Status</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedResponse.map(record => {
                  const statusLower = (record.application_status?.id_status || record.application_status?.status || '').toLowerCase();
                  const showPreview = statusLower === 'approved' || statusLower === 'released';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* PWD Number */}
                      <td className="p-6 font-semibold text-slate-700">
                        {record.personal_information?.pwd_number || '-'}
                      </td>

                      {/* Full Name */}
                      <td className="p-6 font-bold text-slate-900 uppercase">
                        {record.personal_information?.full_name || '-'}
                      </td>

                      {/* Barangay */}
                      <td className="p-6 uppercase text-slate-600 font-medium">
                        {record.address?.barangay || '-'}
                      </td>

                      {/* Application Date */}
                      <td className="p-6 font-medium text-slate-500">
                        {formatReadableDate(record.application_status?.application_date)}
                      </td>

                      {/* Request Type */}
                      <td className="p-6 text-[#1e419c] font-black uppercase tracking-wider text-[10px]">
                        {record.application_status?.request_type || '-'}
                      </td>

                      {/* Modality */}
                      <td className="p-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                          (record.application_status?.modality || '').toLowerCase() === 'walk-in' 
                            ? 'bg-purple-50 text-purple-700 border-purple-100' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {(record.application_status?.modality || '').toLowerCase() === 'walk-in' ? <MapPin size={10} /> : <Globe size={10} />}
                          {record.application_status?.modality || '-'}
                        </span>
                      </td>

                      {/* Application Status */}
                      <td className="p-6">
                        {renderStatusBadge(record.application_status?.id_status || record.application_status?.status)}
                      </td>

                      {/* Action Sticky Column / Action Button */}
                      <td className="p-6 text-right relative">
                        <div className="flex justify-end">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuRowId(openMenuRowId === record.id ? null : record.id);
                            }}
                            className="p-2 text-slate-400 hover:text-[#1e419c] hover:bg-slate-100 rounded-xl transition-all"
                            title="Options"
                          >
                            <MoreHorizontal size={20} />
                          </button>

                          {openMenuRowId === record.id && (
                            <>
                              {/* Click-out overlay */}
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuRowId(null)} />
                              <div className="absolute right-6 top-12 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 w-56 text-left z-50 animate-scale-up font-sans">
                                <button
                                  onClick={() => {
                                    setViewingRecord(record);
                                    setOpenMenuRowId(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
                                >
                                  <Eye size={14} className="text-slate-400" />
                                  View Details
                                </button>

                                {(() => {
                                  // Determine list of conditional allowed options based on current status
                                  const isPending = statusLower === 'pending';
                                  const isApproved = statusLower === 'approved';
                                  const isDisapproved = statusLower === 'rejected' || statusLower === 'disapproved';
                                  const isReleased = statusLower === 'released';

                                  let allowedOptions: { label: string; status: string }[] = [];
                                  if (isPending) {
                                    allowedOptions = [
                                      { label: 'Approved', status: 'approved' },
                                      { label: 'Disapproved', status: 'disapproved' }
                                    ];
                                  } else if (isDisapproved) {
                                    allowedOptions = [
                                      { label: 'Move to Pending', status: 'pending' }
                                    ];
                                  } else if (isApproved) {
                                    allowedOptions = [
                                      { label: 'Released', status: 'released' },
                                      { label: 'Move to Pending', status: 'pending' }
                                    ];
                                  }

                                  if (isReleased || allowedOptions.length === 0) return null;

                                  return (
                                    <>
                                      <div className="border-t border-slate-100 my-1"></div>
                                      <div className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                        Change Status
                                      </div>
                                      {allowedOptions.map((opt) => (
                                        <button
                                          key={opt.status}
                                          onClick={() => {
                                            handleInitiateStatusChange(record, opt.status);
                                            setOpenMenuRowId(null);
                                          }}
                                          className="w-full px-4 py-1.5 hover:bg-slate-50 text-xs font-medium flex items-center justify-between transition-colors text-slate-600"
                                        >
                                          <span>{opt.label}</span>
                                        </button>
                                      ))}
                                    </>
                                  );
                                })()}

                                {showPreview && (
                                  <>
                                    <div className="border-t border-slate-100 my-1"></div>
                                    <button
                                      onClick={() => {
                                        setPreviewingIdRecord(record);
                                        setOpenMenuRowId(null);
                                      }}
                                      className="w-full px-4 py-2 hover:bg-slate-50 text-[#1e419c] text-xs font-bold flex items-center gap-2 transition-colors"
                                    >
                                      <CreditCard size={14} className="text-[#1e419c]" />
                                      Preview ID
                                    </button>
                                    <button
                                      onClick={() => {
                                        handlePrintID(record);
                                        setOpenMenuRowId(null);
                                      }}
                                      className="w-full px-4 py-2 hover:bg-slate-50 text-emerald-600 text-xs font-bold flex items-center gap-2 transition-colors"
                                    >
                                      <Printer size={14} className="text-emerald-500" />
                                      Print ID Card
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION NAVIGATION FOOTER */}
        {!isLoading && searchedAndFiltered.length > 0 && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Showing Page {currentPage} of {totalPages} | Total records: {searchedAndFiltered.length}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 enabled:hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 enabled:hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW PROFILE DETAIL MODAL */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingRecord(null)} />
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-20 flex flex-col overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="bg-[#1e419c] p-8 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl text-white">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-normal uppercase tracking-widest text-white">PWD Candidate Profile</h2>
                </div>
              </div>
              <button onClick={() => setViewingRecord(null)} className="p-2 text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 space-y-6 custom-scrollbar">
              
              {/* Profile Grid Block */}
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-6 items-center">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                  {safeParseAttachment(viewingRecord.attachments?.photo_url || viewingRecord.attachments?.photo) ? (
                    <img 
                      src={safeParseAttachment(viewingRecord.attachments?.photo_url || viewingRecord.attachments?.photo)!} 
                      alt="Applicant Photo" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon size={36} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">
                    {viewingRecord.personal_information?.full_name || 'No Full Name Provided'}
                  </h3>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-3">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200">
                      PWD ID: {viewingRecord.personal_information?.pwd_number || 'NOT ISSUED'}
                    </span>
                    {renderStatusBadge(viewingRecord.application_status?.id_status || viewingRecord.application_status?.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* A. APPLICATION STATUS */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
                  <h4 className="text-[10px] font-bold text-[#1e419c] uppercase tracking-[0.15em] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <ClipboardList size={14} /> Application Status
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Status</span>
                      <span className="text-slate-900 uppercase font-bold">{formatStatusForDisplay(viewingRecord.application_status?.id_status || viewingRecord.application_status?.status)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Request Type</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.application_status?.request_type || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Modality</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.application_status?.modality || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Application Date</span>
                      <span className="text-slate-900">{formatReadableDate(viewingRecord.application_status?.application_date)}</span>
                    </div>
                  </div>
                </div>

                {/* B. PERSONAL INFORMATION */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
                  <h4 className="text-[10px] font-bold text-[#1e419c] uppercase tracking-[0.15em] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <UserIcon size={14} /> Personal Information
                  </h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-semibold">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">PWD Number</span>
                      <span className="text-slate-900">{viewingRecord.personal_information?.pwd_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Full Name</span>
                      <span className="text-slate-900 uppercase block truncate">{viewingRecord.personal_information?.full_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">First Name</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.personal_information?.first_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Middle Name</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.personal_information?.middle_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Last Name</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.personal_information?.last_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Suffix</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.personal_information?.suffix || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Gender / Sex</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.personal_information?.gender || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Date of Birth</span>
                      <span className="text-slate-900">{formatReadableDate(viewingRecord.personal_information?.date_of_birth)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Civil Status</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.personal_information?.civil_status || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Mobile Number</span>
                      <span className="text-slate-900">{viewingRecord.personal_information?.mobile_no || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* C. ADDRESS */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
                  <h4 className="text-[10px] font-bold text-[#1e419c] uppercase tracking-[0.15em] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <MapPin size={14} /> Physical Address Address
                  </h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-semibold">
                    <div className="col-span-2">
                      <span className="text-[9px] text-slate-400 uppercase block">House Number / Street / District</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.address?.house_street || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Barangay</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.address?.barangay || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">City / Municipality</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.address?.municipality || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Province</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.address?.province || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Region</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.address?.region || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* D. EMERGENCY CONTACT */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
                  <h4 className="text-[10px] font-bold text-[#1e419c] uppercase tracking-[0.15em] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <ShieldCheck size={14} /> Emergency Contact
                  </h4>
                  <div className="grid grid-cols-1 gap-4 text-xs font-semibold">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Contact Person Name</span>
                      <span className="text-slate-900 uppercase">{viewingRecord.emergency_contact?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Mobile/Contact Number</span>
                      <span className="text-slate-900">{viewingRecord.emergency_contact?.number || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* E. ISSUANCE DETAILS */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3.5 col-span-1 md:col-span-2">
                  <h4 className="text-[10px] font-bold text-[#1e419c] uppercase tracking-[0.15em] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <CreditCard size={14} /> ID Issuance & Clearance Details
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Passed Review Date</span>
                      <span className="text-slate-900">{formatReadableDate(viewingRecord.issuance_details?.date_reviewed)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Released Date</span>
                      <span className="text-slate-900">{formatReadableDate(viewingRecord.issuance_details?.released_date)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Expiration Date</span>
                      <span className="text-slate-900">{formatReadableDate(viewingRecord.issuance_details?.expiration_date)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block">Rejection Remarks / Reason</span>
                      <span className="text-rose-600 block max-h-16 overflow-y-auto uppercase text-[11px] font-bold">{viewingRecord.issuance_details?.rejection_remarks || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* F. ATTACHMENTS SECTION */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 col-span-1 md:col-span-2">
                  <h4 className="text-[10px] font-bold text-[#1e419c] uppercase tracking-[0.15em] border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <FileText size={14} /> Attachments
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Display Photo */}
                    <AttachmentItem label="Display Photo" value={viewingRecord.attachments?.photo_url || viewingRecord.attachments?.photo} downloadable={false} />

                    {/* Display Signature */}
                    <AttachmentItem label="Display Signature" value={viewingRecord.attachments?.signature_url} downloadable={false} />
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-white border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setViewingRecord(null)} className="px-12 py-3.5 bg-[#1e419c] text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-opacity-90">
                Close Record
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ID CARD PREVIEW MODAL */}
      {previewingIdRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPreviewingIdRecord(null)} />
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl relative z-20 flex flex-col items-center max-w-lg w-full gap-6 animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center w-full">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={18} className="text-[#1e419c]" /> PWD ID Preview
              </h3>
              <button onClick={() => setPreviewingIdRecord(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* State for Front/Back Side of the ID card */}
            <div className="flex gap-2">
              <button 
                onClick={() => setIdCardSide('front')} 
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all ${
                  idCardSide === 'front' 
                    ? 'bg-[#1e419c] text-white border-[#1e419c]' 
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Front Side
              </button>
              <button 
                onClick={() => setIdCardSide('back')} 
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl border transition-all ${
                  idCardSide === 'back' 
                    ? 'bg-[#1e419c] text-white border-[#1e419c]' 
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Back Side
              </button>
            </div>

            {/* The actual ID card component wrapped with proportional container */}
            <div className="flex items-center justify-center p-4 bg-slate-50 rounded-2xl w-full border border-slate-200/50 overflow-auto">
              <div className="transform scale-90 origin-center">
                <IDCard 
                  user={{
                    id: previewingIdRecord.id?.toString() || 'PWD-ID',
                    role: Role.CITIZEN,
                    name: previewingIdRecord.personal_information?.full_name || '',
                    firstName: previewingIdRecord.personal_information?.first_name || '',
                    lastName: previewingIdRecord.personal_information?.last_name || '',
                    middleName: previewingIdRecord.personal_information?.middle_name || '',
                    suffix: previewingIdRecord.personal_information?.suffix || '',
                    pwdIdNumber: previewingIdRecord.personal_information?.pwd_number || '',
                    barangay: previewingIdRecord.address?.barangay || '',
                    birthDate: previewingIdRecord.personal_information?.date_of_birth || '',
                    gender: previewingIdRecord.personal_information?.gender || '',
                    disabilityType: previewingIdRecord.personal_information?.disability_type || '',
                    avatarUrl: safeParseAttachment(previewingIdRecord.attachments?.photo_url || previewingIdRecord.attachments?.photo) || undefined,
                  } as unknown as User} 
                  side={idCardSide} 
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 w-full mt-2">
              <button 
                onClick={() => handlePrintID(previewingIdRecord)} 
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:opacity-90 flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={13} />
                Print ID Card
              </button>
              <button 
                onClick={() => setPreviewingIdRecord(null)} 
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase tracking-widest text-[10px] border border-slate-200 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RECORD MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingRecord(null)} />
          <form onSubmit={handleSaveEdit} className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-20 flex flex-col overflow-hidden animate-scale-up">
            
            <div className="bg-amber-600 p-8 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Edit3 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-normal uppercase tracking-widest text-white">Edit ID Issuance Registry Record</h2>
                  <p className="text-[10px] text-white/75 font-bold uppercase mt-1">Transaction Node ID: #{editingRecord.id}</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditingRecord(null)} className="p-2 text-white/60 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 space-y-6 custom-scrollbar text-xs">
              
              {/* Personal info fields */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest border-b pb-2">Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">PWD Number</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.pwd_number} onChange={e => handleEditInputChange('personal_information', 'pwd_number', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Full Name</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.full_name} onChange={e => handleEditInputChange('personal_information', 'full_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">First Name</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.first_name} onChange={e => handleEditInputChange('personal_information', 'first_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Middle Name</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.middle_name} onChange={e => handleEditInputChange('personal_information', 'middle_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Last Name</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.last_name} onChange={e => handleEditInputChange('personal_information', 'last_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Suffix</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.suffix} onChange={e => handleEditInputChange('personal_information', 'suffix', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Gender / Sex</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.gender} onChange={e => handleEditInputChange('personal_information', 'gender', e.target.value)}>
                      <option value="Male">MALE</option>
                      <option value="Female">FEMALE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Date of Birth</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.date_of_birth} onChange={e => handleEditInputChange('personal_information', 'date_of_birth', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Civil Status</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.civil_status} onChange={e => handleEditInputChange('personal_information', 'civil_status', e.target.value)}>
                      <option value="Single">SINGLE</option>
                      <option value="Married">MARRIED</option>
                      <option value="Separated">SEPARATED</option>
                      <option value="Widow/er">WIDOW/ER</option>
                      <option value="Cohabitation">COHABITATION</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Mobile Number</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.personal_information?.mobile_no} onChange={e => handleEditInputChange('personal_information', 'mobile_no', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Address Fields */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest border-b pb-2">Address details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">House Number / Street / District</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.address?.house_street} onChange={e => handleEditInputChange('address', 'house_street', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Barangay</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.address?.barangay} onChange={e => handleEditInputChange('address', 'barangay', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Municipality</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.address?.municipality} onChange={e => handleEditInputChange('address', 'municipality', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Province</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.address?.province} onChange={e => handleEditInputChange('address', 'province', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Region</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.address?.region} onChange={e => handleEditInputChange('address', 'region', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Emergency info and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                  <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest border-b pb-2">Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Contact Person</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.emergency_contact?.name} onChange={e => handleEditInputChange('emergency_contact', 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Contact Number</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.emergency_contact?.number} onChange={e => handleEditInputChange('emergency_contact', 'number', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                  <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest border-b pb-2">Application Status Info</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Status</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.application_status?.status} onChange={e => handleEditInputChange('application_status', 'status', e.target.value)}>
                        <option value="pending">PENDING</option>
                        <option value="approved">APPROVED</option>
                        <option value="rejected">REJECTED</option>
                        <option value="released">RELEASED</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Request Type</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.application_status?.request_type} onChange={e => handleEditInputChange('application_status', 'request_type', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Modality</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.application_status?.modality} onChange={e => handleEditInputChange('application_status', 'modality', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Application Date</label>
                      <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.application_status?.application_date} onChange={e => handleEditInputChange('application_status', 'application_date', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Clearance Details */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest border-b pb-2">Issuance Clearance details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Date Reviewed</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.issuance_details?.date_reviewed || ''} onChange={e => handleEditInputChange('issuance_details', 'date_reviewed', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Released Date</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.issuance_details?.released_date || ''} onChange={e => handleEditInputChange('issuance_details', 'released_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Expiration Date</label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.issuance_details?.expiration_date || ''} onChange={e => handleEditInputChange('issuance_details', 'expiration_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Rejection Remarks</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" value={editFormData.issuance_details?.rejection_remarks || ''} onChange={e => handleEditInputChange('issuance_details', 'rejection_remarks', e.target.value)} />
                  </div>
                </div>
              </div>

            </div>

            <div className="p-8 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setEditingRecord(null)} className="px-6 py-3 border-2 border-slate-200 text-slate-500 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                Cancel
              </button>
              <button type="submit" className="px-10 py-3 bg-amber-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md hover:bg-amber-700">
                Save Changes
              </button>
            </div>

          </form>
        </div>
      )}

      {/* PENDING STATUS FLOW MODALS */}
      {pendingStatusFlow && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setPendingStatusFlow(null)} 
          />
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl relative z-20 overflow-hidden animate-scale-up font-sans">
            
            {/* STEP 1: CONFIRMATION DIALOUGE */}
            {pendingStatusFlow.step === 'confirm' && (
              <>
                <div className="p-10 text-center space-y-6">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm border ${
                    pendingStatusFlow.targetStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    pendingStatusFlow.targetStatus === 'disapproved' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    pendingStatusFlow.targetStatus === 'released' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {pendingStatusFlow.targetStatus === 'approved' ? <CheckCircle size={40} /> :
                     pendingStatusFlow.targetStatus === 'disapproved' ? <XCircle size={40} /> :
                     pendingStatusFlow.targetStatus === 'released' ? <Tag size={40} /> :
                     <HelpCircle size={40} />}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                      Confirm Action
                    </h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed px-2">
                      {getConfirmationMessage(pendingStatusFlow.record, pendingStatusFlow.targetStatus)}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button 
                    onClick={() => setPendingStatusFlow(null)} 
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      const currentStatus = (pendingStatusFlow.record?.application_status?.status || '').toLowerCase();
                      if (pendingStatusFlow.targetStatus === 'disapproved') {
                        setPendingStatusFlow({ ...pendingStatusFlow, step: 'disapproval_reason' });
                      } else if (pendingStatusFlow.targetStatus === 'pending' && (currentStatus === 'rejected' || currentStatus === 'disapproved')) {
                        setPendingStatusFlow({ ...pendingStatusFlow, step: 'disapproval_reason' });
                      } else if (pendingStatusFlow.targetStatus === 'released') {
                        // Autofill today as released date and set expiration date to today + 3 years
                        const today = new Date().toISOString().split('T')[0];
                        setStatusReleaseDate(today);
                        // Compute and fill expiration date
                        const expDate = computeExpirationDate(today);
                        setStatusExpirationDate(expDate);
                        setPendingStatusFlow({ ...pendingStatusFlow, step: 'release_details' });
                      } else {
                        handleExecuteStatusFlowSubmit();
                      }
                    }} 
                    className={`flex-1 py-3 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-opacity ${
                      pendingStatusFlow.targetStatus === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      pendingStatusFlow.targetStatus === 'disapproved' ? 'bg-rose-600 hover:bg-rose-700' :
                      pendingStatusFlow.targetStatus === 'released' ? 'bg-blue-600 hover:bg-blue-700' :
                      'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    Confirm
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: DISAPPROVAL REASON INPUT */}
            {pendingStatusFlow.step === 'disapproval_reason' && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleExecuteStatusFlowSubmit();
                }}
              >
                <div className="bg-rose-50 p-6 flex items-center gap-3 border-b border-rose-100">
                  <XCircle className="text-rose-600" size={20} />
                  <h3 className="font-bold text-rose-950 uppercase tracking-widest">
                    Disapproval Reason
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Provide rejection remarks for this candidate application:
                  </p>
                  <textarea 
                    required 
                    value={statusReasonText} 
                    onChange={(e) => setStatusReasonText(e.target.value)} 
                    placeholder="e.g. Discrepancies found with uploaded certificate paths." 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium text-slate-950 outline-none focus:border-[#1e419c] resize-none" 
                    rows={4} 
                  />
                </div>
                <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => {
                      if (pendingStatusFlow.targetStatus === 'disapproved' || pendingStatusFlow.targetStatus === 'released') {
                        setPendingStatusFlow(null);
                      } else {
                        setPendingStatusFlow({ ...pendingStatusFlow, step: 'confirm' });
                      }
                    }} 
                    className="px-4 py-2 text-slate-400 font-bold text-xs uppercase tracking-widest transition-colors hover:text-slate-600"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-rose-700 transition-colors"
                  >
                    Submit Reason
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: RELEASE DETAILS INPUT */}
            {pendingStatusFlow.step === 'release_details' && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleExecuteStatusFlowSubmit();
                }}
                className="space-y-6 p-6"
              >
                <div className="space-y-2 border-b border-slate-100 pb-4 text-center">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Tag size={24} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">
                    ID Release Details
                  </h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                    For {pendingStatusFlow.record?.personal_information?.full_name}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">
                      Released Date <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="date" 
                      required
                      value={statusReleaseDate} 
                      onChange={(e) => handleReleaseDateChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold uppercase hover:border-[#1e419c] focus:border-[#1e419c] outline-none" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">
                      ID Expiration Date
                    </label>
                    <input 
                      type="date" 
                      readOnly
                      value={statusExpirationDate} 
                      className="w-full bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed rounded-xl px-4 py-3 font-bold uppercase outline-none" 
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => {
                      if (pendingStatusFlow.targetStatus === 'disapproved' || pendingStatusFlow.targetStatus === 'released') {
                        setPendingStatusFlow(null);
                      } else {
                        setPendingStatusFlow({ ...pendingStatusFlow, step: 'confirm' });
                      }
                    }} 
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-[#1e419c] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg hover:opacity-90 transition-opacity"
                  >
                    Confirm Release
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* PRINT CONTROLLER OVERLAY & COMPANION WINDOW */}
      {printingRecord && (
        <div id="print-section" className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-start z-50 p-4 md:p-10 overflow-y-auto">
          {/* Direct page/screen specific styling */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media screen {
              #print-section {
                display: flex !important;
              }
            }
            @media print {
              html, body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
              }
              body * {
                visibility: hidden !important;
              }
              #print-section, #print-section * {
                visibility: visible !important;
              }
              #print-section {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 50px !important;
                background: #ffffff !important;
                padding: 40px 0 !important;
                margin: 0 !important;
                z-index: 9999999 !important;
                overflow: visible !important;
              }
              .print-card-box {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin-bottom: 30px !important;
                border: none !important;
                box-shadow: none !important;
              }
              .no-print {
                display: none !important;
              }
              /* Force background prints correctly */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
          `}} />

          {/* On-screen control panel UI (Hidden at print) */}
          <div className="no-print bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl flex flex-col md:flex-row gap-8 items-stretch mb-8 animate-scale-up">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 text-emerald-600 mb-4">
                  <Printer size={24} className="animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full text-emerald-700">Print Control Center</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase font-sans mb-3">
                  PWD Card Print Studio
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-6">
                  Ready to print PWD ID Card for <span className="font-bold text-slate-900 underline">{printingRecord.personal_information?.full_name || 'Citizen'}</span>. Below is a live preview of the generated front/back graphics.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                {isIframe ? (
                  <a
                    href={newTabUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2.5 transition-all text-center hover:opacity-95"
                  >
                    <ExternalLink size={16} />
                    Open in New Tab to Print
                  </a>
                ) : (
                  <button
                    onClick={() => window.print()}
                    className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2.5 transition-all text-center hover:opacity-95"
                  >
                    <Printer size={16} />
                    Trigger Print Settings
                  </button>
                )}
                <button
                  onClick={handleClosePrintStudio}
                  className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-center"
                >
                  ✕ Close Studio
                </button>
              </div>
            </div>

            {/* Print Biometrics Summary (Hidden in print) */}
            <div className="w-full md:w-80 bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">PWD Card Metadata</h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase leading-none mb-1">PWD Registration No.</span>
                    <span className="text-xs font-black text-slate-800 leading-normal font-mono">{printingRecord.personal_information?.pwd_number || 'STILL PENDING'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase leading-none mb-1">Registered Disability</span>
                    <span className="text-xs font-black text-slate-800 leading-normal uppercase">{printingRecord.personal_information?.disability_type || printingRecord.personal_information?.disability_types || 'ORTHOPEDIC'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold uppercase leading-none mb-1">Card Holder Address</span>
                    <span className="text-xs font-bold text-slate-800 leading-normal uppercase text-slate-700">{`${printingRecord.address?.house_street || ''} ${printingRecord.address?.barangay || ''}, San Juan City`.trim()}</span>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-200 text-center text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-6">
                San Juan City Government
              </div>
            </div>
          </div>

          {/* Actual Dual-sided printable card output (Formatted on screen, and optimized for printers) */}
          <div className="flex flex-col lg:flex-row print:flex-col items-center justify-center gap-6 md:gap-10 pb-16">
            <div className="print-card-box border border-slate-200 rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.01] bg-white">
              <IDCard 
                user={{
                  id: printingRecord.id?.toString() || 'PWD-ID',
                  role: Role.CITIZEN,
                  name: printingRecord.personal_information?.full_name || '',
                  firstName: printingRecord.personal_information?.first_name || '',
                  lastName: printingRecord.personal_information?.last_name || '',
                  middleName: printingRecord.personal_information?.middle_name || '',
                  suffix: printingRecord.personal_information?.suffix || '',
                  pwdIdNumber: printingRecord.personal_information?.pwd_number || '',
                  barangay: printingRecord.address?.barangay || '',
                  birthDate: printingRecord.personal_information?.date_of_birth || '',
                  gender: printingRecord.personal_information?.gender || '',
                  disabilityType: printingRecord.personal_information?.disability_type || printingRecord.personal_information?.disability_types || 'ORTHOPEDIC',
                  avatarUrl: safeParseAttachment(printingRecord.attachments?.photo_url || printingRecord.attachments?.photo) || undefined,
                  emergencyContactPerson: printingRecord.emergency_contact?.name || '',
                  emergencyContactNumber: printingRecord.emergency_contact?.number || '',
                  address: `${printingRecord.address?.house_street || ''} ${printingRecord.address?.barangay || ''}, San Juan City`.trim(),
                  bloodType: printingRecord.personal_information?.blood_type || printingRecord.bloodType || 'O+',
                  pwdIdIssueDate: printingRecord.issuance_details?.released_date || '',
                  pwdIdExpiryDate: printingRecord.issuance_details?.expiration_date || '',
                } as unknown as User} 
                side="front" 
              />
            </div>
            
            <div className="print-card-box border border-slate-200 rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.01] bg-white">
              <IDCard 
                user={{
                  id: printingRecord.id?.toString() || 'PWD-ID',
                  role: Role.CITIZEN,
                  name: printingRecord.personal_information?.full_name || '',
                  firstName: printingRecord.personal_information?.first_name || '',
                  lastName: printingRecord.personal_information?.last_name || '',
                  middleName: printingRecord.personal_information?.middle_name || '',
                  suffix: printingRecord.personal_information?.suffix || '',
                  pwdIdNumber: printingRecord.personal_information?.pwd_number || '',
                  barangay: printingRecord.address?.barangay || '',
                  birthDate: printingRecord.personal_information?.date_of_birth || '',
                  gender: printingRecord.personal_information?.gender || '',
                  disabilityType: printingRecord.personal_information?.disability_type || printingRecord.personal_information?.disability_types || 'ORTHOPEDIC',
                  avatarUrl: safeParseAttachment(printingRecord.attachments?.photo_url || printingRecord.attachments?.photo) || undefined,
                  emergencyContactPerson: printingRecord.emergency_contact?.name || '',
                  emergencyContactNumber: printingRecord.emergency_contact?.number || '',
                  address: `${printingRecord.address?.house_street || ''} ${printingRecord.address?.barangay || ''}, San Juan City`.trim(),
                  bloodType: printingRecord.personal_information?.blood_type || printingRecord.bloodType || 'O+',
                  pwdIdIssueDate: printingRecord.issuance_details?.released_date || '',
                  pwdIdExpiryDate: printingRecord.issuance_details?.expiration_date || '',
                } as unknown as User} 
                side="back" 
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
