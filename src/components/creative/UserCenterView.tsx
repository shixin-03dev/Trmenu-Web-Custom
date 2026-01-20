import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { getUserProfile, updateUserProfile, updatePwd, uploadAvatar } from '@/api/user';
import { Loader2, Upload, User, Lock, Save, Mail, Phone, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';

export function UserCenterView() {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Profile State
    const [profile, setProfile] = useState({
        nickName: '',
        email: '',
        phonenumber: '',
        sex: '0',
        avatar: ''
    });

    // Password State
    const [passwords, setPasswords] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        setLoading(true);
        try {
            const res: any = await getUserProfile();
            if (res.data) {
                setProfile({
                    nickName: res.data.nickName || '',
                    email: res.data.email || '',
                    phonenumber: res.data.phonenumber || '',
                    sex: res.data.sex || '0',
                    avatar: res.data.avatar || ''
                });
            }
        } catch (error) {
            console.error(error);
            // Fallback to local user info if API fails (e.g. backend missing)
            if (user) {
                setProfile(prev => ({
                    ...prev,
                    nickName: user.nickName || user.userName || '',
                    avatar: user.avatar || ''
                }));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        setSaving(true);
        try {
            await updateUserProfile(profile);
            toast.success("个人信息保存成功");
            refreshUser(); // Refresh global auth context
        } catch (error) {
            console.error(error);
            toast.error("保存失败");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error("两次输入的密码不一致");
            return;
        }
        if (!passwords.oldPassword || !passwords.newPassword) {
            toast.error("请输入密码");
            return;
        }

        setSaving(true);
        try {
            await updatePwd(passwords.oldPassword, passwords.newPassword);
            toast.success("密码修改成功");
            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error(error);
            toast.error("修改失败，请检查旧密码是否正确");
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatarfile', file);

        try {
            const res: any = await uploadAvatar(formData);
            if (res.code === 200) {
                toast.success("头像上传成功");
                setProfile(prev => ({ ...prev, avatar: res.imgUrl }));
                refreshUser();
            } else {
                toast.error(res.msg || "上传失败");
            }
        } catch (error) {
            console.error(error);
            toast.error("上传出错");
        }
    };

    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">个人中心</h2>
                <p className="text-muted-foreground">管理您的个人信息和账户安全。</p>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">基本信息</TabsTrigger>
                    <TabsTrigger value="security">账号安全</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>个人资料</CardTitle>
                            <CardDescription>
                                更新您的头像和基本资料。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Avatar Section */}
                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    <Avatar className="h-24 w-24 cursor-pointer ring-2 ring-offset-2 ring-transparent group-hover:ring-primary transition-all">
                                        <AvatarImage 
                                            src={profile.avatar ? (profile.avatar.startsWith('http') ? profile.avatar : `${API_BASE_URL}${profile.avatar}`) : ''} 
                                            className="object-cover" 
                                        />
                                        <AvatarFallback className="text-2xl">{profile.nickName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div 
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera className="text-white w-8 h-8" />
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleAvatarUpload}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-medium text-lg">{user?.userName}</h3>
                                    <p className="text-sm text-muted-foreground">支持 JPG, PNG 格式，最大 2MB</p>
                                    <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="w-3 h-3 mr-2" />
                                        更换头像
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>用户昵称</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input 
                                            value={profile.nickName} 
                                            onChange={e => setProfile({...profile, nickName: e.target.value})}
                                            className="pl-9"
                                            placeholder="请输入昵称"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>手机号码</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input 
                                            value={profile.phonenumber} 
                                            onChange={e => setProfile({...profile, phonenumber: e.target.value})}
                                            className="pl-9"
                                            placeholder="请输入手机号"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>电子邮箱</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input 
                                            value={profile.email} 
                                            onChange={e => setProfile({...profile, email: e.target.value})}
                                            className="pl-9"
                                            placeholder="请输入邮箱"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>性别</Label>
                                    <div className="flex items-center gap-4 py-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="sex" 
                                                value="0" 
                                                checked={profile.sex === '0'} 
                                                onChange={e => setProfile({...profile, sex: e.target.value})}
                                                className="accent-primary"
                                            />
                                            <span>男</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="sex" 
                                                value="1" 
                                                checked={profile.sex === '1'} 
                                                onChange={e => setProfile({...profile, sex: e.target.value})}
                                                className="accent-primary"
                                            />
                                            <span>女</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleUpdateProfile} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                保存更改
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>修改密码</CardTitle>
                            <CardDescription>
                                建议定期更换密码以保护账户安全。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-w-md">
                            <div className="space-y-2">
                                <Label>旧密码</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                        type="password"
                                        value={passwords.oldPassword}
                                        onChange={e => setPasswords({...passwords, oldPassword: e.target.value})}
                                        className="pl-9"
                                        placeholder="请输入当前密码"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>新密码</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                        type="password"
                                        value={passwords.newPassword}
                                        onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                                        className="pl-9"
                                        placeholder="请输入新密码"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>确认新密码</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input 
                                        type="password"
                                        value={passwords.confirmPassword}
                                        onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                                        className="pl-9"
                                        placeholder="请再次输入新密码"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleUpdatePassword} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                修改密码
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
