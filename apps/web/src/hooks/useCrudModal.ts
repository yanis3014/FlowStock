'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface UseCrudModalOptions<T extends { id: string }, F> {
  itemToForm: (item: T) => F;
  defaultForm: F;
  validateForm?: (form: F) => string | null;
  onCreate: (form: F) => Promise<void>;
  onUpdate: (id: string, form: F) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  messages?: {
    created?: string;
    updated?: string;
    deleted?: string;
    createError?: string;
    updateError?: string;
    deleteError?: string;
  };
}

export function useCrudModal<T extends { id: string }, F>({
  itemToForm,
  defaultForm,
  validateForm,
  onCreate,
  onUpdate,
  onDelete,
  messages = {},
}: UseCrudModalOptions<T, F>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [form, setForm] = useState<F>(defaultForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setForm(defaultForm);
    setModalOpen(true);
  }, [defaultForm]);

  const openEdit = useCallback(
    (item: T) => {
      setEditingItem(item);
      setForm(itemToForm(item));
      setModalOpen(true);
    },
    [itemToForm]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingItem(null);
    setForm(defaultForm);
  }, [defaultForm]);

  const handleSubmit = useCallback(async () => {
    if (validateForm) {
      const err = validateForm(form);
      if (err) {
        toast.error(err);
        return;
      }
    }
    setSubmitLoading(true);
    try {
      if (editingItem) {
        await onUpdate(editingItem.id, form);
        toast.success(messages.updated ?? 'Modifications sauvegardées.');
      } else {
        await onCreate(form);
        toast.success(messages.created ?? 'Élément créé avec succès.');
      }
      closeModal();
    } catch (err) {
      const errorMsg = editingItem
        ? (messages.updateError ?? 'Erreur lors de la modification.')
        : (messages.createError ?? 'Erreur lors de la création.');
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  }, [editingItem, form, validateForm, onCreate, onUpdate, closeModal, messages]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      await onDelete(deleteConfirmId);
      toast.success(messages.deleted ?? 'Élément supprimé.');
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error(messages.deleteError ?? 'Erreur lors de la suppression.');
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteConfirmId, onDelete, messages]);

  return {
    modalOpen,
    editingItem,
    form,
    setForm,
    submitLoading,
    deleteConfirmId,
    setDeleteConfirmId,
    deleteLoading,
    openCreate,
    openEdit,
    closeModal,
    handleSubmit,
    handleDeleteConfirm,
    isEditing: editingItem !== null,
  };
}
