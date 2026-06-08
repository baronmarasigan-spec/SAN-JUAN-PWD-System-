import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle, XCircle, HeartHandshake, Search, Banknote, 
  Clock, X, Trash2, MapPin, Globe, Sparkles, AlertCircle, ChevronRight, Activity, Award
} from 'lucide-react';

export const AdminBenefits: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { 
    masterlistRecords, 
    setMasterlistRecords,
    fetchMasterlist 
  } = useApp();

  // Current selected benefit type under the Management sub menu
  const [selectedBenefit, setSelectedBenefit] = useState<string | null>('cash-grant');

  // Search query states
  const [mgmtSearch, setMgmtSearch] = useState('');
  const [walkinSearch, setWalkinSearch] = useState('');

  // Bulk and confirmation selection states for Applicants
  const [selectedApplicantIds, setSelectedApplicantIds] = useState<string[]>([]);
  const [confirmingApplicants, setConfirmingApplicants] = useState<any[] | null>(null);
  const [isProcessingEligible, setIsProcessingEligible] = useState<boolean>(false);

  // Year selection for Walk-In
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [pendingYear, setPendingYear] = useState<string | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Alerts & Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // API loading & local cache states
  const [apiGrants, setApiGrants] = useState<any[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Local additions state (stored in localStorage)
  const [localGrants, setLocalGrants] = useState<any[]>(() => {
    const saved = localStorage.getItem('pdao_cash_grants_custom_benefits');
    return saved ? JSON.parse(saved) : [];
  });

  // Pull latest masterlist records on component mount
  useEffect(() => {
    if (fetchMasterlist) {
      fetchMasterlist();
    }
  }, [fetchMasterlist]);

  // API integration: load real data from the Phoenix endpoint via GET
  const fetchApiCashGrants = useCallback(async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 129|uZbZBTDOdMtTVKapzcnrzlhrUfskUlzdGozLUZKV86fdc46c'
      };
      
      // Standard fetch with sanctum auth token
      let response = await fetch('https://api-dbpwd.phoenix.com.ph/api/cash-grant-flow', {
        method: 'GET',
        headers
      });
      
      // Fallback try in case direct composite query path is utilized
      if (!response.ok) {
        response = await fetch('https://api-dbpwd.phoenix.com.ph/api/cash-grant-flow129|uZbZBTDOdMtTVKapzcnrzlhrUfskUlzdGozLUZKV86fdc46c', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      }

      if (response.ok) {
        const json = await response.json();
        // Parse results arrays
        const records = json.data || json || [];
        if (Array.isArray(records)) {
          setApiGrants(records);
        } else if (records && typeof records === 'object' && Array.isArray(records.data)) {
          setApiGrants(records.data);
        }
      } else {
        throw new Error(`Endpoint returned status ${response.status}`);
      }
    } catch (err: any) {
      console.warn("Could not load from outer network endpoint:", err);
      setApiError(err.message || "Failed dynamic sync.");
    } finally {
      setApiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiCashGrants();
  }, [fetchApiCashGrants]);

  // Clear checkboxes on selected year or query change
  useEffect(() => {
    setSelectedApplicantIds([]);
  }, [selectedYear, walkinSearch]);

  // Combined API records with vital status from masterlistv2
  const combinedGrants = useMemo(() => {
    // Mapping of dynamic fields from API output
    return apiGrants.map((g: any, index: number) => {
      const uId = g.user_id ? String(g.user_id) : '';
      const pwdNum = g.pwd_number || '';
      const firstName = g.first_name || '';
      const lastName = g.last_name || '';

      // Find matching masterlist record to sync vital status (vital_status always reflects masterlistv2.vital_status)
      const match = masterlistRecords.find((m: any) => {
        const mId = m.id ? String(m.id) : '';
        const mPwd = (m.pwdIdNumber || '').toString().toLowerCase().trim();
        const mFirst = (m.firstName || '').toString().toLowerCase().trim();
        const mLast = (m.lastName || '').toString().toLowerCase().trim();

        const matchesId = uId && (uId === mId || uId === mPwd);
        const matchesPwd = pwdNum && pwdNum.toLowerCase().trim() === mPwd;
        const matchesName = (firstName && lastName) && (firstName.toLowerCase().trim() === mFirst && lastName.toLowerCase().trim() === mLast);

        return matchesId || matchesPwd || matchesName;
      });

      const currentVitalStatus = match ? (match.status || 'Active') : (g.vital_status || 'Active');

      return {
        id: g.id ? String(g.id) : `api_cg_${index}`,
        user_id: uId,
        pwd_number: pwdNum,
        last_name: lastName,
        first_name: firstName,
        middle_name: g.middle_name || '',
        date_of_birth: g.date_of_birth || '',
        gender: g.gender || '',
        vital_status: currentVitalStatus,
        created_at: g.created_at || g.date_granted || '',
        year: g.year || '2026',
        distribution_status: g.distribution_status || 'Pending',
        updated_at: g.updated_at || ''
      };
    });
  }, [apiGrants, masterlistRecords]);

  // Update distribution status with standard PUT and POST spoof fallback
  const handleUpdateDistributionStatus = async (id: string, newStatus: string) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    const cleanId = String(id).replace('api_cg_', '');
    try {
      const token = localStorage.getItem('pdao_auth_token') || '129|uZbZBTDOdMtTVKapzcnrzlhrUfskUlzdGozLUZKV86fdc46c';
      const headers: any = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        distribution_status: newStatus
      };

      let response = await fetch(`https://api-dbpwd.phoenix.com.ph/api/cash-grant-flow/${cleanId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn("Direct PUT with JSON payload failed, falling back to POST with FormData spoof method...");
        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('distribution_status', newStatus);

        response = await fetch(`https://api-dbpwd.phoenix.com.ph/api/cash-grant-flow/${cleanId}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: formData
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to update status with HTTP status code ${response.status}`);
      }

      setSuccessMsg(`Distribution status successfully modified to: ${newStatus}`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchApiCashGrants();
    } catch (err: any) {
      console.error("Error setting distribution status:", err);
      setErrorMsg(`Error updating distribution status: ${err.message || err}`);
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleResetClick = () => {
    setShowResetConfirmModal(true);
  };

  const handleCancelReset = () => {
    setShowResetConfirmModal(false);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('pdao_auth_token') || '129|uZbZBTDOdMtTVKapzcnrzlhrUfskUlzdGozLUZKV86fdc46c';
      const headers: any = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('https://api-dbpwd.drchiocms.com/api/masterlistv2/reset-grants', {
        method: 'POST',
        headers
      });

      if (!res.ok) {
        throw new Error(`Masterlist reset failed with status code ${res.status}`);
      }

      console.log("Successfully reset masterlistv2 grants");

      if (setMasterlistRecords) {
        setMasterlistRecords((prev: any[]) => {
          return prev.map(m => ({
            ...m,
            _raw: m._raw ? {
              ...m._raw,
              cash_grant_status: null,
              year: null
            } : m._raw,
            cash_grant_status: null,
            year: null
          }));
        });
      }

      if (fetchMasterlist) {
        await fetchMasterlist();
      }

      setSuccessMsg(`Cash grant program references have been successfully reverted to null.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Error resetting masterlist grants:", err);
      setErrorMsg(`Failed to reset masterlist: ${err.message || err}`);
      setTimeout(() => setErrorMsg(null), 6000);
    } finally {
      setIsResetting(false);
      setShowResetConfirmModal(false);
    }
  };

  // Remove cash grant entry
  const handleRemoveGrantByRef = (id: string, name: string) => {
    const nextLocal = localGrants.filter(g => g.id !== id);
    setLocalGrants(nextLocal);
    localStorage.setItem('pdao_cash_grants_custom_benefits', JSON.stringify(nextLocal));

    // Filter memory cache too
    setApiGrants(prev => prev.filter(g => String(g.id) !== String(id)));

    setSuccessMsg(`Successfully removed cash grant for ${name}.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Click Eligible or Bulk Mark -> Add to cash grant flow list with autopopulating fields & year selection mapping
  const handleProcessEligibility = async (citizens: any[]) => {
    setIsProcessingEligible(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setConfirmingApplicants(null);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const token = localStorage.getItem('pdao_auth_token') || '129|uZbZBTDOdMtTVKapzcnrzlhrUfskUlzdGozLUZKV86fdc46c';
    const headers: any = {
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Capture IDs of successfully processed to update local state immediately
    const processedIds: string[] = [];

    for (const citizen of citizens) {
      const cleanId = String(citizen.id).replace('api_', '');
      try {
        // Step 1: Update cash_grant_status and year to Eligible in masterlistv2
        const masterlistFormData = new FormData();
        masterlistFormData.append('_method', 'PUT');
        masterlistFormData.append('cash_grant_status', 'Eligible');
        masterlistFormData.append('year', selectedYear);

        let masterlistRes = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${cleanId}`, {
          method: 'POST',
          headers,
          body: masterlistFormData
        });

        if (!masterlistRes.ok) {
          masterlistRes = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${cleanId}`, {
            method: 'PUT',
            headers,
            body: masterlistFormData
          });
        }

        if (!masterlistRes.ok) {
          throw new Error(`Masterlist update failed with status ${masterlistRes.status}`);
        }

        console.log(`Successfully synced masterlistv2 ID ${cleanId}: cash_grant_status = Eligible, year = ${selectedYear}`);
        processedIds.push(String(citizen.id));

        // Step 2: Fetch and extract latest values from masterlistv2 item dynamically
        let latestRaw = citizen._raw || {};
        try {
          const getRes = await fetch(`https://api-dbpwd.drchiocms.com/api/masterlistv2/${cleanId}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          if (getRes.ok) {
            const getJson = await getRes.json();
            if (getJson && getJson.data) {
              latestRaw = getJson.data;
            } else if (getJson) {
              latestRaw = getJson;
            }
          }
        } catch (getErr) {
          console.warn("Could not fetch individual masterlistv2 record, falling back to cached citizen state:", getErr);
        }

        const rawPersonal = latestRaw.personal_information || {};
        const rawApp = latestRaw.application_details || {};
        const rawGov = latestRaw.government_ids || {};
        const rawStatus = latestRaw.status_and_metadata || {};

        const userIdVal = String(latestRaw.user_id || latestRaw.id || citizen._raw?.user_id || citizen._raw?.id || citizen.id || '').replace('api_', '');
        const pwdNumberVal = latestRaw.pwd_number || latestRaw.pwd_id_number || rawApp.control_number || rawGov.psn_no || citizen.pwdIdNumber || citizen._raw?.pwd_id_number || citizen._raw?.pwdIdNumber || citizen._raw?.pwd_number || citizen._raw?.control_number || '';
        const lastNameVal = rawPersonal.last_name || latestRaw.last_name || citizen.lastName || citizen._raw?.personal_information?.last_name || citizen._raw?.last_name || '';
        const firstNameVal = rawPersonal.first_name || latestRaw.first_name || citizen.firstName || citizen._raw?.personal_information?.first_name || citizen._raw?.first_name || '';
        const middleNameVal = rawPersonal.middle_name || latestRaw.middle_name || citizen.middleName || citizen._raw?.personal_information?.middle_name || citizen._raw?.middle_name || '';
        const dateOfBirthVal = rawPersonal.date_of_birth || latestRaw.date_of_birth || citizen.birthDate || citizen._raw?.personal_information?.date_of_birth || citizen._raw?.date_of_birth || '';
        const genderVal = rawPersonal.gender || latestRaw.gender || citizen.gender || citizen._raw?.personal_information?.gender || citizen._raw?.gender || '';
        const vitalStatusVal = rawStatus.vital_status || latestRaw.vital_status || citizen.status || citizen._raw?.status_and_metadata?.vital_status || citizen._raw?.vital_status || 'Active';

        // Step 3: Insert a new row into cash_grant_flow using POST request
        const cashGrantFormData = new FormData();
        cashGrantFormData.append('user_id', userIdVal);
        cashGrantFormData.append('pwd_number', pwdNumberVal);
        cashGrantFormData.append('last_name', lastNameVal);
        cashGrantFormData.append('first_name', firstNameVal);
        cashGrantFormData.append('middle_name', middleNameVal);
        cashGrantFormData.append('date_of_birth', dateOfBirthVal);
        cashGrantFormData.append('gender', genderVal);
        cashGrantFormData.append('year', selectedYear);
        cashGrantFormData.append('vital_status', vitalStatusVal);
        cashGrantFormData.append('distribution_status', 'Pending');

        const cashGrantPayload = {
          user_id: userIdVal,
          pwd_number: pwdNumberVal,
          last_name: lastNameVal,
          first_name: firstNameVal,
          middle_name: middleNameVal,
          date_of_birth: dateOfBirthVal,
          gender: genderVal,
          year: selectedYear,
          vital_status: vitalStatusVal,
          distribution_status: 'Pending'
        };

        let flowRes = await fetch('https://api-dbpwd.phoenix.com.ph/api/cash-grant-flow', {
          method: 'POST',
          headers,
          body: cashGrantFormData
        });

        if (!flowRes.ok) {
          flowRes = await fetch('https://api-dbpwd.phoenix.com.ph/api/cash-grant-flow', {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(cashGrantPayload)
          });
        }

        if (!flowRes.ok) {
          throw new Error(`Cash grant flow insertion failed with status ${flowRes.status}`);
        }

        successCount++;
      } catch (err: any) {
        console.error("Error processing offline eligibility:", err);
        failCount++;
        errors.push(`${citizen.fullName || (citizen.firstName + ' ' + citizen.lastName) || citizen.id}: ${err.message || err}`);
      }
    }

    // Optimistically update masterlistRecords state locally for seamless instant update
    if (processedIds.length > 0 && setMasterlistRecords) {
      setMasterlistRecords((prev: any[]) => {
        return prev.map(m => {
          if (processedIds.includes(String(m.id))) {
            return {
              ...m,
              cash_grant_status: 'Eligible',
              year: selectedYear
            };
          }
          return m;
        });
      });
    }

    // Refresh listings
    if (fetchMasterlist) {
      fetchMasterlist();
    }
    fetchApiCashGrants();
    setSelectedApplicantIds([]);

    if (successCount > 0) {
      setSuccessMsg(`Successfully granted eligibility to ${successCount} applicant(s) for Year ${selectedYear}!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    }

    if (failCount > 0) {
      setErrorMsg(`Failed to process ${failCount} applicant(s). Errors: ${errors.join(', ')}`);
      setTimeout(() => setErrorMsg(null), 7000);
    }

    setIsProcessingEligible(false);
  };

  // Walk-in Candidates: released PWD entries without active grants in the selected year
  const walkinCandidates = useMemo(() => {
    return (masterlistRecords || []).filter(m => {
      // 1. Must be released ID status
      const rawDetails = m.application_details || m._raw?.application_details || {};
      const idStatus = String(
        rawDetails.id_status || 
        m.id_status || 
        m._raw?.id_status || 
        m._raw?.idStatus || 
        m.idStatus || 
        ''
      ).toLowerCase().trim();
      if (idStatus !== 'released') return false;

      // 2. Must not exist in cash grant table in the same selected year
      const mPwdNum = String(m.pwdIdNumber || m.id || '').toLowerCase().trim();

      const exists = combinedGrants.some(cg => {
        // Must match same year selection
        const matchesYear = String(cg.year) === String(selectedYear);
        if (!matchesYear) return false;

        const cgPwd = String(cg.pwd_number || '').toLowerCase().trim();
        const cgFirst = String(cg.first_name || '').toLowerCase().trim();
        const cgLast = String(cg.last_name || '').toLowerCase().trim();

        const matchPwd = mPwdNum && mPwdNum === cgPwd;
        const matchName = m.firstName && cgFirst === m.firstName.toLowerCase() && m.lastName && cgLast === m.lastName.toLowerCase();

        return matchPwd || matchName;
      });

      return !exists;
    });
  }, [masterlistRecords, combinedGrants, selectedYear]);

  // Search filter operations for Cash Grant Table
  const filteredCombinedGrants = useMemo(() => {
    return combinedGrants.filter(cg => {
      const q = mgmtSearch.toLowerCase();
      const pwd = (cg.pwd_number || '').toLowerCase();
      const fn = (cg.first_name || '').toLowerCase();
      const mn = (cg.middle_name || '').toLowerCase();
      const ln = (cg.last_name || '').toLowerCase();
      const uid = (cg.user_id || '').toLowerCase();
      return (
        pwd.includes(q) ||
        fn.includes(q) ||
        mn.includes(q) ||
        ln.includes(q) ||
        uid.includes(q)
      );
    });
  }, [combinedGrants, mgmtSearch]);

  const filteredWalkinCandidates = useMemo(() => {
    return walkinCandidates.filter(c => {
      const q = walkinSearch.toLowerCase();
      const pwd = String(c.pwdIdNumber || '').toLowerCase();
      const fn = String(c.firstName || '').toLowerCase();
      const ln = String(c.lastName || '').toLowerCase();
      const name = String(c.fullName || c.name || '').toLowerCase();
      const bgy = String(c.barangay || '').toLowerCase();
      return pwd.includes(q) || name.includes(q) || fn.includes(q) || ln.includes(q) || bgy.includes(q);
    });
  }, [walkinCandidates, walkinSearch]);

  const handleToggleSelectAll = () => {
    const isAllSelected = filteredWalkinCandidates.length > 0 && selectedApplicantIds.length === filteredWalkinCandidates.length;
    if (isAllSelected) {
      setSelectedApplicantIds([]);
    } else {
      setSelectedApplicantIds(filteredWalkinCandidates.map(c => String(c.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedApplicantIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-[#1e419c] bg-[#1e419c]/10 px-3 py-1.5 rounded-full uppercase tracking-widest block w-fit mb-2">
            PDAO Benefits System
          </span>
          <h1 className="text-[32px] font-bold text-slate-800 tracking-tight">
            {tab === 'walk-in' ? 'Applicant Eligibility' : 'Benefits Management'}
          </h1>
          <p className="text-slate-500 font-medium">
            Manage allocations, benefits disbursement, and offline applicant eligibility loops.
          </p>
        </div>
        
        {/* Navigation Switch Tabs internally */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button 
            onClick={() => navigate('/admin/benefits/management')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
              tab !== 'walk-in' 
                ? 'bg-[#1e419c] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Management
          </button>
          <button 
            onClick={() => navigate('/admin/benefits/walk-in')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
              tab === 'walk-in' 
                ? 'bg-[#1e419c] text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Applicant Table
          </button>
        </div>
      </header>

      {/* Dynamic Success alerts */}
      {successMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-500/20 text-emerald-800 rounded-3xl p-5 flex items-center gap-3 shadow-lg shadow-emerald-500/5 transition-all mb-4">
          <CheckCircle size={20} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-wider">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border-2 border-rose-500/20 text-rose-800 rounded-3xl p-5 flex items-center gap-3 shadow-lg shadow-rose-500/5 transition-all mb-4">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-wider">{errorMsg}</p>
        </div>
      )}

      {/* VIEW: Management Tab */}
      {tab !== 'walk-in' && (
        <div className="space-y-6">
          {/* TABLE - Cash Grant Flow */}
          {selectedBenefit === 'cash-grant' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-slide-up">
              <div className="bg-gradient-to-r from-[#1e419c]/5 to-transparent p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-xl tracking-tight uppercase">Cash Grant Flow Benefits</h3>
                  <p className="text-xs text-slate-500 font-medium">Synchronized with remote database registry</p>
                </div>
                <div className="relative w-full max-w-md">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name, PWD ID or User ID..."
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e419c]/10 focus:border-[#1e419c] transition-all font-bold uppercase tracking-wider text-slate-700"
                    value={mgmtSearch}
                    onChange={e => setMgmtSearch(e.target.value)}
                  />
                </div>
              </div>               <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#1e419c] text-white text-[10px] font-bold uppercase tracking-[0.2em] border-b border-blue-900/10">
                      <th className="p-4">PWD Number</th>
                      <th className="p-4">Fullname</th>
                      <th className="p-4">Gender</th>
                      <th className="p-4">Vital Status</th>
                      <th className="p-4">Date Granted</th>
                      <th className="p-4">Distribution Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apiLoading ? (
                      <tr>
                        <td colSpan={7} className="p-20 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#1e419c] animate-spin"></div>
                            <span className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Loading cash grant records...</span>
                          </div>
                        </td>
                      </tr>
                    ) : apiError ? (
                      <tr>
                        <td colSpan={7} className="p-20 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 text-red-500">
                            <AlertCircle size={32} />
                            <span className="font-bold uppercase tracking-widest text-xs">Error Loading Records</span>
                            <p className="text-xs text-slate-400 font-semibold">{apiError}</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredCombinedGrants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                          No cash grant records located
                        </td>
                      </tr>
                    ) : (
                      filteredCombinedGrants.map((cg) => {
                        const isDeceased = String(cg.vital_status).toLowerCase() === 'deceased';
                        
                        // Parse or fallback display for created_at Date Granted
                        let dateGrantedStr = cg.created_at || '---';
                        if (dateGrantedStr.includes('T')) {
                          dateGrantedStr = dateGrantedStr.split('T')[0];
                        } else if (dateGrantedStr.includes(' ')) {
                          dateGrantedStr = dateGrantedStr.split(' ')[0];
                        }

                        let updatedAtStr = cg.updated_at || '';
                        if (updatedAtStr) {
                          if (updatedAtStr.includes('T')) {
                            updatedAtStr = updatedAtStr.split('T')[0];
                          } else if (updatedAtStr.includes(' ')) {
                            updatedAtStr = updatedAtStr.split(' ')[0];
                          }
                        }

                        // Merge last name, first name, middle name
                        const fullNameStr = [
                          cg.last_name || '',
                          [cg.first_name || '', cg.middle_name || ''].filter(Boolean).join(' ')
                        ].filter(Boolean).join(', ').trim().toUpperCase() || '---';

                        return (
                          <tr key={cg.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4 font-mono font-extrabold text-[#1e419c] text-xs">
                              {cg.pwd_number || '---'}
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-slate-800 text-xs uppercase block">
                                {fullNameStr}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-600 font-bold uppercase">
                              {cg.gender || '---'}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[8px] font-extrabold uppercase tracking-wide border ${
                                isDeceased
                                  ? 'bg-red-50 text-red-600 border-red-100'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                <Clock size={8} /> {cg.vital_status}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-xs text-slate-500">
                              {dateGrantedStr}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded text-[9px] font-extrabold uppercase tracking-wide border ${
                                  cg.distribution_status === 'Claimed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : cg.distribution_status === 'Unclaimed'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                  {cg.distribution_status || 'Pending'}
                                </span>
                                {updatedAtStr && (
                                  <span className="text-[10px] text-slate-400 font-bold tracking-tight block">
                                    {updatedAtStr}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2 text-right">
                                <button 
                                  id={`btn_unclaimed_${cg.id}`}
                                  onClick={() => handleUpdateDistributionStatus(cg.id, 'Unclaimed')}
                                  className={`px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                                    cg.distribution_status === 'Unclaimed'
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm cursor-default'
                                      : 'border-slate-200 text-slate-600 bg-white hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                                  }`}
                                  disabled={cg.distribution_status === 'Unclaimed'}
                                >
                                  Unclaimed
                                </button>
                                <button 
                                  id={`btn_claimed_${cg.id}`}
                                  onClick={() => handleUpdateDistributionStatus(cg.id, 'Claimed')}
                                  className={`px-3 py-1.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                                    cg.distribution_status === 'Claimed'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm cursor-default'
                                      : 'border-slate-200 text-slate-600 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                                  }`}
                                  disabled={cg.distribution_status === 'Claimed'}
                                >
                                  Claimed
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: Walk-in Tab */}
      {tab === 'walk-in' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-slide-up">
            <div className="bg-gradient-to-r from-purple-500/5 to-transparent p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-xl tracking-tight uppercase flex items-center gap-2">
                  <MapPin size={20} className="text-purple-600" /> Offline Applicant Selector
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Showing released PWD entries without active grants. Check items for bulk eligibility allocation.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
                {/* Bulk Process Button is rendered if selections exist */}
                {selectedApplicantIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetCitizens = filteredWalkinCandidates.filter(c => selectedApplicantIds.includes(String(c.id)));
                      setConfirmingApplicants(targetCitizens);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 justify-center active:scale-95 duration-100 shadow-md animate-pulse"
                  >
                    <CheckCircle size={14} /> Process Eligible ({selectedApplicantIds.length})
                  </button>
                )}

                {/* Year Dropdown */}
                <div className="relative shrink-0 flex items-center gap-2">
                  <label htmlFor="walkin_year_select" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Year:</label>
                  <select
                    id="walkin_year_select"
                    className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition-all cursor-pointer"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    required
                  >
                    {Array.from({ length: 25 }, (_, i) => String(2026 + i)).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search input */}
                <div className="relative w-full sm:max-w-xs md:max-w-md">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search applicant name, PWD number..."
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-bold uppercase tracking-wider text-slate-700"
                    value={walkinSearch}
                    onChange={e => setWalkinSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#1e419c] text-white text-[10px] font-bold uppercase tracking-[0.2em] border-b border-purple-900/10">
                    <th className="p-6 w-12 text-center">
                      <input 
                        type="checkbox"
                        className="rounded border-slate-300 text-pdao_red focus:ring--pdao_red h-4 w-4 cursor-pointer"
                        checked={filteredWalkinCandidates.length > 0 && selectedApplicantIds.length === filteredWalkinCandidates.length}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th className="p-6">PWD Number</th>
                    <th className="p-6">Full Name</th>
                    <th className="p-6">Barangay</th>
                    <th className="p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWalkinCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                        No released candidates awaiting grant assignment
                      </td>
                    </tr>
                  ) : (
                    filteredWalkinCandidates.map((citizen) => {
                      const isSelected = selectedApplicantIds.includes(String(citizen.id));
                      return (
                        <tr key={citizen.id} className={`transition-colors duration-100 ${isSelected ? 'bg-purple-50/40' : 'hover:bg-slate-50/70'}`}>
                          <td className="p-6 text-center">
                            <input 
                              type="checkbox"
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(String(citizen.id))}
                            />
                          </td>
                          <td className="p-6 font-mono font-extrabold text-slate-700 text-xs">
                            {citizen.pwdIdNumber || '---'}
                          </td>
                          <td className="p-6">
                            <span className="font-bold text-slate-800 text-sm uppercase tracking-tight block">
                              {citizen.fullName || citizen.name}
                            </span>
                            <span className="text-[9px] text-[#1e419c] font-mono uppercase tracking-widest mt-0.5 block">
                              Status: ID Released
                            </span>
                          </td>
                          <td className="p-6 text-xs text-slate-600 font-bold uppercase tracking-wide">
                            {citizen.barangay || '---'}
                          </td>
                          <td className="p-6 text-right">
                            <button 
                              id={`mark_eligible_${citizen.id}`}
                              onClick={() => setConfirmingApplicants([citizen])}
                              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 duration-100 flex items-center gap-1.5 ml-auto"
                            >
                              <CheckCircle size={12} /> Eligible
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for resetting/changing year */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl border border-slate-100 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0 animate-pulse">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-[#1e419c] uppercase tracking-tight">
                  Reset Cash Grant
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed font-semibold">
                  do you want to change a year? all list in masterlist will be revert
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                onClick={handleCancelReset}
                disabled={isResetting}
              >
                No, Keep Current
              </button>
              <button
                type="button"
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                onClick={handleConfirmReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Reverting...
                  </>
                ) : (
                  'Yes, Revert'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for granting eligibility */}
      {confirmingApplicants && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl border border-slate-100 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                <CheckCircle size={28} />
              </div>
              <div className="space-y-2 w-full">
                <h3 className="text-lg font-extrabold text-[#1e419c] uppercase tracking-tight">
                  Confirm Cash Grant Eligibility
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed font-semibold">
                  Are you sure you want to grant cash benefit eligibility to the selected applicant(s) for the Year <span className="text-[#1e419c] font-black">{selectedYear}</span>?
                </p>
                <div className="bg-slate-50 rounded-2xl p-4 max-h-40 overflow-y-auto border border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-700 divide-y divide-slate-100 mt-2">
                  <p className="pb-2 text-slate-400 font-black text-[9px] tracking-widest border-b border-slate-200">Selected ({confirmingApplicants.length}):</p>
                  {confirmingApplicants.map((c) => (
                    <div key={c.id} className="py-2 flex justify-between items-center text-[11px]">
                      <span>{c.fullName || c.name || (c.firstName + ' ' + c.lastName)}</span>
                      <span className="font-mono text-[10px] text-slate-400">{c.pwdIdNumber || '---'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                onClick={() => setConfirmingApplicants(null)}
                disabled={isProcessingEligible}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                onClick={() => handleProcessEligibility(confirmingApplicants)}
                disabled={isProcessingEligible}
              >
                {isProcessingEligible ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Yes, Proceed'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
