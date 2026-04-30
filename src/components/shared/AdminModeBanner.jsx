import React from 'react';
import { ShieldAlert, Eye, MapPin, X } from 'lucide-react';
import { useAdminMode } from '@/components/hooks/useAdminMode';

export default function AdminModeBanner({ workshop }) {
  const { isAdminMode, exitAdminMode } = useAdminMode();

  if (!isAdminMode || !workshop) return null;

  const clientName = workshop.name || 'Cliente';
  const location = workshop.city && workshop.state ? `${workshop.city}/${workshop.state}` : null;

  return (
    <>
      <style>{`
        @keyframes admin-shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes admin-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.35); opacity: 0; }
        }
        .admin-bar-shine {
          animation: admin-shine 6s ease-in-out infinite;
        }
        .admin-bar-pulse {
          animation: admin-pulse 2s ease-in-out infinite;
        }
        .admin-exit-btn .admin-exit-icon {
          transition: transform 300ms cubic-bezier(0.2,0.8,0.2,1);
        }
        .admin-exit-btn:hover .admin-exit-icon {
          transform: rotate(90deg);
        }
        .admin-exit-btn {
          transition: all 200ms cubic-bezier(0.2,0.8,0.2,1);
          background: rgba(255,255,255,0.10);
          color: #FFFFFF;
          border: 1px solid rgba(255,255,255,0.30);
        }
        .admin-exit-btn:hover {
          background: rgba(255,255,255,0.95);
          color: hsl(18 92% 52%);
          border-color: #FFFFFF;
          box-shadow: 0 4px 10px -2px rgba(0,0,0,0.15);
        }
        .admin-exit-btn:focus-visible {
          outline: 2px solid #FFFFFF;
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-bar-shine, .admin-bar-pulse {
            animation: none;
          }
          .admin-exit-btn .admin-exit-icon {
            transition: none;
          }
        }
      `}</style>

      <div
        role="status"
        aria-live="polite"
        className="relative overflow-hidden print:hidden"
        style={{
          height: '48px',
          background: 'linear-gradient(90deg, hsl(18 92% 52%) 0%, hsl(22 95% 56%) 55%, hsl(28 96% 60%) 100%)',
          boxShadow: '0 6px 20px -8px hsl(18 92% 40% / 0.55), inset 0 1px 0 0 rgba(255,255,255,0.18), inset 0 -1px 0 0 hsl(18 92% 30% / 0.4)',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          zIndex: 50,
        }}
      >
        {/* Diagonal pattern overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(45deg, #FFFFFF 0, #FFFFFF 1px, transparent 1px, transparent 12px)',
            opacity: 0.08,
          }}
        />

        {/* Shine overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none admin-bar-shine"
          style={{
            background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%)',
            opacity: 0.6,
          }}
        />

        {/* Content */}
        <div className="relative flex items-center justify-between h-full px-4 sm:px-5" style={{ gap: '12px' }}>
          
          {/* Left: Icon + Title */}
          <div className="flex items-center shrink-0" style={{ gap: '10px' }}>
            {/* Icon bubble with pulse ring */}
            <div className="relative flex items-center justify-center" style={{ width: '28px', height: '28px' }}>
              {/* Pulse ring */}
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full admin-bar-pulse"
                style={{ background: 'rgba(255,255,255,0.20)' }}
              />
              {/* Bubble */}
              <div
                className="relative flex items-center justify-center rounded-full"
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.30)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <ShieldAlert size={16} strokeWidth={2.5} color="#FFFFFF" />
              </div>
            </div>

            {/* Title */}
            <span
              className="hidden sm:block"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: '#FFFFFF',
                textShadow: '0 1px 1px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
              }}
            >
              Modo Administrador
            </span>
            <span
              className="sm:hidden"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: '#FFFFFF',
                textShadow: '0 1px 1px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
              }}
            >
              Admin
            </span>
          </div>

          {/* Middle: Badge + Location */}
          <div className="flex items-center min-w-0 flex-1" style={{ gap: '10px' }}>
            {/* Badge */}
            <div
              className="flex items-center shrink min-w-0"
              style={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid rgba(255,255,255,0.40)',
                borderRadius: '9999px',
                padding: '4px 10px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                gap: '5px',
                maxWidth: '60vw',
              }}
            >
              <Eye size={12} strokeWidth={2.5} color="hsl(18 92% 52%)" style={{ flexShrink: 0 }} />
              <span
                className="truncate"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'hsl(18 92% 52%)',
                  whiteSpace: 'nowrap',
                }}
              >
                Visualizando: {clientName}
              </span>
            </div>

            {/* Location — hidden on mobile */}
            {location && (
              <div className="hidden sm:flex items-center shrink-0" style={{ gap: '4px' }}>
                <MapPin size={14} strokeWidth={2.25} color="rgba(255,255,255,0.90)" />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.90)', whiteSpace: 'nowrap' }}>
                  {location}
                </span>
              </div>
            )}
          </div>

          {/* Right: Exit button */}
          <button
            onClick={exitAdminMode}
            className="admin-exit-btn admin-exit-btn flex items-center shrink-0 rounded-full font-semibold cursor-pointer"
            style={{
              height: '32px',
              padding: '0 12px',
              fontSize: '12px',
              gap: '6px',
              border: '1px solid rgba(255,255,255,0.30)',
            }}
            aria-label="Sair do Modo Administrador"
          >
            <X size={14} strokeWidth={2.75} className="admin-exit-icon" />
            <span className="hidden sm:inline">Sair do Modo Admin</span>
            <span className="sm:hidden">Sair</span>
          </button>
        </div>
      </div>
    </>
  );
}