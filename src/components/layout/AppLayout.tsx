import * as React from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Compass,
  FlaskConical,
  Home,
  LayoutList,
  LogOut,
  MessageCircle,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
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
import { useCurrentUser, useDB, useUnreadMessageCount } from '@/hooks/useStore';
import { dismissDemoBanner, markNotificationRead, markNotificationsRead, switchAccount } from '@/services/userService';
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
          isInbox && !inThread && 'pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0',
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
    <div className="bg-navy text-white">
      <div className="container flex items-center gap-3 py-2 text-[13px]">
        <FlaskConical className="h-4 w-4 shrink-0 text-teal-300" aria-hidden />
        <p className="min-w-0 flex-1 leading-snug">
          <span className="font-semibold">Mode demo.</span> Data hanya tersimpan di browser ini — tanpa login, pembayaran, verifikasi, atau
          pesan lintas perangkat sungguhan.{' '}
          <Link to="/safety#demo" className="font-semibold text-teal-300 underline underline-offset-2">
            Pelajari
          </Link>
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            dismissDemoBanner();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          aria-label="Tutup banner demo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const NAV = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/explore', label: 'Jelajahi', icon: Compass },
  { to: '/my-listings', label: 'Listing Saya', icon: LayoutList },
  { to: '/inbox', label: 'Inbox', icon: MessageCircle },
];

function Header() {
  const navigate = useNavigate();
  const [q, setQ] = React.useState('');
  const unread = useUnreadMessageCount();
  const isExplore = !!useMatch('/explore');

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="container flex h-16 items-center gap-3 lg:gap-6">
        <Link to="/" className="flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" aria-label="JastipConnect beranda">
          <Logo />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100 hover:text-navy',
                )
              }
            >
              {n.label}
              {n.to === '/inbox' && unread > 0 && (
                <span className="rounded-full bg-teal-500 px-1.5 text-[11px] leading-5 text-white" aria-label={`${unread} percakapan belum dibaca`}>
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {!isExplore && (
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

        <div className={cn('flex items-center gap-1.5', isExplore ? 'ml-auto' : 'ml-auto lg:ml-0')}>
          <Button asChild variant="accent" size="sm" className="hidden h-10 md:inline-flex">
            <Link to="/post">
              <PlusCircle /> Pasang Listing
            </Link>
          </Button>
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function NotificationBell() {
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
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}>
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
        <p className="border-t border-border px-4 py-2 text-[11px] text-slate-400">Notifikasi lokal (demo) — tanpa push/email/WhatsApp.</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const user = useCurrentUser();
  const { openSwitcher } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Button variant="outline" size="sm" className="h-10" onClick={() => openSwitcher()}>
        <Users /> <span>Masuk</span>
        <span className="hidden text-slate-400 sm:inline">(Demo)</span>
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-11 items-center gap-2 rounded-xl pl-1 pr-1 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:pr-2"
          aria-label={`Menu akun ${user.displayName}`}
        >
          <Avatar user={user} size={36} />
          <span className="hidden max-w-[120px] truncate text-sm font-semibold text-navy xl:block">{user.displayName.split(' ')[0]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block text-sm font-bold text-navy">{user.displayName}</span>
          <span className="block text-xs font-medium text-slate-400">Akun demo · {user.city ?? '—'}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <UserIcon /> Profil & Pengaturan
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate(`/providers/${user.id}`)}>
          <Settings /> Lihat profil publik
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/my-listings')}>
          <LayoutList /> Listing Saya
        </DropdownMenuItem>
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
            switchAccount(null);
            toast('Anda keluar dari akun demo.');
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
  const items = [
    { to: '/', label: 'Beranda', icon: Home, end: true },
    { to: '/explore', label: 'Jelajahi', icon: Compass },
    { to: '/post', label: 'Pasang', icon: PlusCircle, primary: true },
    { to: '/inbox', label: 'Inbox', icon: MessageCircle, badge: unread },
    { to: '/profile', label: 'Akun', icon: UserIcon },
  ];
  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500',
                  isActive ? 'text-teal-600' : 'text-slate-500',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {it.primary ? (
                    <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-lift ring-4 ring-white">
                      <it.icon className="h-6 w-6" aria-hidden />
                    </span>
                  ) : (
                    <span className="relative">
                      <it.icon className={cn('h-6 w-6', isActive && 'stroke-[2.4]')} aria-hidden />
                      {!!it.badge && (
                        <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-500 px-1 text-[10px] text-white">
                          {it.badge}
                        </span>
                      )}
                    </span>
                  )}
                  <span>{it.to === '/profile' && !user ? 'Masuk' : it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-white pb-28 md:pb-0">
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-slate-500">
            Titip barang, temukan perjalanan, terhubung dengan diaspora. Koridor awal: Arab Saudi ↔ Indonesia.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Prototipe demo. Tidak memproses pembayaran, tidak memverifikasi identitas, dan bukan nasihat hukum.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-navy">Jelajahi</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link className="hover:text-teal-700" to="/explore?type=weight">Jastip Diaspora</Link></li>
            <li><Link className="hover:text-teal-700" to="/explore?type=shopping">Jastip Shopping</Link></li>
            <li><Link className="hover:text-teal-700" to="/explore?oc=SA&dc=ID">Saudi → Indonesia</Link></li>
            <li><Link className="hover:text-teal-700" to="/explore?oc=ID&dc=SA">Indonesia → Saudi</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-navy">Bantuan</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link className="hover:text-teal-700" to="/safety">Keamanan & barang terlarang</Link></li>
            <li><Link className="hover:text-teal-700" to="/safety#demo">Batasan demo</Link></li>
            <li><Link className="hover:text-teal-700" to="/post">Pasang listing</Link></li>
            <li><Link className="hover:text-teal-700" to="/profile">Pengaturan & reset demo</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} JastipConnect · Demo</div>
    </footer>
  );
}
