import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Client } from '../types';
import { Title, Muted, FormLabel } from '../components/typography';
import { User, Mail, Phone, Building2, Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const ClientSettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  // Profile form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [clientRecord, setClientRecord] = useState<Client | null>(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Load current user data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfileImage(user.profileImage || '');
    }
  }, [user]);

  // Load linked client record for phone/company
  useEffect(() => {
    api.getClients().then((clients) => {
      const own = clients[0] ?? null;
      setClientRecord(own);
      if (own) {
        setPhone(own.phone || '');
        setCompany(own.company || '');
      }
    }).catch(() => {});
  }, []);

  // Profile save handler
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileLoading(true);
    setProfileSuccess(null);
    setProfileError(null);
    try {
      await api.updateUser(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        profileImage: profileImage.trim() || undefined,
      });
      if (clientRecord) {
        await api.updateClient(clientRecord.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          company: company.trim() || clientRecord.company,
        });
      }
      await refreshUser();
      setProfileSuccess('Profile updated successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const avatarSrc =
    profileImage ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'User')}`;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div>
        <Title className="text-2xl font-bold tracking-tight text-black">Account Settings</Title>
        <Muted className="text-sm text-neutral-600 mt-1">
          Manage your company profile details and contact information
        </Muted>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white rounded-xl border border-gold-300 shadow-xs">
        <div className="px-6 py-4 border-b border-gold-200">
          <h2 className="text-sm font-bold text-black flex items-center gap-2">
            <User className="h-4 w-4 text-gold-600 stroke-[2.5]" />
            Profile Details
          </h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Update your name, contact info, company, and profile picture
          </p>
        </div>

        <form onSubmit={handleProfileSave} className="p-6 space-y-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <img
              src={avatarSrc}
              alt={name || 'Profile'}
              className="h-16 w-16 rounded-xl border border-gold-300 object-cover shadow-xs bg-gold-50/50"
            />
            <div className="flex-1 min-w-0">
              <FormLabel className="flex items-center gap-1.5 mb-1 text-black font-semibold">
                <Camera className="h-3.5 w-3.5 text-neutral-500" />
                Profile Picture URL
              </FormLabel>
              <input
                type="url"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FormLabel className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gold-600" />
                  Full Name <span className="text-rose-500">*</span>
                </span>
              </FormLabel>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Jonathan Miller"
                className="w-full px-3.5 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
            <div>
              <FormLabel className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gold-600" />
                  Email Address <span className="text-rose-500">*</span>
                </span>
              </FormLabel>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., jonathan@acme.com"
                className="w-full px-3.5 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
          </div>

          {/* Phone + Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FormLabel className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gold-600" />
                  Phone Number
                </span>
              </FormLabel>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +1 (555) 000-0000"
                className="w-full px-3.5 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
            <div>
              <FormLabel className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-gold-600" />
                  Company Name
                </span>
              </FormLabel>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g., Acme Corporation"
                className="w-full px-3.5 py-2 text-sm bg-gold-50/30 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
          </div>

          {/* Feedback */}
          {profileSuccess && (
            <div className="flex items-center gap-2 p-3 text-sm text-black bg-gold-50 border border-gold-300 font-medium rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-700" />
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {profileError}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
