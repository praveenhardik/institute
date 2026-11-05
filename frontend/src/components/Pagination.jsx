import React from 'react';

/**
 * Standard 10-item Pagination Bar
 * Matches the required UI: [← Prev] [1] [2] ... [Next →]
 * - Disabled Prev on page 1
 * - Disabled Next on final page (cannot navigate beyond total pages)
 * - Exact rounded pill styling with purple active state
 */
export const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  itemLabel = 'students'
}) => {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Generate page numbers
  const getPageNumbers = () => {
    if (totalPages <= 15) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    // For large page counts (>15), show a focused window around activePage
    const pages = new Set();
    pages.add(1);
    pages.add(2);
    pages.add(totalPages - 1);
    pages.add(totalPages);
    for (let p = Math.max(1, activePage - 3); p <= Math.min(totalPages, activePage + 3); p++) {
      pages.add(p);
    }
    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        result.push('...');
      }
      result.push(sorted[i]);
    }
    return result;
  };

  const pageNumbers = getPageNumbers();
  const isFinalPage = activePage >= totalPages;
  const isFirstPage = activePage <= 1;

  return (
    <div
      className="pagination-wrapper"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        marginTop: '12px',
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(8px)',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
      }}
    >
      {/* Items count summary */}
      <div style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>
        Showing <span style={{ color: '#1e293b', fontWeight: 700 }}>{startIndex + 1}–{endIndex}</span> of{' '}
        <span style={{ color: '#1e293b', fontWeight: 700 }}>{totalItems}</span> {itemLabel}
        {totalPages > 1 && (
          <span style={{ marginLeft: '8px', color: '#64748b' }}>
            (Page {activePage} of {totalPages})
          </span>
        )}
      </div>

      {/* Navigation Buttons: [← Prev] [1] [2] ... [Next →] */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap'
        }}
      >
        {/* ← Prev Button */}
        <button
          type="button"
          className="pagination-btn-nav"
          onClick={() => onPageChange && onPageChange(Math.max(1, activePage - 1))}
          disabled={isFirstPage}
          style={{
            padding: '6px 14px',
            fontSize: '0.84rem',
            fontWeight: 700,
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            background: isFirstPage ? '#f3f4f6' : '#ffffff',
            color: isFirstPage ? '#9ca3af' : '#1e293b',
            cursor: isFirstPage ? 'not-allowed' : 'pointer',
            opacity: isFirstPage ? 0.45 : 1,
            pointerEvents: isFirstPage ? 'none' : 'auto',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title={isFirstPage ? 'First page' : 'Go to previous page'}
        >
          ← Prev
        </button>

        {/* Page Numbers */}
        {pageNumbers.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: '0 6px',
                  color: '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                …
              </span>
            );
          }

          const isActive = p === activePage;

          return (
            <button
              key={p}
              type="button"
              className={`pagination-btn-num ${isActive ? 'active' : ''}`}
              onClick={() => onPageChange && onPageChange(p)}
              style={{
                minWidth: '34px',
                height: '34px',
                padding: '0 8px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: isActive ? '1.5px solid #5c67f2' : '1px solid #cbd5e1',
                background: isActive ? '#5c67f2' : '#ffffff',
                color: isActive ? '#ffffff' : '#1e293b',
                boxShadow: isActive ? '0 2px 6px rgba(92, 103, 242, 0.35)' : 'none',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={`Page ${p}`}
            >
              {p}
            </button>
          );
        })}

        {/* Next → Button (Disabled and cannot be clicked on final page) */}
        <button
          type="button"
          className="pagination-btn-nav"
          onClick={() => onPageChange && onPageChange(Math.min(totalPages, activePage + 1))}
          disabled={isFinalPage}
          style={{
            padding: '6px 14px',
            fontSize: '0.84rem',
            fontWeight: 700,
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            background: isFinalPage ? '#f3f4f6' : '#ffffff',
            color: isFinalPage ? '#9ca3af' : '#1e293b',
            cursor: isFinalPage ? 'not-allowed' : 'pointer',
            opacity: isFinalPage ? 0.45 : 1,
            pointerEvents: isFinalPage ? 'none' : 'auto',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title={isFinalPage ? 'Final page reached - cannot go next' : 'Go to next page'}
        >
          Next →
        </button>
      </div>
    </div>
  );
};
