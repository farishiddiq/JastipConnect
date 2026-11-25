import * as React from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Compass,
  FlaskConical,
  Home,
  Inbox,
  LayoutDashboard,
  LayoutList,
  LogIn,
  LogOut,
  MessageCircle,
  Package,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  Tag,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/shared/display';
import { useAuth } from '@/components/shared/AccountSwitcher';
import { useCurrentUser, useDB, useMode, useUnreadMessageCount } from '@/hooks/useStore';
import { dismissDemoBanner, logout, markNotificationRead, markNotificationsRead, setMode } from '@/services/userService';
import type { AppMode } from '@/types';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Logo } from './Logo';

export function AppLayout() {
  const location = useLocation();
  const isInbox = !!useMatch('/inbox/*');
  const inThread = !!useMatch('/inbox/:conversationId');

  React.useEffect(() => {
    if (!isInbox) window.scrollTo({ top: 0 });
  }, [location.pathname, isInbox]);

  return (
    <div className={cn('flex flex-col bg-background', isInbox ? 'h-dvh' : 'min-h-dvh')}>
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Lewati ke konten utama
      </a>
      <DemoBanner />
      <Header />
      <main
        id="main"
        className={cn(
          'flex-1',
          isInbox && 'min-h-0 overflow-hidden',
          isInbox && !inThread && 'pb-[calc(68px+env(safe-area-inset-bottom))] md:pb-0',
        )}
      >
        <Outlet />
      </main>
      {!isInbox && <Footer />}
      {!inThread && <BottomNav />}
    </div>
  );
}

function DemoBanner() {
  const { settings } = useDB();
  const [open, setOpen] = React.useState(true);
  if (settings.demoBannerDismissed || !open) return null;
  return (
    <div className="border-b border-border bg-slate-100 text-slate-600">
      <div className="container flex items-center gap-3 py-1.5 text-[13px]">
        <FlaskConical className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <p className="min-w-0 flex-1 leading-snug">
          <span className="font-semibold text-navy">Mode demo.</span> <span className="max-sm:hidden">Data hanya di browser ini. Email, OTP, dan pembayaran disimulasikan.</span>
          <span className="sm:hidden">Data lokal.</span>{' '}
          <Link to="/safety#demo" className="font-semibold text-teal-700 underline underline-offset-2">
            Pelajari
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            dismissDemoBanner();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label="Tutup banner demo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const NAV: Record<AppMode, { to: string; label: string; icon: React.ElementType; end?: boolean }[]> = {
  client: [
    { to: '/', label: 'Beranda', icon: Home, end: true },
    { to: '/explore', label: 'Cari trip', icon: Compass },
    { to: '/orders', label: 'Pesanan', icon: Package },
    { to: '/inbox', label: 'Inbox', icon: MessageCircle },
  ],
  provider: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/my-listings', label: 'Trip saya', icon: LayoutList },
    { to: '/orders', label: 'Request', icon: Inbox },
    { to: '/inbox', label: 'Inbox', icon: MessageCircle },
    { to: '/harga', label: 'Paket', icon: Tag },
  ],
};

function useNav() {
  const mode = useMode();
  const user = useCurrentUser();
  const { inquiries } = useDB();
  const pending = React.useMemo(
    () => (user && mode === 'provider' ? inquiries.filter((i) => i.providerId === user.id && i.status === 'pending').length : 0),
    [inquiries, user, mode],
  );
  return { mode, items: NAV[user ? mode : 'client'], pending };
}

/** Segmented Klien / Provider switch. Provider needs activation first. */
export function ModeToggle({ className, dark }: { className?: string; dark?: boolean }) {
  const user = useCurrentUser();
  const mode = useMode();
  const { requireProvider } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const pick = (m: AppMode) => {
    if (m === mode) return;
    if (m === 'provider') {
      if (!user.phoneVerifiedAt) {
        requireProvider('Aktifkan mode provider untuk posting trip.', () => navigate('/dashboard'));
        return;
      }
      setMode('provider');
      navigate('/dashboard');
    } else {
      setMode('client');
      navigate('/');
    }
  };
  return (
    <div role="radiogroup" aria-label="Mode akun" className={cn('flex rounded-xl p-1 text-[13px] font-semibold', dark ? 'bg-white/10' : 'bg-slate-100', className)}>
      {(['client', 'provider'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => pick(m)}
          className={cn(
            'h-8 rounded-lg px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
            mode === m ? (dark ? 'bg-teal-500 text-deep shadow-sm' : 'bg-white text-navy shadow-sm') : dark ? 'text-white/70 hover:text-white' : 'text-slate-500 hover:text-navy',
          )}
        >
          {m === 'client' ? 'Klien' : 'Provider'}
        </button>
      ))}
    </div>
  );
}

function Header() {
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const unread = useUnreadMessageCount();
  const isExplore = !!useMatch('/explore');
  const { items, pending, mode } = useNav();
  const user = useCurrentUser();
  // Provider mode gets its own dark workspace header so the two modes never look alike.
  const pro = !!user && mode === 'provider';

  return (
    <header className={cn('sticky top-0 z-40 border-b', pro ? 'border-navy-600 bg-navy text-white' : 'glass border-border/70')} data-mode={pro ? 'provider' : 'client'}>
      <div className="container flex h-16 items-center gap-3 lg:gap-6">
        <Link
          to={pro ? '/dashboard' : '/'}
          className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label={pro ? 'Dashboard provider' : 'JastipConnect beranda'}
        >
          <Logo light={pro} />
          {pro && <span className="rounded-md bg-teal-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-deep">Provider</span>}
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                  pro
                    ? isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/65 hover:bg-white/10 hover:text-white'
                    : isActive
                      ? 'bg-slate-100 text-navy'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-navy',
                )
              }
            >
              {n.label}
              {n.to === '/inbox' && unread > 0 && (
                <span className="rounded-full bg-teal-700 px-1.5 text-[11px] leading-5 text-white num" aria-label={`${unread} percakapan belum dibaca`}>
                  {unread}
                </span>
              )}
              {n.to === '/orders' && pending > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 text-[11px] leading-5 text-white num" aria-label={`${pending} request baru`}>
                  {pending}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {!isExplore && !pro && (
          <form
            role="search"
            className="ml-auto hidden max-w-xs flex-1 lg:block"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/explore${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
              setQ('');
            }}
          >
            <label htmlFor="header-search" className="sr-only">
              Cari listing
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="header-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari kota, produk…"
                className="h-10 w-full rounded-xl border border-border bg-slate-50 pl-9 pr-3 text-sm placeholder:text-slate-400 focus-visible:border-teal-500 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
              />
            </div>
          </form>
        )}

        <div className={cn('flex items-center gap-1.5', isExplore || pro ? 'ml-auto' : 'ml-auto lg:ml-0')}>
          {user && <ModeToggle className="hidden sm:flex" dark={pro} />}
          {(!user || mode === 'provider') && (
            <Button asChild aria-label="Pasang trip" variant="accent" size="sm" className="hidden h-10 md:inline-flex">
              <Link to="/post">
                <PlusCircle /> <span className="hidden xl:inline">Pasang trip</span>
              </Link>
            </Button>
          )}
          <NotificationBell dark={pro} />
          <UserMenu dark={pro} />
        </div>
      </div>
    </header>
  );
}

function NotificationBell({ dark }: { dark?: boolean }) {
  const user = useCurrentUser();
  const { notifications } = useDB();
  const navigate = useNavigate();
  const mine = React.useMemo(
    () => notifications.filter((n) => n.userId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12),
    [notifications, user?.id],
  );
  if (!user) return null;
  const unread = mine.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative', dark && 'text-white hover:bg-white/10')} aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}>
          <Bell className="!size-5" />
          {unread > 0 && (
            <span className="absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(360px,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-bold text-navy">Notifikasi</span>
          {unread > 0 && (
            <button type="button" onClick={() => markNotificationsRead(user.id)} className="text-xs font-semibold text-teal-700 hover:underline">
              Tandai semua dibaca
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1.5">
          {mine.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">Belum ada notifikasi.</p>
          ) : (
            mine.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => {
                  markNotificationRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className="items-start py-2.5"
              >
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-teal-500')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-navy">{n.title}</span>
                  <span className="line-clamp-2 block text-[13px] font-normal text-slate-500">{n.body}</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-400">{formatRelative(n.createdAt)}</span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <p className="border-t border-border px-4 py-2 text-[11px] text-slate-400">Notifikasi lokal (demo).</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ dark }: { dark?: boolean }) {
  const user = useCurrentUser();
  const mode = useMode();
  const { openSwitcher, openAuth } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Button variant="outline" size="sm" className="h-10" onClick={() => openAuth()}>
        <LogIn /> <span>Masuk</span>
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn('flex h-11 items-center gap-2 rounded-xl pl-1 pr-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:pr-2', dark ? 'hover:bg-white/10' : 'hover:bg-slate-100')}
          aria-label={`Menu akun ${user.displayName}`}
        >
          <Avatar user={user} size={36} />
          <span className={cn('hidden max-w-[120px] truncate text-sm font-semibold xl:block', dark ? 'text-white' : 'text-navy')}>{user.displayName.split(' ')[0]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block text-sm font-bold text-navy">{user.displayName}</span>
          <span className="block text-xs font-medium text-slate-400">
            {mode === 'provider' ? 'Mode provider' : 'Mode klien'} · {user.city ?? '-'}
          </span>
        </DropdownMenuLabel>
        <div className="px-2 pb-2 sm:hidden">
          <ModeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <UserIcon /> Profil & Pengaturan
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(`/providers/${user.id}`)}>
          <Settings /> Lihat profil publik
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/orders')}>
          <Package /> {mode === 'provider' ? 'Request masuk' : 'Pesanan saya'}
        </DropdownMenuItem>
        {mode === 'provider' && (
          <>
            <DropdownMenuItem onSelect={() => navigate('/dashboard')}>
              <LayoutDashboard /> Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/my-listings')}>
              <LayoutList /> Trip saya
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onSelect={() => navigate('/saved')}>
          <Bookmark /> Disimpan
        </DropdownMenuItem>
        {user.role === 'admin' && (
          <DropdownMenuItem onSelect={() => navigate('/admin')}>
            <ShieldCheck /> Panel Moderasi
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openSwitcher()}>
          <Users /> Ganti akun demo
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            logout();
            toast('Anda sudah keluar.');
          }}
        >
          <LogOut /> Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BottomNav() {
  const unread = useUnreadMessageCount();
  const user = useCurrentUser();
  const { mode, pending } = useNav();
  const items: { to: string; label: string; icon: React.ElementType; end?: boolean; badge?: number }[] =
    user && mode === 'provider'
      ? [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/orders', label: 'Request', icon: Inbox, badge: pending },
          { to: '/post', label: 'Pasang', icon: PlusCircle },
          { to: '/inbox', label: 'Inbox', icon: MessageCircle, badge: unread },
          { to: '/profile', label: 'Akun', icon: UserIcon },
        ]
      : [
          { to: '/', label: 'Beranda', icon: Home, end: true },
          { to: '/explore', label: 'Cari', icon: Compass },
          { to: '/orders', label: 'Pesanan', icon: Package },
          { to: '/inbox', label: 'Inbox', icon: MessageCircle, badge: unread },
          { to: '/profile', label: 'Akun', icon: UserIcon },
        ];
  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 bg-white/95 backdrop-blur-xl z-40 rounded-t-3xl border-t border-border/70 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgb(0_0_0/0.18)] md:hidden"
    >
      <ul className="grid h-[68px] grid-cols-5">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.end}
              aria-label={it.to === '/profile' && !user ? 'Masuk' : it.label}
              className="flex h-full items-center justify-center focus-visible:outline-none"
            >
              {({ isActive }) => (
                <span
                  className={cn(
                    'relative flex h-12 w-16 items-center justify-center rounded-full transition duration-200 ease-spring active:scale-95',
                    isActive ? (user && mode === 'provider' ? 'bg-navy text-teal-300' : 'bg-teal-50 text-teal-700') : 'text-slate-500',
                  )}
                >
                  <it.icon className={cn('h-6 w-6', isActive && 'stroke-[2.2]')} aria-hidden />
                  {!!it.badge && (
                    <span className="absolute right-3 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-700 px-1 text-[10px] font-bold text-white num">
                      {it.badge}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Footer() {
  const { openSwitcher } = useAuth();
  return (
    <footer className="mt-20 border-t border-border pb-28 md:pb-0">
      <div className="container flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <nav aria-label="Tautan footer" className="hidden flex-wrap md:flex gap-x-6 gap-y-2 text-sm text-slate-600">
          <Link className="hover:text-teal-700" to="/explore">Cari trip</Link>
          <Link className="hover:text-teal-700" to="/post">Pasang trip</Link>
          <Link className="hover:text-teal-700" to="/harga">Harga</Link>
          <Link className="hover:text-teal-700" to="/safety">Keamanan</Link>
          <Link className="hover:text-teal-700" to="/syarat">Syarat & Ketentuan</Link>
          <Link className="hover:text-teal-700" to="/privasi">Privasi</Link>
        </nav>
        <nav aria-label="Tautan legal" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 md:hidden">
          <Link className="hover:text-teal-700" to="/harga">Harga</Link>
          <Link className="hover:text-teal-700" to="/syarat">Syarat</Link>
          <Link className="hover:text-teal-700" to="/privasi">Privasi</Link>
          <Link className="hover:text-teal-700" to="/safety">Keamanan</Link>
        </nav>
      </div>
      <div className="container flex flex-col gap-1 border-t border-border py-4 text-xs text-slate-500 sm:flex-row sm:justify-between">
        <span>
          © {new Date().getFullYear()} JastipConnect · Marketplace jastip untuk diaspora ·{' '}
          <button type="button" onClick={() => openSwitcher()} className="underline underline-offset-2 hover:text-teal-700">
            Akun demo
          </button>
        </span>
        <a className="hover:text-teal-700" href="https://unsplash.com/license" target="_blank" rel="noreferrer">
          Foto: Unsplash
        </a>
      </div>
    </footer>
  );
}
