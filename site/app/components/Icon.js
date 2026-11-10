// Icônes de la home : tracés lucide (licence ISC), un seul jeu, trait 1,5. Pas de dépendance ajoutée.
const P = {
  "arrow-right": <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  minus: <path d="M5 12h14" />,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  lock: <><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  menu: <><path d="M4 12h16" /><path d="M4 6h16" /><path d="M4 18h16" /></>,
  "chevron-left": <path d="m15 18-6-6 6-6" />,
};

export default function Icon({ name, size = 16, className = "" }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`hp-ico ${className}`}>
      {P[name]}
    </svg>
  );
}

export const Logo = ({ size = 28 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#31777A" /><path d="M8 14.5l4 4 8-9" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
