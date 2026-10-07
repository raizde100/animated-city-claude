import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({ width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', ...p });

export const PlayIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4.5 2.8v10.4L13 8 4.5 2.8Z" fill="currentColor" />
  </svg>
);
export const PauseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
    <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
  </svg>
);
export const RestartIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 8a5 5 0 1 0 1.6-3.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M2.5 2.2v3.3h3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const CycleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M13 8a5 5 0 0 1-8.6 3.5M3 8a5 5 0 0 1 8.6-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M11.8 1.8v2.9H8.9M4.2 14.2v-2.9h2.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const SlidersIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M2 4.5h7M12 4.5h2M2 11.5h2M7 11.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="10.5" cy="4.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="5.5" cy="11.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
export const ArrowUp = (p: SVGProps<SVGSVGElement>) => (
  <svg width={10} height={10} viewBox="0 0 10 10" {...p}>
    <path d="M5 1.5 9 7H1L5 1.5Z" fill="currentColor" />
  </svg>
);
export const ArrowDown = (p: SVGProps<SVGSVGElement>) => (
  <svg width={10} height={10} viewBox="0 0 10 10" {...p}>
    <path d="M5 8.5 1 3h8L5 8.5Z" fill="currentColor" />
  </svg>
);
