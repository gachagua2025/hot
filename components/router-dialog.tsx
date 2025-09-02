import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, Checkbox, FormControlLabel, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { MikrotikRouter } from '../types'; // Assuming MikrotikRouter type is defined here

interface RouterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  router?: MikrotikRouter | null;
  mode: "create" | "edit";
  providerId?: string; // Add provider ID for auto-assignment
}

export default function RouterDialog({ isOpen, onClose, router, mode, providerId }: RouterDialogProps) {
  const [formData, setFormData] = useState<Omit<MikrotikRouter, '_id' | 'createdAt' | 'updatedAt' | 'providerId'>>({
    name: '',
    address: '',
    login: '',
    password: '',
    port: 8291,
    isActive: true,
  });

  useEffect(() => {
    if (router && mode === 'edit') {
      setFormData({
        name: router.name,
        address: router.address,
        login: router.login,
        password: router.password,
        port: router.port,
        isActive: router.isActive,
      });
    } else {
      setFormData({
        name: '',
        address: '',
        login: '',
        password: '',
        port: 8291,
        isActive: true,
      });
    }
  }, [router, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : newValue,
    }));
  };

  const handleSubmit = useCallback(async () => {
    if (!formData.name || !formData.address || !formData.login || !formData.password) {
      alert('Please fill in all required fields.');
      return;
    }

    const submitData = {
      ...formData,
      isActive: formData.isActive ?? true,
      providerId: providerId || formData.providerId, // Auto-assign to current provider
    };

    try {
      const url = mode === 'create' ? '/api/routers' : `/api/routers/${router?._id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save router');
      }

      alert('Router saved successfully!');
      onClose();
      // Potentially re-fetch data or update state here
    } catch (error) {
      console.error('Error saving router:', error);
      alert((error as Error).message);
    }
  }, [formData, mode, onClose, router?._id, providerId]);

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'Add New Router' : 'Edit Router'}</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Router Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          fullWidth
          required
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          fullWidth
          required
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Login"
          name="login"
          value={formData.login}
          onChange={handleChange}
          fullWidth
          required
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          fullWidth
          required
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Port"
          name="port"
          type="number"
          value={formData.port}
          onChange={handleChange}
          fullWidth
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.isActive}
              onChange={handleChange}
              name="isActive"
            />
          }
          label="Is Active"
          sx={{ mb: 2 }}
        />
        {/* This select would be for super admin to assign a provider,
            or if providerId is passed, it can be auto-filled or hidden.
            For provider role, this field might not be shown if providerId is already known. */}
        {mode === 'create' && !providerId && (
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              label="Provider"
              name="providerId"
              value={formData.providerId || ''}
              onChange={handleChange}
            >
              <MenuItem value="">Select Provider</MenuItem>
              {/* Placeholder for provider list, fetched from an API */}
              {/* Example: providers.map(p => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>) */}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} color="primary" variant="contained">
          {mode === 'create' ? 'Add Router' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}