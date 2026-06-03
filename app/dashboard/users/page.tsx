"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getUsers, createUser, updateUser, deleteUser, getUserPermissions, saveUserPermissions, getMyPermissions } from "./actions";
import { getVendors } from "@/app/dashboard/vendors/actions";
import { AVAILABLE_MENUS } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Loader2, 
    Plus, 
    Edit2, 
    Trash2, 
    ShieldAlert, 
    CheckCircle2, 
    X, 
    Shield, 
    Users, 
    Key, 
    UserCheck, 
    Wallet, 
    AlertTriangle,
    User,
    Mail,
    Search,
    Briefcase
} from "lucide-react";

interface UserItem {
    id: string;
    name: string;
    email: string;
    role: "vendor" | "procurement" | "finance" | "admin";
    createdAt: Date;
}

interface VendorOption {
    id: string;
    supplier: string;
    nameOfVendor: string;
    searchTerm: string | null;
    purchOrganization: string;
}

export default function UserManagementPage() {
    const { data: session, isPending: sessionPending } = useSession();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Form states
    const [isOpen, setIsOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"vendor" | "procurement" | "finance" | "admin">("procurement");
    const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
    const [vendorsList, setVendorsList] = useState<VendorOption[]>([]);
    const [vendorSearchQuery, setVendorSearchQuery] = useState("");
    
    // Batch vendor creation states
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
    const [selectAllVendors, setSelectAllVendors] = useState(false);

    // Permission modal states
    const [isPermOpen, setIsPermOpen] = useState(false);
    const [permUserId, setPermUserId] = useState<string | null>(null);
    const [permUserName, setPermUserName] = useState("");
    const [isLoadingPerms, setIsLoadingPerms] = useState(false);
    const [permsList, setPermsList] = useState<{
        menuKey: string;
        canAccess: boolean;
        canCreate: boolean;
        canUpdate: boolean;
        canDelete: boolean;
    }[]>([]);

    // Search, tabs and pagination states
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "admin" | "procurement" | "finance" | "vendor">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([]);

    const [myPermissions, setMyPermissions] = useState<Record<string, { canAccess: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>>({});
    const [loadingMyPerms, setLoadingMyPerms] = useState(true);

    const fetchMyPermissions = async () => {
        setLoadingMyPerms(true);
        const res = await getMyPermissions();
        if (res.success && res.permissions) {
            setMyPermissions(res.permissions);
        }
        setLoadingMyPerms(false);
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        const result = await getUsers();
        if (result.success && result.users) {
            setUsers(result.users as UserItem[]);
        } else {
            setMessage({ type: "error", text: result.error || "Failed to load users" });
        }
        setIsLoading(false);
    };

    const fetchVendorsData = async () => {
        const res = await getVendors();
        if (res.success && res.vendors) {
            setVendorsList(res.vendors);
        }
    };

    useEffect(() => {
        if (session?.user) {
            fetchUsers();
            fetchMyPermissions();
            fetchVendorsData();
        }
    }, [session]);

    // Apply filtering whenever users, activeTab, or searchQuery change
    useEffect(() => {
        let result = [...users];
        if (activeTab !== "all") {
            result = result.filter(u => u.role === activeTab);
        }
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(u => 
                u.name.toLowerCase().includes(query) || 
                u.email.toLowerCase().includes(query)
            );
        }
        setFilteredUsers(result);
        setCurrentPage(1);
    }, [users, activeTab, searchQuery]);

    if (sessionPending || loadingMyPerms) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Dynamic Access Control Check
    const userRole = (session?.user as { role?: string })?.role;
    const isAuthorized = userRole === "admin" || myPermissions["user-management"]?.canAccess;

    if (!session || !isAuthorized) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-red-700 dark:text-red-400">Akses Ditolak (Unauthorized)</CardTitle>
                        <CardDescription className="text-red-600/80 dark:text-red-400/80">
                            Halaman ini hanya dapat diakses oleh aktor **Super Admin**. Peran Anda saat ini adalah **{userRole || "Guest"}**.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const handleOpenCreate = () => {
        setEditId(null);
        setName("");
        setEmail("");
        setPassword("");
        setRole("procurement");
        setSelectedVendorIds([]);
        setSelectAllVendors(false);
        setVendorSearchQuery("");
        setIsOpen(true);
    };

    const handleOpenEdit = (u: UserItem) => {
        setEditId(u.id);
        setName(u.name);
        setEmail(u.email);
        setPassword("");
        setRole(u.role);
        setIsOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        const payload = { name, email, role, password };

        if (editId) {
            const res = await updateUser(editId, payload);
            if (res.success) {
                setMessage({ type: "success", text: `Successfully updated user: ${name}!` });
                setIsOpen(false);
                fetchUsers();
            } else {
                setMessage({ type: "error", text: res.error || "Failed to update user" });
            }
        } else {
            if (role === "vendor") {
                // Batch create vendor users
                const vendorsToProcess = selectAllVendors 
                    ? vendorsList 
                    : vendorsList.filter(v => selectedVendorIds.includes(v.id));
                
                if (vendorsToProcess.length === 0) {
                    setMessage({ type: "error", text: "Silakan pilih setidaknya satu vendor" });
                    setIsSaving(false);
                    return;
                }

                let successCount = 0;
                let failCount = 0;

                for (const v of vendorsToProcess) {
                    const prefixSource = (v.searchTerm || v.nameOfVendor || v.supplier || "").trim();
                    const firstWord = prefixSource.split(/\s+/)[0];
                    const cleanPrefix = firstWord.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const vendorEmail = `${cleanPrefix || "vendor"}@gmail.com`;

                    const vendorPayload = {
                        name: v.nameOfVendor,
                        email: vendorEmail,
                        role: "vendor" as const,
                        password: "password"
                    };
                    const res = await createUser(vendorPayload);
                    if (res.success) successCount++;
                    else failCount++;
                }

                setMessage({ 
                    type: successCount > 0 ? "success" : "error", 
                    text: `Selesai memproses vendor. Berhasil: ${successCount}, Gagal: ${failCount}` 
                });
                if (successCount > 0) {
                    setIsOpen(false);
                    fetchUsers();
                }
            } else {
                // Single create for other roles
                const createPayload = { ...payload, password };
                const res = await createUser(createPayload);
                if (res.success) {
                    setMessage({ type: "success", text: `Successfully created user: ${name}! Password: ${password || "Password123!"}` });
                    setIsOpen(false);
                    fetchUsers();
                } else {
                    setMessage({ type: "error", text: res.error || "Failed to create user" });
                }
            }
        }
        setIsSaving(false);
    };

    const handleDelete = (u: UserItem) => {
        setUserToDelete(u);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        setIsLoading(true);
        const res = await deleteUser(userToDelete.id);
        if (res.success) {
            setMessage({ type: "success", text: `Successfully deleted user: ${userToDelete.name}!` });
            fetchUsers();
        } else {
            setMessage({ type: "error", text: res.error || "Failed to delete user" });
            setIsLoading(false);
        }
        setUserToDelete(null);
    };

    const handleOpenPermissions = async (u: UserItem) => {
        setPermUserId(u.id);
        setPermUserName(u.name);
        setIsLoadingPerms(true);
        setIsPermOpen(true);
        setPermsList([]);

        const res = await getUserPermissions(u.id);
        if (res.success && res.permissions) {
            // Map existing DB permissions to a lookup map
            const existingMap = new Map(res.permissions.map((p) => [p.menuKey, p]));

            // Build full list of permissions, using existing record or defaulting all to false
            const fullList = AVAILABLE_MENUS.map((menu) => {
                const existing = existingMap.get(menu.key);
                return {
                    menuKey: menu.key,
                    canAccess: existing ? existing.canAccess : false,
                    canCreate: existing ? existing.canCreate : false,
                    canUpdate: existing ? existing.canUpdate : false,
                    canDelete: existing ? existing.canDelete : false,
                };
            });
            setPermsList(fullList);
        } else {
            setMessage({ type: "error", text: res.error || "Failed to load permissions" });
            setIsPermOpen(false);
        }
        setIsLoadingPerms(false);
    };

    const handleTogglePermission = (menuKey: string, field: "canAccess" | "canCreate" | "canUpdate" | "canDelete") => {
        setPermsList(prev => prev.map(p => {
            if (p.menuKey === menuKey) {
                const updated = { ...p, [field]: !p[field] };
                if (field !== "canAccess" && updated[field]) {
                    updated.canAccess = true;
                }
                if (field === "canAccess" && !updated.canAccess) {
                    updated.canCreate = false;
                    updated.canUpdate = false;
                    updated.canDelete = false;
                }
                return updated;
            }
            return p;
        }));
    };

    const handleSavePermissions = async () => {
        if (!permUserId) return;
        setIsSaving(true);
        const res = await saveUserPermissions(permUserId, permsList);
        if (res.success) {
            setMessage({ type: "success", text: `Successfully updated permissions for ${permUserName}!` });
            setIsPermOpen(false);
        } else {
            setMessage({ type: "error", text: res.error || "Failed to save permissions" });
        }
        setIsSaving(false);
    };

    const handleResetPermissionsToDefault = async () => {
        if (!permUserId) return;
        if (confirm(`Apakah Anda yakin ingin menyetel ulang hak akses ${permUserName} ke default peran?`)) {
            setIsSaving(true);
            const res = await saveUserPermissions(permUserId, []);
            if (res.success) {
                setMessage({ type: "success", text: `Reset permissions to default for ${permUserName}!` });
                setIsPermOpen(false);
            } else {
                setMessage({ type: "error", text: res.error || "Failed to reset permissions" });
            }
            setIsSaving(false);
        }
    };

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPageButtons = 5;
        if (totalPages <= maxPageButtons) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pageNumbers.push(1, 2, 3, 4, "ellipsis-right", totalPages);
            } else if (currentPage >= totalPages - 2) {
                pageNumbers.push(1, "ellipsis-left", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pageNumbers.push(1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages);
            }
        }
        return pageNumbers;
    };
    const pageNumbers = getPageNumbers();

    // Scorecard statistics
    const totalUsersCount = users.length;
    const adminCount = users.filter(u => u.role === "admin").length;
    const procurementCount = users.filter(u => u.role === "procurement").length;
    const financeCount = users.filter(u => u.role === "finance").length;
    const vendorCount = users.filter(u => u.role === "vendor").length;

    return (
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto flex flex-1 flex-col gap-6 select-none relative">
            
            {/* Breadcrumbs */}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Management / <span className="text-blue-600 font-semibold">User Management</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight">User Management</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Master Data Management Console untuk Super Admin. <span className="text-blue-600 font-bold">{users.length} registered users.</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2 rounded-lg h-10 px-4 shadow-sm">
                        <Plus className="h-4 w-4" /> Add New User
                    </Button>
                </div>
            </div>

            {/* Notification alert */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-3 duration-200 ${
                    message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400" : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400"
                }`}>
                    <div className="flex items-center gap-2.5">
                        {message.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-red-600" />}
                        <span className="text-sm font-semibold">{message.text}</span>
                    </div>
                    <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100 transition-opacity">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Scorecards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active Users</span>
                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{totalUsersCount}</div>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">
                            SYSTEM ACTIVE ACCOUNTS
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Super Administrators</span>
                        <div className="h-8 w-8 bg-purple-50 dark:bg-purple-950/40 rounded-lg flex items-center justify-center">
                            <Key className="h-4 w-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{adminCount}</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            FULL CONSOLE CONTROL
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Procurement Admins</span>
                        <div className="h-8 w-8 bg-amber-50 dark:bg-amber-950/40 rounded-lg flex items-center justify-center">
                            <UserCheck className="h-4 w-4 text-amber-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{procurementCount}</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            INVOICE VERIFIERS
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Finance Module</span>
                        <div className="h-8 w-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center">
                            <Wallet className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{financeCount}</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            PAYMENT DISBURSERS
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Controls panel: Filter Tabs, Search and Multi-select filtering */}
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                
                {/* Search query input */}
                <div className="relative w-full">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search users by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm h-10 w-full"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t pt-3">
                    
                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "all" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            All Users ({users.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("admin")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "admin" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Super Admins ({adminCount})
                        </button>
                        <button
                            onClick={() => setActiveTab("procurement")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "procurement" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Procurements ({procurementCount})
                        </button>
                        <button
                            onClick={() => setActiveTab("finance")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "finance" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Finance ({financeCount})
                        </button>
                        <button
                            onClick={() => setActiveTab("vendor")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "vendor" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Vendors ({vendorCount})
                        </button>
                    </div>
                </div>
            </div>

            {/* List Table Card */}
            <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden transition-all">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 font-medium">No users found matching query filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/30">
                                        <th className="px-5 py-3">Name</th>
                                        <th className="px-5 py-3">Email</th>
                                        <th className="px-5 py-3">Role</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                    {currentItems.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group animate-none">
                                            <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{u.name}</td>
                                            <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium">{u.email}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                                    u.role === "admin" ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400" :
                                                    u.role === "procurement" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400" :
                                                    u.role === "finance" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" :
                                                    "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400"
                                                }`}>
                                                    {u.role === "admin" ? "Super Admin" : u.role}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" onClick={() => handleOpenPermissions(u)} className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-md" title="Manage Permissions">
                                                        <Shield className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(u)} className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-md">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(u)} disabled={u.id === session.user.id} className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30 rounded-md">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
                    <div className="text-xs font-semibold text-slate-400">
                        Showing <span className="text-slate-700 dark:text-slate-300">{indexOfFirstItem + 1}</span> to <span className="text-slate-700 dark:text-slate-300">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of <span className="text-slate-700 dark:text-slate-300">{filteredUsers.length}</span> records
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(currentPage - 1)}
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            &lt;
                        </Button>
                        {pageNumbers.map((pageNum, idx) => {
                            if (pageNum === "ellipsis-left" || pageNum === "ellipsis-right") {
                                return (
                                    <span key={`ellipsis-${idx}`} className="text-slate-400 dark:text-slate-500 text-xs px-1 select-none font-bold">
                                        ...
                                    </span>
                                );
                            }
                            const pageVal = pageNum as number;
                            return (
                                <Button
                                    key={pageVal}
                                    onClick={() => setCurrentPage(pageVal)}
                                    variant={currentPage === pageVal ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 w-8 p-0 rounded-lg text-xs font-bold ${currentPage === pageVal ? "bg-blue-600 text-white" : ""}`}
                                >
                                    {pageVal}
                                </Button>
                            );
                        })}
                        <Button 
                            disabled={currentPage === totalPages} 
                            onClick={() => setCurrentPage(currentPage + 1)}
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            &gt;
                        </Button>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button 
                onClick={handleOpenCreate}
                className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center z-45 transition-all"
                title="Add New User"
            >
                <Plus className="h-6 w-6 font-bold" />
            </button>

            {/* Modal Dialog */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300">
                    <Card className="w-full max-w-xl bg-white dark:bg-slate-950 shadow-xl border border-slate-200 dark:border-slate-800 transform transition-all duration-300 scale-100 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="relative pb-2">
                            <CardTitle className="text-xl font-bold font-parkinsans tracking-tight text-slate-900 dark:text-white">{editId ? "Edit User" : "Add New User"}</CardTitle>
                            <CardDescription className="text-xs text-slate-400 mt-1">
                                {editId ? "Perbarui informasi profil pengguna dan peran sistem." : "Daftarkan akun pengguna baru beserta otorisasi peran sistem."}
                            </CardDescription>
                            <button type="button" onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </CardHeader>
                        <form onSubmit={handleSave}>
                            <CardContent className="space-y-5 pt-1 pb-8">
                                <div className="space-y-1.5">
                                    <Label htmlFor="role" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Shield className="h-3.5 w-3.5" /> Role Authorization
                                    </Label>
                                    <select id="role" value={role} onChange={(e) => {
                                        setRole(e.target.value as "vendor" | "procurement" | "finance" | "admin");
                                        setSelectedVendorIds([]);
                                        setSelectAllVendors(false);
                                    }} className="flex h-11 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 text-slate-700 dark:text-slate-300" disabled={isSaving || !!editId}>
                                        <option value="vendor">Vendor</option>
                                        <option value="procurement">Procurement Admin</option>
                                        <option value="finance">Finance</option>
                                        <option value="admin">Super Admin</option>
                                    </select>
                                </div>

                                {/* IF VENDOR & CREATE MODE */}
                                {!editId && role === "vendor" ? (
                                    <div className="space-y-3 p-4 border border-blue-100 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 rounded-xl">
                                        <div className="flex flex-col gap-1.5">
                                            <Label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Briefcase className="h-3.5 w-3.5" /> Buat Akun Untuk Vendor
                                            </Label>
                                            <p className="text-[10px] text-slate-500 leading-relaxed mb-1">
                                                Pilih vendor dari Master Data. Sistem otomatis membuatkan user login massal. Email = [SearchTerm]@gmail.com, Sandi = password.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <input 
                                                type="checkbox" 
                                                id="selectAll" 
                                                checked={selectAllVendors}
                                                onChange={(e) => {
                                                    setSelectAllVendors(e.target.checked);
                                                    if (e.target.checked) setSelectedVendorIds([]);
                                                }}
                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <label htmlFor="selectAll" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                Pilih Semua Data di Vendor Master ({vendorsList.length} vendor)
                                            </label>
                                        </div>

                                        {!selectAllVendors && (
                                            <>
                                                <div className="relative mt-2 mb-3">
                                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        type="text"
                                                        placeholder="Cari nama vendor atau supplier ID..."
                                                        value={vendorSearchQuery}
                                                        onChange={(e) => setVendorSearchQuery(e.target.value)}
                                                        className="pl-9 h-9 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-blue-500"
                                                    />
                                                </div>

                                                <div className="space-y-2 mt-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                    {vendorsList.filter(v => {
                                                        const q = vendorSearchQuery.toLowerCase().trim();
                                                        if (!q) return true;
                                                        return (
                                                            v.nameOfVendor.toLowerCase().includes(q) ||
                                                            v.supplier.toLowerCase().includes(q) ||
                                                            (v.searchTerm && v.searchTerm.toLowerCase().includes(q))
                                                        );
                                                    }).length === 0 && (
                                                        <p className="text-sm text-slate-500 italic text-center py-4">Tidak ada vendor yang cocok.</p>
                                                    )}
                                                    {vendorsList
                                                        .filter(v => {
                                                            const q = vendorSearchQuery.toLowerCase().trim();
                                                            if (!q) return true;
                                                            return (
                                                                v.nameOfVendor.toLowerCase().includes(q) ||
                                                                v.supplier.toLowerCase().includes(q) ||
                                                                (v.searchTerm && v.searchTerm.toLowerCase().includes(q))
                                                            );
                                                        })
                                                        .map(v => (
                                                            <div key={v.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                                <input 
                                                                    type="checkbox" 
                                                                    id={`v-${v.id}`}
                                                                    checked={selectedVendorIds.includes(v.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedVendorIds(prev => [...prev, v.id]);
                                                                        } else {
                                                                            setSelectedVendorIds(prev => prev.filter(id => id !== v.id));
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                                />
                                                                <label htmlFor={`v-${v.id}`} className="flex flex-col cursor-pointer">
                                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{v.nameOfVendor}</span>
                                                                    <span className="text-[10px] text-slate-500">ID: {v.supplier} | Org: {v.purchOrganization}</span>
                                                                </label>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5" /> Full Name
                                            </Label>
                                            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. John Doe" disabled={isSaving} className="border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 rounded-lg h-11 bg-slate-50/50 dark:bg-slate-900/50" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Mail className="h-3.5 w-3.5" /> Email Address
                                            </Label>
                                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g. user@invoiceflow.com" disabled={isSaving} className="border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 rounded-lg h-11 bg-slate-50/50 dark:bg-slate-900/50" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Key className="h-3.5 w-3.5" /> Password {editId && "(Opsional)"}
                                            </Label>
                                            <Input id="password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editId ? "Kosongkan jika tidak ingin mengubah password" : "Biarkan kosong untuk (Password123!)"} disabled={isSaving} className="border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 rounded-lg h-11 bg-slate-50/50 dark:bg-slate-900/50" />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving} className="border-slate-200 dark:border-slate-800 h-10 font-semibold rounded-lg">Cancel</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 rounded-lg shadow-sm" disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save User"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Permissions Modal Dialog */}
            {isPermOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300">
                    <Card className="w-full max-w-lg bg-white dark:bg-slate-950 shadow-xl border border-slate-200 dark:border-slate-800 transform transition-all duration-300 scale-100 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="relative pb-4">
                            <CardTitle className="text-xl font-bold font-parkinsans flex items-center gap-2 text-slate-900 dark:text-white">
                                <Shield className="h-5 w-5 text-blue-600" />
                                Otorisasi Akses Menu
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-400 mt-1">
                                Mengatur otorisasi spesifik halaman untuk user **{permUserName}**. Centang akses yang diizinkan.
                            </CardDescription>
                            <button onClick={() => setIsPermOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            {isLoadingPerms ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-900 rounded-xl">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                                <th className="px-4 py-3 text-left">Menu Akses</th>
                                                <th className="px-2 py-3 text-center" title="Hak untuk melihat data (View Only)">View (Access)</th>
                                                <th className="px-2 py-3 text-center">Create</th>
                                                <th className="px-2 py-3 text-center">Update</th>
                                                <th className="px-2 py-3 text-center">Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                            {permsList.map((p) => {
                                                const menuLabel = AVAILABLE_MENUS.find(m => m.key === p.menuKey)?.label || p.menuKey;
                                                return (
                                                    <tr key={p.menuKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{menuLabel}</td>
                                                        <td className="px-2 py-3 text-center">
                                                            <input type="checkbox" checked={p.canAccess} onChange={() => handleTogglePermission(p.menuKey, "canAccess")} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer accent-blue-600" />
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            <input type="checkbox" checked={p.canCreate} onChange={() => handleTogglePermission(p.menuKey, "canCreate")} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer accent-blue-600" />
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            <input type="checkbox" checked={p.canUpdate} onChange={() => handleTogglePermission(p.menuKey, "canUpdate")} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer accent-blue-600" />
                                                        </td>
                                                        <td className="px-2 py-3 text-center">
                                                            <input type="checkbox" checked={p.canDelete} onChange={() => handleTogglePermission(p.menuKey, "canDelete")} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 cursor-pointer accent-blue-600" />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                        <div className="flex justify-between items-center px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                            <Button type="button" variant="outline" onClick={handleResetPermissionsToDefault} disabled={isSaving || isLoadingPerms} className="text-amber-600 border-amber-200 hover:bg-amber-50 h-10 font-semibold rounded-lg">
                                Gunakan Default Peran
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsPermOpen(false)} disabled={isSaving} className="border-slate-200 dark:border-slate-800 h-10 font-semibold rounded-lg">Cancel</Button>
                                <Button type="button" onClick={handleSavePermissions} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 rounded-lg shadow-sm" disabled={isSaving || isLoadingPerms}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Simpan Otorisasi"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300">
                    <Card className="w-full max-w-sm bg-white dark:bg-slate-950 shadow-2xl border border-red-200 dark:border-red-900/50 transform transition-all duration-300 scale-100 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="text-center pb-4 pt-6">
                            <div className="flex justify-center mb-3">
                                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                                    <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                            <CardTitle className="text-xl font-bold font-parkinsans tracking-tight text-slate-900 dark:text-white">Hapus Pengguna?</CardTitle>
                            <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                Anda yakin ingin menghapus secara permanen pengguna <strong>{userToDelete.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                            </CardDescription>
                            {userToDelete.role === "admin" && (
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-900/50">
                                    Perhatian: Anda tidak dapat menghapus akun Super Admin.
                                </div>
                            )}
                        </CardHeader>
                        <div className="flex gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t">
                            <Button type="button" variant="outline" onClick={() => setUserToDelete(null)} disabled={isLoading} className="flex-1 h-10 font-semibold rounded-lg bg-white">
                                Batal
                            </Button>
                            <Button type="button" onClick={handleConfirmDelete} disabled={isLoading || userToDelete.role === "admin"} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold h-10 rounded-lg shadow-sm">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
