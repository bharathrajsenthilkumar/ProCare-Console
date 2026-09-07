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
  RefreshCw,
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
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [rawCropFile, setRawCropFile] = useState<File | string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editItem, setEditItem] = useState<GalleryItem | null>(null);
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

  // Handle drag-and-drop reordering
  const handleReorder = async (newItems: GalleryItem[]) => {
    const reorderedWithOrder = newItems.map((item, index) => ({
      ...item,
      display_order: index,
    }));
    setItems(reorderedWithOrder);

    if (!session) return;

    try {
      const payload = reorderedWithOrder.map((item) => ({
        id: item.id,
        display_order: item.display_order,
      }));

      const res = await fetch(`${apiUrl}/gallery/reorder`, {
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
          reorderedWithOrder.map((item) => {
            const fd = new FormData();
            fd.append('display_order', item.display_order.toString());
            return fetch(`${apiUrl}/gallery/${item.id}`, {
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
      console.error('Failed to update gallery reorder:', err);
    }
  };

  const openAddModal = () => {
    setSelectedFile(null);
    setDisplayOrder(items.length);
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
      header: 'Position',
      className: 'text-center',
      accessor: (row) => (
        <div className="flex items-center justify-center">
          <Badge variant="info" className="font-mono">
            #{row.display_order + 1}
          </Badge>
        </div>
      ),
    },
    {
      header: 'Preview',
      className: 'text-center',
      accessor: (row) => (
        <div className="flex items-center justify-center">
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
        </div>
      ),
    },
    {
      header: 'File Name',
      className: 'text-center',
      accessor: (row) => {
        const filename = row.image_path.split('/').pop()?.split('?')[0] || 'Image';
        return (
          <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-xs block mx-auto text-center">
            {decodeURIComponent(filename)}
          </span>
        );
      },
    },
    {
      header: 'Status',
      className: 'text-center',
      accessor: (row) => (
        <div className="flex items-center justify-center gap-1.5">
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
      className: 'text-center whitespace-nowrap',
      accessor: (row) => (
        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => openEditModal(row)}
            className="h-8 px-2.5 text-slate-600 dark:text-slate-350 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
          >
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => openDeleteModal(row)}
            className="h-8 px-2.5 text-rose-600 dark:text-rose-450 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-100 dark:border-rose-950 hover:border-rose-200 dark:hover:border-rose-900 shrink-0"
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
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="text-sm font-medium">{error}</div>
          <Button variant="outline" size="sm" onClick={fetchItems} className="ml-auto bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40">
            <RefreshCw className="w-4 h-4 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading Gallery Assets..." />
      ) : items.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
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
        <div className="space-y-4">
          <DataTable 
            data={items} 
            columns={columns} 
            keyExtractor={(row) => row.id.toString()}
            isDraggable={true}
            onReorder={handleReorder}
            tableClassName="min-w-max"
          />
        </div>
      )}

      {/* --- ADD MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Add Gallery Image</h3>
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
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select Image File</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 flex flex-col items-center justify-center gap-2 shadow-xs"
                  >
                    <Upload className="w-8 h-8 text-slate-400 dark:text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {selectedFile ? selectedFile.name : 'Click to Upload Image'}
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
                      Visible on website
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Auto-placed at #{items.length + 1}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">You can drag and drop rows in the table anytime to reorder slides.</p>
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Edit Gallery Item</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Current Image {selectedFile && <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">(Cropped Staged)</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTriggerRecrop(selectedFile || editItem.image_path)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Re-crop Image</span>
                    </button>
                  </div>
                  <div 
                    onClick={() => handleTriggerRecrop(selectedFile || editItem.image_path)}
                    className="group relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-center cursor-pointer transition-all hover:border-sky-400 dark:hover:border-sky-500 shadow-xs"
                  >
                    <img 
                      src={selectedFilePreview || editItem.image_path} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      alt="Current" 
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                      <Crop className="w-4 h-4" />
                      <span>Click to Re-crop Image</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Replace Image (Optional)</label>
                  <div 
                    onClick={() => editFileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 flex flex-col items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Upload className="w-5 h-5 text-slate-400 dark:text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {selectedFile ? selectedFile.name : 'Click to Upload Replacement'}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400">Supports JPG, PNG, WEBP, GIF (Max 10MB)</span>
                  </div>
                  <input 
                    type="file" 
                    ref={editFileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept="image/*"
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
                      Visible on website
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Current Position: #{editItem.display_order + 1}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">To reorder, drag and drop the table row in the gallery list.</p>
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

      {/* --- CROPPER MODAL (16:9 Landscape) --- */}
      {isCropperOpen && rawCropFile && (
        <ImageCropperModal
          imageFile={rawCropFile}
          aspectRatio={16 / 9}
          title="Crop Gallery Image (16:9)"
          onCropComplete={handleCropComplete}
          onClose={handleCropperClose}
        />
      )}
    </div>
  );
}
