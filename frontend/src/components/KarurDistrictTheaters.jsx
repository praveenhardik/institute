import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../api/api';
import { useAlert } from '../context/AlertContext';

export const KarurDistrictTheaters = () => {
  const { showAlert } = useAlert();

  const [theaters, setTheaters] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTheater, setSelectedTheater] = useState(null); // Click to view full details
  const [editingOwner, setEditingOwner] = useState(null); // Edit owner full details
  const [editingTheater, setEditingTheater] = useState(null);

  // Search / filter
  const [filterQuery, setFilterQuery] = useState('');

  // Add Theater Form State
  const [newTheater, setNewTheater] = useState({
    name: '',
    location: '',
    phone: '',
    email: '',
    screens: 2,
    capacity: 650,
    sound_system: 'Dolby Atmos 7.1',
    projection_type: '4K RGB Laser',
    owner_name: ''
  });
  const [addLoading, setAddLoading] = useState(false);

  // Edit Owner Form State
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    phone: '',
    email: '',
    contact_location: '',
    theater_name: ''
  });
  const [editOwnerLoading, setEditOwnerLoading] = useState(false);

  // Load theaters and owners
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tRes, oRes] = await Promise.all([
        API.getTheaters().catch(() => ({ theaters: [] })),
        API.getTheaterOwners().catch(() => ({ owners: [] }))
      ]);
      setTheaters(tRes.theaters || []);
      setOwners(oRes.owners || []);
    } catch (err) {
      console.warn('Failed to load theaters or owners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Theater Submit
  const handleAddTheaterSubmit = async (e) => {
    e.preventDefault();
    if (!newTheater.name.trim() || !newTheater.phone.trim() || !newTheater.location.trim()) {
      showAlert('Theater Name, Phone Number, and Location are mandatory', 'danger');
      return;
    }

    try {
      setAddLoading(true);
      const res = await API.addTheater({
        ...newTheater,
        district: 'Karur',
        screens: Number(newTheater.screens) || 1,
        capacity: Number(newTheater.capacity) || 500
      });

      showAlert(res.message || `Theater "${newTheater.name}" added successfully!`, 'success');
      setShowAddModal(false);
      setNewTheater({
        name: '',
        location: '',
        phone: '',
        email: '',
        screens: 2,
        capacity: 650,
        sound_system: 'Dolby Atmos 7.1',
        projection_type: '4K RGB Laser',
        owner_name: ''
      });
      loadData();
    } catch (err) {
      showAlert(err.message || 'Failed to add theater', 'danger');
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Owner Modal
  const handleOpenEditOwner = (owner) => {
    setEditingOwner(owner);
    setOwnerForm({
      name: owner.name || '',
      phone: owner.phone || '',
      email: owner.email || '',
      contact_location: owner.contact_location || '',
      theater_name: owner.theater_name || ''
    });
  };

  // Handle Edit Owner Submit
  const handleEditOwnerSubmit = async (e) => {
    e.preventDefault();
    if (!editingOwner) return;

    if (!ownerForm.name.trim() || !ownerForm.phone.trim() || !ownerForm.email.trim() || !ownerForm.contact_location.trim()) {
      showAlert('All fields (Name, Mobile Number, Mail ID, Contact Location / Cabin) are required', 'danger');
      return;
    }

    try {
      setEditOwnerLoading(true);
      const res = await API.updateTheaterOwner(editingOwner.id, {
        name: ownerForm.name.trim(),
        phone: ownerForm.phone.trim(),
        email: ownerForm.email.trim(),
        contact_location: ownerForm.contact_location.trim(),
        theater_name: ownerForm.theater_name.trim()
      });

      showAlert(res.message || `Theater owner "${ownerForm.name}" updated successfully!`, 'success');
      setEditingOwner(null);

      // Update state locally
      setOwners(prev => prev.map(o => (o.id === editingOwner.id ? { ...o, ...ownerForm } : o)));

      // Also update matching theater's owner_name if applicable
      if (ownerForm.theater_name) {
        setTheaters(prev => prev.map(t => (t.name === ownerForm.theater_name ? { ...t, owner_name: ownerForm.name } : t)));
      }
      loadData();
    } catch (err) {
      showAlert(err.message || 'Failed to update owner details', 'danger');
    } finally {
      setEditOwnerLoading(false);
    }
  };

  // Filtered theaters
  const filteredTheaters = theaters.filter(t => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.location && t.location.toLowerCase().includes(q)) ||
      (t.owner_name && t.owner_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="karur-theaters-container" style={{ padding: '4px 0' }}>
      {/* Top Banner / District Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#ffffff',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(49, 46, 129, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.6rem' }}>🎬</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '20px' }}>
              Karur District Administration
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '4px 0 6px 0', letterSpacing: '-0.5px' }}>
            Karur District Theatres & Cinemas Management
          </h1>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#e0e7ff', maxWidth: '640px', lineHeight: 1.5 }}>
            Centralized admin control for all cinema theaters located across Karur District. Oversee theaters, review technical specifications, and manage theater owners and executive cabin locations.
          </p>
        </div>

        {/* Primary Action Button: Add Theater */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            id="btn-add-theater"
            onClick={() => setShowAddModal(true)}
            style={{
              background: '#22c55e',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '0.96rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>➕</span> Add Theater
          </button>
        </div>
      </div>

      {/* Quick Summary Stat Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(67, 56, 202, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#4338ca' }}>
            🏛️
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Total Theaters in Karur</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>{theaters.length} Theaters</div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#10b981' }}>
            👔
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Theater Owners</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>{owners.length} Registered</div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#f59e0b' }}>
            💺
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Total Seating Capacity</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
              {theaters.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0).toLocaleString()} Seats
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: ALL THEATERS AVAILABLE IN KARUR */}
      <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '14px', padding: '22px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎥</span> Theaters Available in Karur District
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary, #64748b)' }}>
              Click any theater card below to view its full contact details, phone number, screens, and audio-visual specifications.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search theaters by name, location, phone..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                fontSize: '0.88rem',
                minWidth: '260px'
              }}
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading Karur district theaters...
          </div>
        ) : filteredTheaters.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: '10px' }}>
            No theaters found matching "{filterQuery}". Click "Add Theater" to add one!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            {filteredTheaters.map((theater) => (
              <div
                key={theater.id}
                onClick={() => setSelectedTheater(theater)}
                style={{
                  border: '1.5px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '18px',
                  background: 'var(--bg-secondary, #f8fafc)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-color, #e2e8f0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                    {theater.name}
                  </h3>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534' }}>
                    {theater.status || 'Active'}
                  </span>
                </div>

                <div style={{ fontSize: '0.84rem', color: '#4338ca', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span>📞 Phone:</span>
                  <a
                    href={`tel:${theater.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: '#4338ca', textDecoration: 'none' }}
                  >
                    {theater.phone}
                  </a>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', marginBottom: '12px', lineHeight: 1.4, minHeight: '36px' }}>
                  📍 {theater.location}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '0.78rem' }}>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    🎬 {theater.screens} {theater.screens === 1 ? 'Screen' : 'Screens'}
                  </span>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    💺 {theater.capacity} Seats
                  </span>
                  <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    🔊 {theater.sound_system || 'Dolby 7.1'}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)' }}>
                    Owner: <strong style={{ color: 'var(--text-primary)' }}>{theater.owner_name || 'Assigned'}</strong>
                  </div>
                  <span style={{ fontSize: '0.80rem', color: '#4338ca', fontWeight: 700, textDecoration: 'underline' }}>
                    View Full Details →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: THEATER OWNERS DIRECTORY (BELOW THE ADMIN & THEATERS) */}
      <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '14px', padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👔</span> Theater Owners Directory
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary, #64748b)' }}>
              All theater owners available below admin. Admin can review full owner details and edit their Name, Mobile Number, Mail ID, and Contact Location (Cabin).
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading theater owners...
          </div>
        ) : owners.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No theater owners registered yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '2px solid var(--border-color, #cbd5e1)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Owner Name</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Mobile Number</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Mail ID</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Contact Location (Theater Cabin)</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Associated Theater</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Admin Action</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                          {owner.name.charAt(0)}
                        </div>
                        <span>{owner.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#1d4ed8', fontWeight: 600 }}>
                      <a href={`tel:${owner.phone}`} style={{ color: '#1d4ed8', textDecoration: 'none' }}>
                        📞 {owner.phone}
                      </a>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      <a href={`mailto:${owner.email}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                        ✉️ {owner.email}
                      </a>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem' }}>
                        🚪 {owner.contact_location}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#4338ca' }}>
                      🎬 {owner.theater_name || 'Karur Theater'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditOwner(owner)}
                        style={{
                          background: '#4338ca',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(67, 56, 202, 0.2)'
                        }}
                      >
                        ✏️ Edit Owner Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL 1: VIEW THEATER FULL DETAILS --- */}
      {selectedTheater && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedTheater(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#4338ca' }}>
                  Karur District Theater Details
                </span>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--text-primary, #0f172a)' }}>
                  {selectedTheater.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTheater(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            {/* Prominent Phone Number Box as requested by user */}
            <div
              style={{
                background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
                border: '1.5px solid #c7d2fe',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3730a3', textTransform: 'uppercase' }}>
                  Official Theater Phone Number
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e1b4b', marginTop: '2px' }}>
                  📞 {selectedTheater.phone}
                </div>
              </div>
              <a
                href={`tel:${selectedTheater.phone}`}
                style={{
                  background: '#4338ca',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(67, 56, 202, 0.3)'
                }}
              >
                Click to Call
              </a>
            </div>

            {/* Detailed Spec List */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>DISTRICT / CITY</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Karur, Tamil Nadu</div>
              </div>

              <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>EMAIL ADDRESS</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedTheater.email || 'info@karurtheatres.gov.in'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL SCREENS</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  🎬 {selectedTheater.screens} Screens
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>SEATING CAPACITY</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  💺 {selectedTheater.capacity} Total Seats
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>SOUND SYSTEM</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>
                  🔊 {selectedTheater.sound_system || 'Dolby Atmos 7.1'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PROJECTION SYSTEM</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0284c7' }}>
                  📽️ {selectedTheater.projection_type || '4K RGB Laser'}
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary, #f8fafc)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>FULL ADDRESS & LOCATION</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                📍 {selectedTheater.location}
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>THEATER OWNER / MANAGEMENT</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                👤 {selectedTheater.owner_name || 'Owner details available below in Owners Directory'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedTheater(null)}
                style={{
                  background: 'var(--btn-secondary-bg, #e2e8f0)',
                  color: 'var(--text-primary, #0f172a)',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD THEATER MODAL --- */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '16px',
              maxWidth: '580px',
              width: '100%',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                ➕ Add New Theater in Karur District
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTheaterSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                  Theater Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sri Venkateshwara Cinema"
                  value={newTheater.name}
                  onChange={(e) => setNewTheater({ ...newTheater, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                    Phone Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 04324-224455"
                    value={newTheater.phone}
                    onChange={(e) => setNewTheater({ ...newTheater, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. contact@theater.com"
                    value={newTheater.email}
                    onChange={(e) => setNewTheater({ ...newTheater, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                  Location & Address in Karur <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 15 Sengunthapuram Main Road, Near Bus Stand, Karur - 639002"
                  value={newTheater.location}
                  onChange={(e) => setNewTheater({ ...newTheater, location: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                    Number of Screens
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    value={newTheater.screens}
                    onChange={(e) => setNewTheater({ ...newTheater, screens: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                    Total Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="10"
                    className="form-input"
                    value={newTheater.capacity}
                    onChange={(e) => setNewTheater({ ...newTheater, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                    Sound System
                  </label>
                  <select
                    className="form-select"
                    value={newTheater.sound_system}
                    onChange={(e) => setNewTheater({ ...newTheater, sound_system: e.target.value })}
                  >
                    <option value="Dolby Atmos 7.1">Dolby Atmos 7.1</option>
                    <option value="Dolby Atmos 64-Channel">Dolby Atmos 64-Channel</option>
                    <option value="Dolby 7.1 Surround">Dolby 7.1 Surround</option>
                    <option value="DTS:X Surround">DTS:X Surround</option>
                    <option value="Qube 7.1 Sound">Qube 7.1 Sound</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                    Projection System
                  </label>
                  <select
                    className="form-select"
                    value={newTheater.projection_type}
                    onChange={(e) => setNewTheater({ ...newTheater, projection_type: e.target.value })}
                  >
                    <option value="4K RGB Laser">4K RGB Laser</option>
                    <option value="Christie 4K Laser">Christie 4K Laser</option>
                    <option value="Barco 4K Laser">Barco 4K Laser</option>
                    <option value="Sony 4K Digital">Sony 4K Digital</option>
                    <option value="Qube 2K Digital">Qube 2K Digital</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                  Assigned Owner Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. S. Ramanathan"
                  value={newTheater.owner_name}
                  onChange={(e) => setNewTheater({ ...newTheater, owner_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  style={{
                    background: '#22c55e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  {addLoading ? 'Adding...' : '✓ Add Theater to Karur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: EDIT THEATER OWNER FULL DETAILS --- */}
      {editingOwner && (
        <div
          className="modal-overlay"
          onClick={() => setEditingOwner(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '16px',
              maxWidth: '540px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#4338ca' }}>
                  Admin Theater Management
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>
                  ✏️ Edit Theater Owner Details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingOwner(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditOwnerSubmit}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                  Owner Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={ownerForm.name}
                  onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                  placeholder="e.g. R. Shanmugam"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                  Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={ownerForm.phone}
                  onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                  placeholder="e.g. +91 98424 12345"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                  Mail ID <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={ownerForm.email}
                  onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                  placeholder="e.g. shanmugam.ajantha@gmail.com"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                  Contact Location (e.g. Theater Cabin) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={ownerForm.contact_location}
                  onChange={(e) => setOwnerForm({ ...ownerForm, contact_location: e.target.value })}
                  placeholder="e.g. Ajantha Theatre Main Office Cabin, Karur"
                  required
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Specified location cabin (e.g. Theater name cabin)
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.86rem' }}>
                  Associated Theater
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={ownerForm.theater_name}
                  onChange={(e) => setOwnerForm({ ...ownerForm, theater_name: e.target.value })}
                  placeholder="e.g. Ajantha Theatre"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingOwner(null)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editOwnerLoading}
                  style={{
                    background: '#4338ca',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(67, 56, 202, 0.3)'
                  }}
                >
                  {editOwnerLoading ? 'Saving...' : '✓ Save Owner Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
