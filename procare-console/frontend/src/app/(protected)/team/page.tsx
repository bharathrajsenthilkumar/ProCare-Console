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
  Award
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';

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
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
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

  const openAddModal = () => {
    setName('');
    setRole('');
    setDisplayOrder(0);
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
      header: 'Avatar',
      accessor: (row) => (
        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
          <img 
            src={row.image_path} 
            alt={row.name} 
            className="w-full h-full object-cover object-top"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      ),
    },
    {
      header: 'Staff Name',
      accessor: (row) => (
        <span className="font-semibold text-slate-800">{row.name}</span>
      ),
    },
    {
      header: 'Designation / Role',
      accessor: (row) => (
        <span className="text-slate-600 font-medium flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-slate-400" /> {row.role || 'Practitioner'}
        </span>
      ),
    },
    {
      header: 'Listing Sequence',
      accessor: (row) => (
        <Badge variant="info" className="font-mono">
          {row.display_order}
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          {row.is_active ? (
            <Badge variant="success" className="gap-1">
              <Eye className="w-3.5 h-3.5" /> Active
            </Badge>
          ) : (
            <Badge variant="danger" className="gap-1">
              <EyeOff className="w-3.5 h-3.5" /> Hidden
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => openEditModal(row)}
            className="h-8 px-2.5 text-slate-600 hover:text-slate-900"
          >
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => openDeleteModal(row)}
            className="h-8 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-100 hover:border-rose-200"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
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
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
          <Button variant="outline" size="sm" onClick={fetchMembers} className="ml-auto bg-white border-rose-200 text-rose-700 hover:bg-rose-100">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {loading ? (
        <Card className="border-slate-200 shadow-sm animate-pulse">
          <CardContent className="h-64 flex items-center justify-center">
            <span className="text-slate-400 font-sans text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading Staff Members...
            </span>
          </CardContent>
        </Card>
      ) : members.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
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
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <DataTable 
              data={members} 
              columns={columns} 
              keyExtractor={(row) => row.id.toString()}
            />
          </CardContent>
        </Card>
      )}

      {/* --- ADD MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Add Staff Member</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <Input 
                    placeholder="e.g. Dr. Jane Doe (PT)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Designation / Role</label>
                  <Input 
                    placeholder="e.g. LEAD PHYSIOTHERAPIST"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Profile Photo</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100/50 flex flex-col items-center justify-center gap-2"
                  >
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-600">
                      {selectedFile ? selectedFile.name : 'Upload Profile Picture'}
                    </span>
                    <span className="text-xs text-slate-400">Supports JPG, PNG, WEBP, GIF (Max 5MB)</span>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Display Sequence</label>
                    <Input 
                      type="number" 
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                    <div className="flex items-center h-10 border border-slate-200 rounded-lg px-3 bg-white">
                      <label className="flex items-center gap-2 cursor-pointer w-full text-sm text-slate-600 font-medium">
                        <input 
                          type="checkbox" 
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 w-4 h-4"
                        />
                        Active staff member
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Edit Staff Profile</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <img src={editMember.image_path} className="w-full h-full object-cover object-top" alt="Current" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Replace Profile Image (Optional)</label>
                    <div 
                      onClick={() => editFileInputRef.current?.click()}
                      className="border border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-2.5 text-center cursor-pointer bg-slate-50 hover:bg-slate-100/50 flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600">
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

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <Input 
                    placeholder="e.g. Dr. Jane Doe (PT)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Designation / Role</label>
                  <Input 
                    placeholder="e.g. LEAD PHYSIOTHERAPIST"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Display Sequence</label>
                    <Input 
                      type="number" 
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                    <div className="flex items-center h-10 border border-slate-200 rounded-lg px-3 bg-white">
                      <label className="flex items-center gap-2 cursor-pointer w-full text-sm text-slate-600 font-medium">
                        <input 
                          type="checkbox" 
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 w-4 h-4"
                        />
                        Active staff member
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 text-lg">Remove Staff Profile?</h3>
                <p className="text-sm text-slate-500">
                  This action is permanent. The profile details and associated photo for **{editMember.name}** will be permanently removed.
                </p>
              </div>
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-200 mx-auto">
                <img src={editMember.image_path} className="w-full h-full object-cover object-top" alt="delete-preview" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
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
    </div>
  );
}
