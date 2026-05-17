import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  MoreVertical,
  MapPin,
  Mail,
  Shield,
  CheckCircle2, 
  XCircle,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useFirebase } from '@/src/lib/FirebaseProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Organization } from '@/src/types';

export default function Organizations() {
  const { isAuthReady, user, userProfile } = useFirebase();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [districts, setDistricts] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'TrainingCenter' as Organization['type'],
    email: '',
    location: '',
    assignedDistrictId: ''
  });

  useEffect(() => {
    if (!isAuthReady || !userProfile) return;

    // Only subscribe if user is an admin or specific office role
    const allowedRoles = ['Admin', 'qso_admin', 'co_admin', 'icto_admin'];
    if (!allowedRoles.includes(userProfile.role)) {
      setLoading(false);
      return;
    }

    const path = 'organizations';
    const unsubOrgs = onSnapshot(collection(db, path), (snapshot) => {
      const orgData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Organization[];
      setOrganizations(orgData);
      setDistricts(orgData.filter(o => o.type === 'DistrictOffice'));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubOrgs();
  }, [isAuthReady, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingOrg) {
        const updatedOrg = {
          ...formData,
          updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, 'organizations', editingOrg.id), updatedOrg);
        
        await addDoc(collection(db, 'auditLogs'), {
          action: `Updated Organization: ${formData.name}`,
          userName: 'Central Admin',
          timestamp: serverTimestamp(),
          details: `Type: ${formData.type}`
        });
      } else {
        // Check for duplicate organization by name
        const existingOrg = organizations.find(o => o.name.toLowerCase() === formData.name.toLowerCase());
        
        if (existingOrg) {
          // If it exists, just update it instead of creating duplicate
          const updatedOrg = {
            ...formData,
            updatedAt: serverTimestamp()
          };
          await updateDoc(doc(db, 'organizations', existingOrg.id), updatedOrg);
        } else {
          // Create new organization
          const newOrg = {
            ...formData,
            status: 'Active',
            createdAt: serverTimestamp()
          };
          
          await addDoc(collection(db, 'organizations'), newOrg);
        }
        
        // Log action
        await addDoc(collection(db, 'auditLogs'), {
          action: `${existingOrg ? 'Updated Existing' : 'Created'} Organization: ${formData.name}`,
          userName: 'Central Admin',
          timestamp: serverTimestamp(),
          details: `Type: ${formData.type}`
        });
      }

      setIsAddModalOpen(false);
      setEditingOrg(null);
      setFormData({
        name: '',
        type: 'TrainingCenter',
        email: '',
        location: '',
        assignedDistrictId: ''
      });
    } catch (error) {
      handleFirestoreError(error, editingOrg ? OperationType.UPDATE : OperationType.CREATE, 'organizations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      type: org.type,
      email: org.email,
      location: org.location,
      assignedDistrictId: org.assignedDistrictId || ''
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    if (!orgToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'organizations', orgToDelete.id));
      
      await addDoc(collection(db, 'auditLogs'), {
        action: `Deleted Organization: ${orgToDelete.name}`,
        userName: 'Central Admin',
        timestamp: serverTimestamp(),
        details: `Type: ${orgToDelete.type}`
      });

      setIsDeleteModalOpen(false);
      setOrgToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'organizations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (org: Organization) => {
    try {
      const newStatus = org.status === 'Active' ? 'Inactive' : 'Active';
      await updateDoc(doc(db, 'organizations', org.id), { status: newStatus });
      
      await addDoc(collection(db, 'auditLogs'), {
        action: `${newStatus === 'Active' ? 'Activated' : 'Deactivated'} Organization: ${org.name}`,
        userName: 'Central Admin',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'organizations');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Organization Management</h1>
          <p className="text-slate-500">Manage District Offices, Training Centers, and Assessment Centers.</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) {
            setEditingOrg(null);
            setFormData({
              name: '',
              type: 'TrainingCenter',
              email: '',
              location: '',
              assignedDistrictId: ''
            });
          }
        }}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" />
              Register Organization
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingOrg ? 'Edit Organization' : 'Register New Organization'}</DialogTitle>
                <DialogDescription>
                  {editingOrg ? 'Update the details of the organization.' : 'Add a new TESDA entity to the system.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    placeholder="e.g. TESDA District Office - Manila" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Organization Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v: any) => setFormData({...formData, type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DistrictOffice">District Office</SelectItem>
                      <SelectItem value="TrainingCenter">Training Center</SelectItem>
                      <SelectItem value="AssessmentCenter">Assessment Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Official Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    placeholder="office@tesda.gov.ph" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location / Address</Label>
                  <Input 
                    id="location" 
                    value={formData.location} 
                    onChange={(e) => setFormData({...formData, location: e.target.value})} 
                    placeholder="City, Province" 
                    required 
                  />
                </div>
                {formData.type !== 'DistrictOffice' && (
                  <div className="grid gap-2">
                    <Label htmlFor="district">Assigned District Office</Label>
                    <Select 
                      value={formData.assignedDistrictId} 
                      onValueChange={(v) => setFormData({...formData, assignedDistrictId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select District Office" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? (editingOrg ? 'Updating...' : 'Registering...') : (editingOrg ? 'Update Organization' : 'Register Organization')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search organizations..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Registered Organizations
          </CardTitle>
          <CardDescription>A total of {organizations.length} organizations are registered in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[300px]">Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Assigned District</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.filter(org => 
                  org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  org.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  org.location.toLowerCase().includes(searchTerm.toLowerCase())
                ).length > 0 ? (
                  organizations.filter(org => 
                    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    org.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    org.location.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((org) => (
                    <TableRow key={org.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{org.name}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {org.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          org.type === 'DistrictOffice' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                          org.type === 'TrainingCenter' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        }>
                          {org.type.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="h-3 w-3" />
                          {org.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600">
                            {org.type === 'DistrictOffice' ? '-' : 
                             districts.find(d => d.id === org.assignedDistrictId)?.name || (
                               <span className="text-rose-500 font-medium flex items-center gap-1">
                                 <AlertCircle className="h-3 w-3" />
                                 Unassigned
                               </span>
                             )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          org.status === 'Active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none' :
                          'bg-slate-100 text-slate-700 hover:bg-slate-100 border-none'
                        }>
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                               <span className="sr-only">Open menu</span>
                               <MoreVertical className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleStatus(org)} className="cursor-pointer">
                                {org.status === 'Active' ? (
                                  <>
                                    <XCircle className="mr-2 h-4 w-4 text-amber-600" />
                                    <span>Deactivate Organization</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                                    <span>Activate Organization</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(org)} className="cursor-pointer">
                                <Edit2 className="mr-2 h-4 w-4" />
                                <span>Edit Details</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setOrgToDelete(org);
                                  setIsDeleteModalOpen(true);
                                }} 
                                className="cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete Organization</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      No organizations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-bold text-slate-900">"{orgToDelete?.name}"</span>? This will permanently remove the organization and may affect linked user accounts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
