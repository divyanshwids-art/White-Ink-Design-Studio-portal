import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Client } from '../../types';
import { api } from '../../services/api';
import { CheckCircle2, Copy, Check, Eye, EyeOff, KeyRound } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  client,
}) => {
  const isEditing = Boolean(client);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-time credential display state
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    company: string;
    email: string;
    plaintextPassword: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setCompany(client.company || '');
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setAddress(client.address || '');
    } else {
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setAddress('');
    }
    setError(null);
    setCreatedCredentials(null);
    setIsCopied(false);
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim() || !email.trim()) {
      setError('Contact name, company name, and email are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && client) {
        await api.updateClient(client.id, {
          name: name.trim(),
          company: company.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        });
        onSuccess();
        onClose();
      } else {
        const res = await api.createClientWithLogin({
          name: name.trim(),
          company: company.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        });

        if (res.generatedPassword) {
          setCreatedCredentials({
            name: res.name,
            company: res.company,
            email: res.loginEmail || res.email,
            plaintextPassword: res.generatedPassword,
          });
          onSuccess();
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save client organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `White Ink Portal Client Login Credentials\nCompany: ${createdCredentials.company}\nContact: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.plaintextPassword}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleModalClose = () => {
    setCreatedCredentials(null);
    onClose();
  };

  // If credentials have just been generated, display the one-time credential modal view
  if (createdCredentials) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="Client Created Successfully"
        subtitle="Auto-generated login credentials"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 font-medium leading-relaxed">
              The client organization and Client Admin login account have been created successfully. The password below has been generated for their initial login.
            </div>
          </div>

          <div className="bg-gold-50/50 p-4 rounded-xl border border-gold-300 space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                Company / Organization
              </label>
              <div className="font-bold text-black text-sm">{createdCredentials.company}</div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                Contact Person
              </label>
              <div className="font-semibold text-black text-sm">{createdCredentials.name}</div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                Login Email
              </label>
              <div className="font-mono text-sm text-black bg-white px-3 py-1.5 rounded-lg border border-gold-200 select-all">
                {createdCredentials.email}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                Auto-Generated Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  readOnly
                  value={createdCredentials.plaintextPassword}
                  className="w-full font-mono text-base font-bold bg-white px-3 py-2 pr-10 rounded-lg border border-gold-400 text-black focus:outline-none select-all tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-1 cursor-pointer"
                  title={showPassword ? 'Mask password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gold-100/70 border border-gold-300 rounded-xl flex items-center gap-2.5 text-xs text-black font-medium">
            <KeyRound className="h-4 w-4 text-gold-800 shrink-0" />
            <span>
              These credentials are also stored in the <strong>Credentials Vault</strong> so you can retrieve or rotate them anytime.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer btn-hover-lift shadow-xs"
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {isCopied ? 'Copied to Clipboard!' : 'Copy Credentials'}
            </button>
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 text-xs font-semibold text-black bg-white border border-gold-300 hover:bg-gold-50 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Client Organization' : 'Add New Client'}
      subtitle={isEditing ? 'Update client contact details and company profile' : 'Register a new client company and auto-provision client login'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Company / Organization Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g., Acme Corporation"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Primary Contact Person <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Marcus Brody"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Email Address (Login Username) <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., client@demo.com"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Phone Number <span className="text-rose-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., +1 (555) 234-5678"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Office Address
          </label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 100 Innovation Way, Suite 400, San Francisco, CA"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>

        {!isEditing && (
          <div className="p-3 bg-gold-50/70 border border-gold-200 rounded-xl flex items-center gap-2.5 text-xs text-black/80 font-medium">
            <KeyRound className="h-4 w-4 text-gold-700 shrink-0" />
            <span>
              A Client Admin account with auto-generated secure credentials will be created immediately.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gold-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-bold text-black bg-gold-100 hover:bg-gold-200 border border-gold-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 shadow-xs cursor-pointer btn-hover-lift"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Client' : 'Add Client & Create Login'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
