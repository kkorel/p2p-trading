'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut, User, Mail, Shield, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';
import { Card, Button, Input, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const handleSaveProfile = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      const result = await authApi.updateProfile(data);
      updateUser(result.user);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell title="Profile">
      <div className="flex flex-col gap-4">
        {/* Profile Header */}
        <Card>
          <div className="flex items-center gap-4">
            {user.picture ? (
              <Image
                src={user.picture}
                alt={user.name || 'Avatar'}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center">
                <span className="text-2xl font-semibold text-[var(--color-primary)]">
                  {user.name?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                {user.name || 'No name set'}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
            </div>
          </div>
        </Card>

        {/* Edit Profile */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--color-text)]">
              Profile Information
            </h3>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(handleSaveProfile)} className="flex flex-col gap-4">
              <Input
                label="Display Name"
                {...register('name')}
                error={errors.name?.message}
                leftIcon={<User className="h-4 w-4" />}
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" fullWidth loading={isSaving}>
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 py-2">
                <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                <div className="flex-1">
                  <p className="text-xs text-[var(--color-text-muted)]">Name</p>
                  <p className="text-sm text-[var(--color-text)]">
                    {user.name || 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2 border-t border-[var(--color-border)]">
                <Mail className="h-4 w-4 text-[var(--color-text-muted)]" />
                <div className="flex-1">
                  <p className="text-xs text-[var(--color-text-muted)]">Email</p>
                  <p className="text-sm text-[var(--color-text)]">{user.email}</p>
                </div>
                <Badge variant="success" size="sm">Verified</Badge>
              </div>
            </div>
          )}
        </Card>

        {/* Account Status */}
        <Card>
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-3">
            Account Status
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="text-sm text-[var(--color-text)]">Profile Complete</span>
              </div>
              <Badge variant={user.profileComplete ? 'success' : 'warning'}>
                {user.profileComplete ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="text-sm text-[var(--color-text)]">Seller Profile</span>
              </div>
              <Badge variant={user.providerId ? 'success' : 'default'}>
                {user.providerId ? 'Active' : 'Not set up'}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Logout */}
        <Button
          variant="danger"
          fullWidth
          onClick={logout}
          className="mt-4"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </AppShell>
  );
}
