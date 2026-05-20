import React, { useEffect, useState } from 'react';
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  MoreVertical,
  Mail,
  Shield,
  Building2,
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
  where,
  getDocs
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

export default function Users() {
  const { isAuthReady, user, userProfile } = useFirebase();
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'TrainingCenter' as any,
    organizationId: ''
  });

  useEffect(() => {
    if (!isAuthReady || !userProfile) return;

    // Only subscribe if user is an admin
    const allowedRoles = ['Admin', 'qso_admin', 'co_admin', 'icto_admin'];
    if (!allowedRoles.includes(userProfile.role)) {
      setLoading(false);
      return;
    }

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    const offPath = 'organizations';
    const unsubOrgs = onSnapshot(collection(db, offPath), (snapshot) => {
      const orgData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Organization[];
      setOrganizations(orgData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, offPath);
    });

    return () => {
      unsubUsers();
      unsubOrgs();
    };
  }, [isAuthReady, userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedOrg = organizations.find(o => o.id === formData.organizationId);
      const officeName = selectedOrg?.name || '';
      const districtId = selectedOrg?.assignedDistrictId || '';

      if (editingUser) {
        const updatedUser = {
          ...formData,
          updatedAt: serverTimestamp(),
          office: officeName,
          assignedDistrictId: districtId
        };
        await updateDoc(doc(db, 'users', editingUser.id), updatedUser);
        
        await addDoc(collection(db, 'auditLogs'), {
          action: `Updated User Account: ${formData.email}`,
          userName: 'Central Admin',
          timestamp: serverTimestamp(),
          details: `Role: ${formData.role}`
        });
      } else {
        // Check local state first for case-insensitive match to be thorough
        const localDuplicate = users.find(u => u.email.toLowerCase() === formData.email.toLowerCase());
        
        if (localDuplicate) {
          const updatedUser = {
            ...formData,
            updatedAt: serverTimestamp(),
            office: officeName,
            assignedDistrictId: districtId
          };
          await updateDoc(doc(db, 'users', localDuplicate.id), updatedUser);
          
          await addDoc(collection(db, 'auditLogs'), {
            action: `Updated Existing User account: ${formData.email}`,
            userName: 'Central Admin',
            timestamp: serverTimestamp(),
            details: `Role: ${formData.role}`
          });
          
          setIsAddModalOpen(false);
          setEditingUser(null);
          setFormData({ name: '', email: '', role: 'TrainingCenter', organizationId: '' });
          setIsSubmitting(false);
          return;
        }

        // Original duplicate check by email (exact match in Firestore)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', formData.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // If multiple duplicates exist, we identify the best one to keep (one with UID)
          const docs = querySnapshot.docs;
          const bestDoc = docs.find(d => d.data().uid) || docs[0];
          
          const updatedUser = {
            ...formData,
            updatedAt: serverTimestamp(),
            office: officeName,
            assignedDistrictId: districtId
          };
          
          await updateDoc(doc(db, 'users', bestDoc.id), updatedUser);
          
          // Delete other duplicates if any
          for (const d of docs) {
            if (d.id !== bestDoc.id) {
              await deleteDoc(doc(db, 'users', d.id));
            }
          }
          
          await addDoc(collection(db, 'auditLogs'), {
            action: `Deduplicated & Updated User Account: ${formData.email}`,
            userName: 'Central Admin',
            timestamp: serverTimestamp(),
            details: `Removed ${docs.length - 1} duplicate records.`
          });
        } else {
          // Create new profile
          const newUser = {
            ...formData,
            status: 'Active',
            createdAt: serverTimestamp(),
            office: officeName,
            assignedDistrictId: districtId
          };
          
          await addDoc(collection(db, 'users'), newUser);
          
          await addDoc(collection(db, 'auditLogs'), {
            action: `Created User Account: ${formData.email}`,
            userName: 'Central Admin',
            timestamp: serverTimestamp(),
            details: `Role: ${formData.role}`
          });
        }
      }

      setIsAddModalOpen(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'TrainingCenter',
        organizationId: ''
      });
    } catch (error) {
      handleFirestoreError(error, editingUser ? OperationType.UPDATE : OperationType.CREATE, 'users');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'TrainingCenter',
      organizationId: user.organizationId || ''
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      
      await addDoc(collection(db, 'auditLogs'), {
        action: `Deleted User Account: ${userToDelete.email}`,
        userName: 'Central Admin',
        timestamp: serverTimestamp(),
        details: `Role: ${userToDelete.role}`
      });

      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const nameStr = (u.name || '').toLowerCase();
    const emailStr = (u.email || '').toLowerCase();
    const officeStr = (u.office || '').toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    
    const matchesSearch = nameStr.includes(searchLower) || emailStr.includes(searchLower) || officeStr.includes(searchLower);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Super Admin - User Directory</h1>
          <p className="text-slate-500">Manage administrative accounts for all TESDA offices and regional centers.</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) {
            setEditingUser(null);
            setFormData({
              name: '',
              email: '',
              role: 'TrainingCenter',
              organizationId: ''
            });
          }
        }}>
          <DialogTrigger render={
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" />
              Create User Account
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit User Account' : 'Create Administrative Account'}</DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Update user details and organization link.' : 'Register a new staff member and link them to an organization.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    placeholder="e.g. Maria Clara" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Official Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    placeholder="maria.clara@tesda.gov.ph" 
                    required 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">System Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(v: any) => setFormData({...formData, role: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">TESDA Central Offices</div>
                      <SelectItem value="Admin">Super Admin</SelectItem>
                      <SelectItem value="qso_admin">QSO (Qualifications & Standards)</SelectItem>
                      <SelectItem value="co_admin">CO (Certification Office)</SelectItem>
                      <SelectItem value="icto_admin">ICTO (Information & Tech)</SelectItem>
                      
                      <div className="mt-2 px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100">Regional & Local</div>
                      <SelectItem value="DistrictOffice">District Office Staff</SelectItem>
                      <SelectItem value="TrainingCenter">Training Center Staff</SelectItem>
                      <SelectItem value="AssessmentCenter">Assessment Center Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {['DistrictOffice', 'TrainingCenter', 'AssessmentCenter'].includes(formData.role) && (
                  <div className="grid gap-2">
                    <Label htmlFor="org">Linked Organization</Label>
                    <Select 
                      value={formData.organizationId} 
                      onValueChange={(v) => setFormData({...formData, organizationId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations
                          .filter(o => {
                            if (formData.role === 'DistrictOffice') return o.type === 'DistrictOffice';
                            // Relax check: both TrainingCenter and AssessmentCenter staff can be linked to either center type
                            const isCenterRole = ['TrainingCenter', 'AssessmentCenter'].includes(formData.role);
                            const isCenterOrg = ['TrainingCenter', 'AssessmentCenter'].includes(o.type);
                            if (isCenterRole) return isCenterOrg;
                            return true;
                          })
                          .map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {formData.role !== 'Admin' && formData.organizationId && organizations.find(o => o.id === formData.organizationId)?.type !== formData.role && (
                      <p className="text-[10px] text-amber-600 font-medium italic">
                        ⚠️ Note: Selected organization type does not match staff role. 
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Update Account' : 'Create Account')}
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
                placeholder="Search users by name or email..." 
                className="pl-10" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px] gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Admin">Super Admin</SelectItem>
                  <SelectItem value="qso_admin">QSO Admin</SelectItem>
                  <SelectItem value="co_admin">CO Admin</SelectItem>
                  <SelectItem value="icto_admin">ICTO Admin</SelectItem>
                  <SelectItem value="DistrictOffice">District Office</SelectItem>
                  <SelectItem value="TrainingCenter">Training Center</SelectItem>
                  <SelectItem value="AssessmentCenter">Assessment Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-blue-600" />
            System User Directory
          </CardTitle>
          <CardDescription>Administrative accounts across all TESDA levels.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Target District</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-100 whitespace-nowrap">
                          {u.role.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {u.office || '-'}
                          </div>
                          {u.organizationId && (
                            <span className="text-[10px] text-slate-400">
                              {organizations.find(o => o.id === u.organizationId)?.type?.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600">
                          {u.role === 'DistrictOffice' || u.role === 'Admin' ? '-' : (() => {
                            const userOrg = organizations.find(o => o.id === u.organizationId);
                            if (!userOrg) return (
                              <span className="text-rose-500 font-medium flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                No Org Linked
                              </span>
                            );
                            
                            // Check for type mismatch
                            if (u.role === 'TrainingCenter' && userOrg.type === 'DistrictOffice') {
                              return (
                                <span className="text-amber-600 font-medium flex items-center gap-1" title="Training Staff cannot be linked directly to a District Office. Link them to a Training Center instead.">
                                  <AlertCircle className="h-3 w-3" />
                                  Invalid Org Type
                                </span>
                              );
                            }

                            const district = organizations.find(o => o.id === userOrg?.assignedDistrictId);
                            return district ? district.name : (
                              <span className="text-rose-500 font-medium flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Untied to District
                              </span>
                            );
                          })()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                          Active
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
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEdit(u)} className="cursor-pointer">
                                <Edit2 className="mr-2 h-4 w-4" />
                                <span>Edit User</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setUserToDelete(u);
                                  setIsDeleteModalOpen(true);
                                }} 
                                className="cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete User</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      No users found.
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
            <DialogTitle>Delete User Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the account for <span className="font-bold text-slate-900">"{userToDelete?.name}"</span> ({userToDelete?.email})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
