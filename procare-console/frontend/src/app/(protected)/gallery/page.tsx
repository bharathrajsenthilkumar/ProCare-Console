'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Image as ImageIcon, 
  Upload, 
  Edit, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  AlertTriangle, 
  RefreshCw 
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';

interface GalleryItem {
  id: number;
  image_path: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export default function GalleryPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form Fields State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editItem, setEditItem] = useState<GalleryItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1';

  // Load items
  const fetchItems = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/gallery`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        setError('Failed to fetch gallery assets.');
      }
    } catch (err) {
      setError('Network error: Unable to reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [session]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Add Item
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!selectedFile) {
      setFormError('Please select an image file to upload.');
      return;
    }

    setActionLoading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('display_order', displayOrder.toString());
    formData.append('is_active', isActive.toString());

    try {
      const response = await fetch(`${apiUrl}/gallery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setIsAddOpen(false);
        setSelectedFile(null);
        setDisplayOrder(0);
        setIsActive(true);
        fetchItems();
      } else {
        const errData = await response.json();
        setFormError(errData.detail || 'Failed to upload gallery item.');
      }
    } catch (err) {
      setFormError('Network error: Failed to save record.');
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Item
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !editItem) return;

    setActionLoading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append('display_order', displayOrder.toString());
    formData.append('is_active', isActive.toString());
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const response = await fetch(`${apiUrl}/gallery/${editItem.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setIsEditOpen(false);
        setSelectedFile(null);
        setEditItem(null);
        fetchItems();
      } else {
        const errData = await response.json();
        setFormError(errData.detail || 'Failed to update gallery item.');
      }
    } catch (err) {
      setFormError('Network error: Failed to update record.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Item
  const handleDeleteSubmit = async () => {
    if (!session || !editItem) return;

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/gallery/${editItem.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setIsDeleteOpen(false);
        setEditItem(null);
        fetchItems();
      } else {
        const errData = await response.json();
        setError(errData.detail || 'Failed to delete gallery item.');
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
    setSelectedFile(null);
    setDisplayOrder(0);
    setIsActive(true);
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEditModal = (item: GalleryItem) => {
    setEditItem(item);
    setSelectedFile(null);
    setDisplayOrder(item.display_order);
    setIsActive(item.is_active);
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDeleteModal = (item: GalleryItem) => {
    setEditItem(item);
    setIsDeleteOpen(true);
  };

  const columns: Column<GalleryItem>[] = [
    {
      header: 'Preview',
      accessor: (row) => (
        <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <img 
            src={row.image_path} 
            alt="Gallery preview" 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      ),
    },
    {
      header: 'File Name',
      accessor: (row) => {
        const filename = row.image_path.split('/').pop()?.split('?')[0] || 'Image';
        return <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-xs block">{decodeURIComponent(filename)}</span>;
      },
    },
    {
      header: 'Display Order',
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
            className="h-8 px-2.5 text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => openDeleteModal(row)}
            className="h-8 px-2.5 text-rose-600 dark:text-rose-450 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-100 dark:border-rose-950 hover:border-rose-200 dark:hover:border-rose-900"
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
        title="Homepage Gallery Assets" 
        description="Configure media files, clinic photography folders, and captions showing on the public website."
        actions={
          <Button onClick={openAddModal} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Add Image
          </Button>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
          <Button variant="outline" size="sm" onClick={fetchItems} className="ml-auto bg-white border-rose-200 text-rose-700 hover:bg-rose-100">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {loading ? (
        <Card className="border-slate-200 shadow-sm animate-pulse">
          <CardContent className="h-64 flex items-center justify-center">
            <span className="text-slate-400 font-sans text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading Gallery Assets...
            </span>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12">
            <EmptyState 
              icon={ImageIcon}
              title="No Gallery Images Found"
              description="Upload photos of clinic machinery, treatment beds, or physiotherapy spaces to showcase on the homepage."
              actionText="Upload First Image"
              onAction={openAddModal}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="!p-6">
            <DataTable 
              data={items} 
              columns={columns} 
              keyExtractor={(row) => row.id.toString()}
            />
          </CardContent>
        </Card>
      )}

      {/* --- ADD MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Add Gallery Image</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors">
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
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Select Image File</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-850/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 flex flex-col items-center justify-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {selectedFile ? selectedFile.name : 'Click to Upload Image'}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-550">Supports JPG, PNG, WEBP, GIF (Max 5MB)</span>
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
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Display Sequence</label>
                    <Input 
                      type="number" 
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Status</label>
                    <div className="flex items-center h-10 border border-slate-200 dark:border-slate-855 rounded-lg px-3 bg-white dark:bg-slate-950">
                      <label className="flex items-center gap-2 cursor-pointer w-full text-sm text-slate-600 dark:text-slate-300 font-medium">
                        <input 
                          type="checkbox" 
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 w-4 h-4"
                        />
                        Visible on website
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Image'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditOpen && editItem && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Edit Gallery Item</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors">
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
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Current Image</label>
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-center">
                    <img src={editItem.image_path} className="w-full h-full object-cover" alt="Current" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Replace Image (Optional)</label>
                  <div 
                    onClick={() => editFileInputRef.current?.click()}
                    className="border border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50 dark:bg-slate-850/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 flex flex-col items-center justify-center gap-1"
                  >
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {selectedFile ? selectedFile.name : 'Click to Upload Replacement'}
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Display Sequence</label>
                    <Input 
                      type="number" 
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Status</label>
                    <div className="flex items-center h-10 border border-slate-200 dark:border-slate-855 rounded-lg px-3 bg-white dark:bg-slate-950">
                      <label className="flex items-center gap-2 cursor-pointer w-full text-sm text-slate-600 dark:text-slate-300 font-medium">
                        <input 
                          type="checkbox" 
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 w-4 h-4"
                        />
                        Visible on website
                      </label>
                    </div>
                  </div>
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
      {isDeleteOpen && editItem && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Remove Gallery Image?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This action is permanent. The image file will be permanently deleted from Supabase Storage and will no longer show on the homepage.
                </p>
              </div>
              <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 mx-auto">
                <img src={editItem.image_path} className="w-full h-full object-cover" alt="delete-preview" />
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
    </div>
  );
}
