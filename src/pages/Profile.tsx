import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Camera, 
  Save, 
  Loader2, 
  ArrowLeft, 
  Shield, 
  Calendar, 
  Mail, 
  Crown,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ShareReferralButton } from '@/components/ShareReferralButton';

interface ProfileData {
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  plan: string;
  referral_code: string;
  is_admin: boolean;
  created_at: string;
}

interface Stats {
  signalsReceived: number;
  referralsCount: number;
}

export default function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { effectivePlan, isAdmin } = useUserPlan();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ signalsReceived: 0, referralsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData as ProfileData);
        setUsername(profileData.username || '');
        setBio(profileData.bio || '');
        setAvatarUrl(profileData.avatar_url);
      }

      // Load stats
      const { count: signalsCount } = await supabase
        .from('user_signals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: referralsCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_user_id', user.id)
        .eq('status', 'approved');

      setStats({
        signalsReceived: signalsCount || 0,
        referralsCount: referralsCount || 0,
      });

      setLoading(false);
    }

    loadProfile();
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('profile.uploadError'),
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t('profile.uploadError'),
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add timestamp to bust cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithTimestamp);

      // Update profile
      await supabase
        .from('profiles')
        .update({ avatar_url: urlWithTimestamp, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      toast({
        title: t('common.success'),
        description: t('profile.avatarUpdated'),
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t('profile.uploadError'),
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate username
    if (username && (username.length < 3 || username.length > 20)) {
      toast({
        title: t('common.error'),
        description: t('profile.usernameHint'),
        variant: 'destructive',
      });
      return;
    }

    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      toast({
        title: t('common.error'),
        description: t('profile.usernameHint'),
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username || null,
          bio: bio || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: t('common.error'),
            description: t('profile.usernameExists'),
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: t('common.success'),
          description: t('profile.saved'),
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: t('common.error'),
        description: t('profile.error'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (username) return username.slice(0, 2).toUpperCase();
    if (profile?.email) return profile.email.slice(0, 2).toUpperCase();
    return 'U';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
            <p className="text-muted-foreground">{t('profile.subtitle')}</p>
          </div>
        </div>

        {/* Avatar Section */}
        <Card className="glass border-border/50 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {username ? `@${username}` : profile?.email}
                </p>
                <Badge variant="outline" className="mt-1 capitalize">
                  <Crown className="h-3 w-3 mr-1" />
                  {effectivePlan} {t('dashboard.plan')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card className="glass border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile.editProfile')}
            </CardTitle>
            <CardDescription>{t('profile.editProfileDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('profile.username')}</Label>
              <Input
                id="username"
                placeholder={t('profile.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">{t('profile.usernameHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">{t('profile.bio')}</Label>
              <Textarea
                id="bio"
                placeholder={t('profile.bioPlaceholder')}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {bio.length}/160 {t('profile.bioHint')}
              </p>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full gradient-primary text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('profile.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('profile.saveChanges')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="glass border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('profile.accountInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('profile.email')}</span>
              <span className="font-medium">{profile?.email}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('profile.plan')}</span>
              <Badge variant="outline" className="capitalize">{effectivePlan}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('profile.referralCode')}</span>
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {profile?.referral_code}
              </code>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('profile.memberSince')}</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {profile?.created_at && format(new Date(profile.created_at), 'MMM yyyy')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="glass border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('profile.stats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{stats.signalsReceived}</p>
                <p className="text-sm text-muted-foreground">{t('profile.signalsReceived')}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{stats.referralsCount}</p>
                <p className="text-sm text-muted-foreground">{t('profile.referrals')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Share Referral */}
        {profile?.referral_code && (
          <div className="mb-6">
            <ShareReferralButton 
              referralCode={profile.referral_code} 
              referralsCount={stats.referralsCount}
            />
          </div>
        )}

        {/* Admin Link */}
        {isAdmin && (
          <Card className="glass border-primary/30">
            <CardContent className="py-4">
              <Link 
                to="/admin" 
                className="flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{t('nav.admin')}</p>
                    <p className="text-sm text-muted-foreground">{t('profile.adminAccess')}</p>
                  </div>
                </div>
                <ArrowLeft className="h-5 w-5 rotate-180" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
