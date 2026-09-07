'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  UserCheck, 
  Upload, 
  Edit, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  AlertTriangle, 
  RefreshCw,
  Award,
  Crop
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ImageCropperModal } from '@/components/ui/ImageCropperModal';

interface TeamMember {
  id: number;
  name: string;
  role: string | null;
  image_path: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export default function TeamPage() {
  const { session } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [rawCropFile, setRawCropFile] = useState<File | string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:8001/api/v1');

  // Generate preview for selectedFile and ensure proper cleanup
  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  // Load team
  const fetchMembers = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/team`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      } else {
        setError('Failed to fetch clinic staff directory.');
      }
    } catch (err) {
      setError('Network error: Unable to reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [session]);

  // Intercept file selection and open cropper (max 10MB)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setFormError('File size exceeds 10MB. Please select an image under 10MB.');
        e.target.value = '';
        return;
      }
      setFormError(null);
      setRawCropFile(file);
      setIsCropperOpen(true);
      // Reset input value to allow re-selection of the same file
      e.target.value = '';
    }
  };

  const handleTriggerRecrop = (source: File | string) => {
    if (!source) return;
    setRawCropFile(source);
    setIsCropperOpen(true);
  };

  const handleCropComplete = (croppedFile: File) => {
    setSelectedFile(croppedFile);
    setIsCropperOpen(false);
    setRawCropFile(null);
  };

  const handleCropperClose = () => {
    setIsCropperOpen(false);
    setRawCropFile(null);
  };

  // Add Member
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!name.trim()) {
      setFormError('Please input the practitioner name.');
      return;
    }
    if (!role.trim()) {
      setFormError('Please input the practitioner designation/role.');
      return;
    }
    if (!selectedFile) {
      setFormError('Please select a profile photo for the practitioner.');
      return;
    }

    setActionLoading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('role', role);
    formData.append('display_order', displayOrder.toString());
    formData.append('is_active', isActive.toString());
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${apiUrl}/team`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setIsAddOpen(false);
        setName('');
        setRole('');
        setDisplayOrder(0);
        setIsActive(true);
        setSelectedFile(null);
        fetchMembers();
      } else {
        const errData = await response.json();
        setFormError(errData.detail || 'Failed to create team member.');
      }
    } catch (err) {
      setFormError('Network error: Failed to save record.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Member
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !editMember) return;
    if (!name.trim()) {
      setFormError('Name cannot be empty.');
      return;
    }
    if (!role.trim()) {
      setFormError('Role cannot be empty.');
      return;
    }

    setActionLoading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('role', role);
    formData.append('display_order', displayOrder.toString());
    formData.append('is_active', isActive.toString());
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const response = await fetch(`${apiUrl}/team/${editMember.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setIsEditOpen(false);
        setEditMember(null);
        setSelectedFile(null);
        fetchMembers();
      } else {
        const errData = await response.json();
        setFormError(errData.detail || 'Failed to update team member.');
      }
    } catch (err) {
      setFormError('Network error: Failed to update record.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Member
  const handleDeleteSubmit = async () => {
    if (!session || !editMember) return;

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/team/${editMember.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setIsDeleteOpen(false);
        setEditMember(null);
        fetchMembers();
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Failed to delete team member.');
        setIsDeleteOpen(false);
      }
    } catch (err) {
      setError('Network error: Failed to delete record.');
      setIsDeleteOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle drag-and-drop reordering
  const handleReorder = async (newMembers: TeamMember[]) => {
    const reorderedWithOrder = newMembers.map((member, index) => ({
      ...member,
      display_order: index,
    }));
    setMembers(reorderedWithOrder);

    if (!session) return;

    try {
      const payload = reorderedWithOrder.map((member) => ({
        id: member.id,
        display_order: member.display_order,
      }));

      const res = await fetch(`${apiUrl}/team/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Fallback: update sequentially
        await Promise.all(
          reorderedWithOrder.map((member) => {
            const fd = new FormData();
            fd.append('display_order', member.display_order.toString());
            return fetch(`${apiUrl}/team/${member.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: fd,
            });
          })
        );
      }
    } catch (err) {
      console.error('Failed to update team reorder:', err);
    }
  };

  const openAddModal = () => {
    setName('');
    setRole('');
    setDisplayOrder(members.length);
    setIsActive(true);
    setSelectedFile(null);
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditMember(member);
    setName(member.name);
    setRole(member.role || '');
    setDisplayOrder(member.display_order);
    setIsActive(member.is_active);
    setSelectedFile(null);
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (member: TeamMember) => {
    setEditMember(member);
    setIsDeleteOpen(true);
  };

  const columns: Column<TeamMember>[] = [
    {
      header: 'Position',
      className: 'w-[10%] text-center px-1.5',
      accessor: (row) => (
        <div className="flex items-center justify-center">
          <Badge variant="info" className="font-mono text-xs">
            #{row.display_order + 1}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Avatar',
      className: 'w-[12%] text-center px-1.5',
      accessor: (row) => (
        <div className="flex items-center justify-center">
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
            <img 
              src={row.image_path} 
              alt={row.name} 
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Staff Name',
      className: 'w-[23%]',
      headerClassName: 'text-center px-1.5',
      cellClassName: 'text-left pl-6 pr-2',
      accessor: (row) => (
        <span className="font-semibold text-slate-800 dark:text-slate-100 block text-left break-words leading-tight">{row.name}</span>
      ),
    },
    {
      header: 'Designation / Role',
      className: 'w-[23%] text-center px-1.5',
      accessor: (row) => (
        <span className="text-slate-600 dark:text-slate-350 font-medium inline-flex items-center justify-center gap-1.5 break-words max-w-full leading-tight text-xs sm:text-sm">
          <Award className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="break-words">{row.role || 'Practitioner'}</span>
        </span>
      ),
    },
    {
      header: 'Status',
      className: 'w-[14%] text-center px-1.5',
      accessor: (row) => (
        <div className="flex items-center justify-center gap-1">
          {row.is_active ? (
            <Badge variant="success" className="gap-1 text-xs">
              <Eye className="w-3 h-3" /> Active
            </Badge>
          ) : (
            <Badge variant="danger" className="gap-1 text-xs">
              <EyeOff className="w-3 h-3" /> Hidden
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'w-[18%] text-center pl-2 pr-6 whitespace-nowrap',
      accessor: (row) => (
        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap pr-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => openEditModal(row)}
            className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
          >
            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => openDeleteModal(row)}
            className="h-7 px-2 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-100 dark:border-rose-950 hover:border-rose-200 dark:hover:border-rose-900 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Physician & Clinic Staff Directory" 
        description="Organize public doctor profiles, specialties, biographies, and homepage display sequences."
        actions={
          <Button onClick={openAddModal} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Add Staff Member
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-sm font-medium">{error}</div>
          <Button variant="outline" size="sm" onClick={fetchMembers} className="ml-auto bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading Staff Members..." />
      ) : members.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-12">
            <EmptyState 
              icon={UserCheck}
              title="No Staff Members Found"
              description="Register physiotherapy doctors, clinicians, receptionist and leadership personnel to populate the homepage roster."
              actionText="Add First Practitioner"
              onAction={openAddModal}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <DataTable 
            data={members} 
            columns={columns} 
            keyExtractor={(row) => row.id.toString()}
            isDraggable={true}
            onReorder={handleReorder}
            containerClassName="overflow-hidden"
            tableClassName="w-full table-fixed max-w-full"
          />
        </div>
      )}

      {/* --- ADD MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Add Practitioner Profile</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
                  <Input 
                    placeholder="e.g. Dr. Jane Doe (PT)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Designation / Role</label>
                  <Input 
                    placeholder="e.g. LEAD PHYSIOTHERAPIST"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profile Photo</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 flex flex-col items-center justify-center gap-2 shadow-xs"
                  >
                    <Upload className="w-6 h-6 text-slate-400 dark:text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {selectedFile ? selectedFile.name : 'Upload Profile Picture'}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-400">Supports JPG, PNG, WEBP, GIF (Max 10MB)</span>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status & Visibility</label>
                  <div className="flex items-center justify-between h-10 border border-slate-200 dark:border-slate-800 rounded-lg px-3 bg-white dark:bg-slate-950">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-300 font-medium">
                      <input 
                        type="checkbox" 
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 w-4 h-4"
                      />
                      Active staff member
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Auto-placed at #{members.length + 1}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">You can drag and drop rows in the table anytime to customize doctor listing order.</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Add Practitioner'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditOpen && editMember && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Edit Staff Profile</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-655 dark:text-slate-500 dark:hover:text-slate-355 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Staff Avatar {selectedFile && <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">(Cropped Staged)</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTriggerRecrop(selectedFile || editMember.image_path)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Re-crop Avatar</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => handleTriggerRecrop(selectedFile || editMember.image_path)}
                      className="group relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-sky-400 dark:hover:border-sky-500 shadow-xs transition-colors"
                    >
                      <img 
                        src={selectedFilePreview || editMember.image_path} 
                        className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-110" 
                        alt="Current Avatar" 
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Crop className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div 
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 rounded-xl p-3 text-center cursor-pointer transition-colors bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Upload className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {selectedFile ? selectedFile.name : 'Upload New Photo'}
                        </span>
                      </div>
                      <input 
                        type="file" 
                        ref={editFileInputRef} 
                        onChange={handleFileChange}
                        className="hidden" 
                        accept="image/*"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Full Name</label>
                  <Input 
                    placeholder="e.g. Dr. Jane Doe (PT)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Designation / Role</label>
                  <Input 
                    placeholder="e.g. LEAD PHYSIOTHERAPIST"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Visibility Status</label>
                  <div className="flex items-center justify-between h-10 border border-slate-200 dark:border-slate-800 rounded-lg px-3 bg-white dark:bg-slate-950">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-300 font-medium">
                      <input 
                        type="checkbox" 
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 w-4 h-4"
                      />
                      Active staff member
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Current Position: #{editMember.display_order + 1}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">To reorder, drag and drop the table row in the team directory list.</p>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Updating...' : 'Update Details'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION --- */}
      {isDeleteOpen && editMember && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Remove Staff Profile?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This action is permanent. The profile details and associated photo for **{editMember.name}** will be permanently removed.
                </p>
              </div>
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 mx-auto">
                <img src={editMember.image_path} className="w-full h-full object-cover object-top" alt="delete-preview" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleDeleteSubmit}
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600 focus:ring-rose-500"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- CROPPER MODAL (1:1 Square) --- */}
      {isCropperOpen && rawCropFile && (
        <ImageCropperModal
          imageFile={rawCropFile}
          aspectRatio={1}
          cropShape="round"
          title="Crop Practitioner Avatar (1:1 Square)"
          onCropComplete={handleCropComplete}
          onClose={handleCropperClose}
        />
      )}
    </div>
  );
}
