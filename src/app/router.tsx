import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthProvider } from '@/components/shared/AccountSwitcher';
import { ConfirmProvider } from '@/components/shared/ConfirmProvider';
import { RouteError } from '@/pages/NotFoundPage';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { ListingDetailPage } from '@/pages/ListingDetailPage';
import { ProviderProfilePage } from '@/pages/ProviderProfilePage';
import { CreateListingPage } from '@/pages/CreateListingPage';
import { EditListingPage } from '@/pages/EditListingPage';
import { MyListingsPage } from '@/pages/MyListingsPage';
import { InboxPage } from '@/pages/InboxPage';
import { ConversationPage } from '@/pages/ConversationPage';
import { SavedPage } from '@/pages/SavedPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AdminPage } from '@/pages/AdminPage';
import { SafetyPage } from '@/pages/SafetyPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function Providers() {
  return (
    <ConfirmProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ConfirmProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <Providers />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/explore', element: <ExplorePage /> },
          { path: '/listings/:id', element: <ListingDetailPage /> },
          { path: '/listings/:id/edit', element: <EditListingPage /> },
          { path: '/providers/:id', element: <ProviderProfilePage /> },
          { path: '/post', element: <CreateListingPage /> },
          { path: '/my-listings', element: <MyListingsPage /> },
          { path: '/inbox', element: <InboxPage /> },
          { path: '/inbox/:conversationId', element: <ConversationPage /> },
          { path: '/saved', element: <SavedPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/admin', element: <AdminPage /> },
          { path: '/safety', element: <SafetyPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
