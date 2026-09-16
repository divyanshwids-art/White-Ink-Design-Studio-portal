import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ClientModal } from '../components/clients/ClientModal';
import {
  Building2,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  FolderKanban,
  Edit2,
  Trash2,
} from 'lucide-react';

interface ClientsPageProps {
  onNavigateToProjects?: (clientId: string) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = user?.role === 'SUPER_ADMIN';

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getClients(search);
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    try {
      await api.deleteClient(deletingClient.id);
      setDeletingClient(null);
      await loadClients();
    } catch (err) {
      console.error('Failed to delete client:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-black flex items-center gap-2.5">
            <Building2 className="h-6 w-6 text-gold-600 stroke-[2.5]" />
            Client Organizations
          </h1>
          <p className="text-sm text-black/70 font-medium mt-1">
            Manage enterprise client accounts, contacts, and contract associations
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditingClient(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-black text-sm font-bold rounded-lg border border-gold-600 shadow-xs transition-colors shrink-0 cursor-pointer btn-hover-lift"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Add Client
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-gold-300 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, contact person, or email..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black placeholder-black/40 focus:outline-hidden focus:ring-2 focus:ring-gold-500 font-medium"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <LoadingSpinner message="Loading client accounts..." />
      ) : clients.length === 0 ? (
        <EmptyState
          title="No clients found"
          description="No client accounts match your search query."
          icon={Building2}
          actionLabel={canManage ? 'Add Client Organization' : undefined}
          onAction={() => {
            setEditingClient(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-gold-300 shadow-sm hover:border-gold-500 transition-all p-5 flex flex-col justify-between space-y-4 card-hover-lift"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gold-100 border border-gold-300 flex items-center justify-center text-gold-700 font-bold shrink-0">
                      <Building2 className="h-5 w-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-black">{client.company}</h3>
                      <p className="text-xs text-black/60 font-semibold">{client.name}</p>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClient(client);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-black/40 hover:text-black hover:bg-gold-100 rounded-md transition-colors cursor-pointer"
                        title="Edit Client"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingClient(client)}
                        className="p-1.5 text-black/40 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete Client"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-xs text-black/70 pt-2 border-t border-gold-200 font-medium">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-gold-600 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gold-600 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gold-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gold-200 flex items-center justify-between text-xs text-black">
                <span className="flex items-center gap-1.5 font-bold">
                  <FolderKanban className="h-3.5 w-3.5 text-gold-600 stroke-[2.5]" />
                  {client.projectCount || 0} Projects associated
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadClients}
        client={editingClient}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingClient)}
        onClose={() => setDeletingClient(null)}
        onConfirm={handleDeleteClient}
        title="Delete Client Organization?"
        message={`Are you sure you want to delete "${deletingClient?.company}"? All associated projects will also be permanently deleted.`}
        isLoading={isDeleting}
      />
    </div>
  );
};
