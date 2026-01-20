import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCodeImg } from '@/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [codeUrl, setCodeUrl] = useState('');
  const [uuid, setUuid] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    code: ''
  });

  const getCaptcha = async () => {
    try {
      const res: any = await getCodeImg();
      if (res.img) {
        setCodeUrl('data:image/gif;base64,' + res.img);
        setUuid(res.uuid);
      }
    } catch (error) {
      console.error(error);
      toast.error('获取验证码失败');
    }
  };

  useEffect(() => {
    if (open) {
      getCaptcha();
      setFormData(prev => ({ ...prev, code: '', password: '' })); // Reset sensitive fields
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.code) {
      toast.error('请填写完整信息');
      return;
    }

    setLoading(true);
    try {
      await login({
        username: formData.username,
        password: formData.password,
        code: formData.code,
        uuid: uuid
      });
      onOpenChange(false);
    } catch (error) {
      // Error is usually handled by interceptor or logged
      // Refresh captcha on failure
      getCaptcha();
      setFormData(prev => ({ ...prev, code: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>登录系统</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">账号</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              placeholder="请输入账号"
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="请输入密码"
              disabled={loading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">验证码</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="验证码"
                className="flex-1"
                disabled={loading}
              />
              <div 
                className="w-[100px] h-[36px] bg-muted flex items-center justify-center cursor-pointer overflow-hidden rounded border relative"
                onClick={getCaptcha}
                title="点击刷新验证码"
              >
                {codeUrl ? (
                  <img src={codeUrl} alt="验证码" className="w-full h-full object-cover" />
                ) : (
                  <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登录
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
