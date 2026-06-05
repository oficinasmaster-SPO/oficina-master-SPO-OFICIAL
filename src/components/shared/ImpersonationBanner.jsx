import React, { useEffect, useRef } from 'react';
import { Eye, X, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const IMPERSONATION_KEY = 'om_impersonation';
export const IMP_BAR_HEIGHT = 48;

export function getImpersonationData() {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function startImpersonation(data) {
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(data));
}

export function stopImpersonation() {
  localStorage.removeItem(IMPERSONATION_KEY);
}

export default function ImpersonationBanner() {
  const navigate = useNavigate();
  const data = getImpersonationData();

  // Aplica/remove CSS var na raiz para que sidebar e layout se ajustem
  useEffect(() => {
    if (data) {
      document.documentElement.style.setProperty('--imp-bar-height', `${IMP_BAR_HEIGHT}px`);
    } else {
      document.documentElement.style.setProperty('--imp-bar-height', '0px');
    }
    return () => {
      document.documentElement.style.setProperty('--imp-bar-height', '0px');
    };
  }, [!!data]);

  if (!data) return null;

  const { target_user, admin } = data;

  const handleExit = () => {
    stopImpersonation();
    // Volta para GestaoRBAC na aba de usuários
    window.location.href = '/GestaoRBAC?tab=usuarios';
  };

  return (
    <>
      <style>{`
        @keyframes imp-shine {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        .imp-shine { animation: imp-shine 6s ease-in-out infinite; }
        .imp-exit-btn {
          transition: all 200ms ease;
          background: rgba(255,255,255,0.12);
          color: #FFFFFF;
          border: 1px solid rgba(255,255,255,0.35);
          border-radius: 9999px;
          padding: 0 14px;
          height: 32px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .imp-exit-btn:hover {
          background: rgba(255,255,255,0.95);
          color: #c2410c;
          border-color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      `}</style>

      {/* Barra FIXED no topo absoluto da viewport, full width */}
      <div
        role="alert"
        className="fixed top-0 left-0 right-0 overflow-hidden print:hidden"
        style={{
          height: `${IMP_BAR_HEIGHT}px`,
          background: 'linear-gradient(90deg, #c2410c 0%, #ea580c 50%, #f97316 100%)',
          boxShadow: '0 4px 16px -4px rgba(194,65,12,0.5)',
          zIndex: 200,
        }}
      >
        {/* Diagonal stripes */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 10px)' }} />
        {/* Shine */}
        <div aria-hidden="true" className="absolute inset-y-0 pointer-events-none imp-shine" style={{ width: '50%', background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)' }} />

        <div className="relative flex items-center justify-between h-full px-4 sm:px-5" style={{ gap: '12px' }}>
          {/* Left */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center rounded-full" style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}>
              <Eye size={15} strokeWidth={2.5} color="#fff" />
            </div>
            <span className="hidden sm:block" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              Impersonação
            </span>
          </div>

          {/* Middle */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <User size={12} strokeWidth={2.5} color="#c2410c" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#c2410c', whiteSpace: 'nowrap' }}>
                {target_user.full_name || target_user.email}
              </span>
            </div>
            <span className="hidden sm:block" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
              {target_user.email}
            </span>
            {target_user.position && (
              <span className="hidden md:block" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>
                · {target_user.position}
              </span>
            )}
            <div className="hidden lg:flex items-center gap-1 ml-1">
              <Shield size={11} color="rgba(255,255,255,0.6)" />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>
                como {admin?.full_name || admin?.email}
              </span>
            </div>
          </div>

          {/* Right */}
          <button onClick={handleExit} className="imp-exit-btn" aria-label="Sair do modo impersonação">
            <X size={13} strokeWidth={2.75} />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Spacer para empurrar o conteúdo abaixo da barra fixed */}
      <div style={{ height: `${IMP_BAR_HEIGHT}px` }} className="print:hidden" />
    </>
  );
}