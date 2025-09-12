import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Navigation from '@/components/Navigation';
import { toast } from '@/hooks/use-toast';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Key, 
  Trash2, 
  Mail,
  Smartphone,
  Globe,
  Eye,
  EyeOff,
  AlertTriangle,
  Save
} from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    capsuleReminders: true,
    connectionRequests: true,
    weeklyDigest: false,
    
    // Privacy
    profileVisibility: 'connections', // 'public', 'connections', 'private'
    allowSearch: true,
    showOnlineStatus: true,
    capsulePreview: false,
    
    // Security
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: '30', // minutes
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved!",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Password updated!",
      description: "Your password has been changed successfully.",
    });
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion requested",
      description: "This feature would require additional confirmation steps.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and privacy settings
          </p>
        </div>

        <div className="space-y-8">
          {/* Notifications */}
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-primary" />
                <span>Notifications</span>
              </CardTitle>
              <CardDescription>
                Choose how you want to be notified about your time capsules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates via email about your capsules
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(value) => handleSettingChange('emailNotifications', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get instant notifications on your devices
                  </p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(value) => handleSettingChange('pushNotifications', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Capsule Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded before your capsules unlock
                  </p>
                </div>
                <Switch
                  checked={settings.capsuleReminders}
                  onCheckedChange={(value) => handleSettingChange('capsuleReminders', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Connection Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when someone wants to connect
                  </p>
                </div>
                <Switch
                  checked={settings.connectionRequests}
                  onCheckedChange={(value) => handleSettingChange('connectionRequests', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Weekly summary of your time capsule activity
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyDigest}
                  onCheckedChange={(value) => handleSettingChange('weeklyDigest', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-secondary" />
                <span>Privacy</span>
              </CardTitle>
              <CardDescription>
                Control who can see your profile and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-foreground">Profile Visibility</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Who can view your profile information
                </p>
                <div className="space-y-2">
                  {[
                    { value: 'public', label: 'Public', desc: 'Anyone can view your profile' },
                    { value: 'connections', label: 'Connections Only', desc: 'Only your connections can view' },
                    { value: 'private', label: 'Private', desc: 'Only you can view your profile' },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id={option.value}
                        name="profileVisibility"
                        value={option.value}
                        checked={settings.profileVisibility === option.value}
                        onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
                        className="w-4 h-4 text-primary"
                      />
                      <div>
                        <Label htmlFor={option.value} className="text-foreground font-medium">
                          {option.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{option.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Allow Search</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others find you by email or username
                  </p>
                </div>
                <Switch
                  checked={settings.allowSearch}
                  onCheckedChange={(value) => handleSettingChange('allowSearch', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Show Online Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Display when you're active on Forá
                  </p>
                </div>
                <Switch
                  checked={settings.showOnlineStatus}
                  onCheckedChange={(value) => handleSettingChange('showOnlineStatus', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Capsule Preview</Label>
                  <p className="text-sm text-muted-foreground">
                    Show capsule previews to recipients before unlock
                  </p>
                </div>
                <Switch
                  checked={settings.capsulePreview}
                  onCheckedChange={(value) => handleSettingChange('capsulePreview', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-accent" />
                <span>Security</span>
              </CardTitle>
              <CardDescription>
                Protect your account with additional security measures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(value) => handleSettingChange('twoFactorAuth', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Login Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified of new login attempts
                  </p>
                </div>
                <Switch
                  checked={settings.loginAlerts}
                  onCheckedChange={(value) => handleSettingChange('loginAlerts', value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Session Timeout</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Automatically log out after period of inactivity
                </p>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', e.target.value)}
                  className="w-full px-3 py-2 bg-input rounded-md border border-border text-foreground"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="border-border bg-input pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-border bg-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-border bg-input"
                />
              </div>

              <Button 
                onClick={handlePasswordChange}
                className="bg-gradient-primary hover-glow"
              >
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <span>Danger Zone</span>
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Delete Account</AlertTitle>
                <AlertDescription className="mb-4">
                  Once you delete your account, there is no going back. All your time capsules, 
                  connections, and data will be permanently removed.
                </AlertDescription>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </Alert>
            </CardContent>
          </Card>

          {/* Save Settings */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              className="bg-gradient-primary hover-glow shadow-glow"
            >
              <Save className="w-4 h-4 mr-2" />
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;