import { cn, initials } from '../../lib/utils';
import type { User } from '../../types';

const PALETTE = [
  'bg-brand-100 text-brand-800',
  'bg-amber-100 text-amber-800',
  'bg-violet-100 text-violet-800',
  'bg-rose-100 text-rose-800',
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  user,
  size = 'md',
  className,
}: {
  user?: Pick<User, 'nome' | 'cognome'> & { id?: string } | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const key = user ? (user.id ?? `${user.nome}${user.cognome}`) : '';
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-12 text-base', xl: 'size-20 text-2xl' };
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold shrink-0 select-none',
        user ? PALETTE[hash(key) % PALETTE.length] : 'bg-slate-100 text-slate-400',
        sizes[size],
        className,
      )}
      aria-hidden="true"
    >
      {initials(user)}
    </div>
  );
}
