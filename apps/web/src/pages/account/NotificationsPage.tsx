import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { RequireAuth } from '../../components/layout/AreaLayout';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';
import { Seo } from '../../components/ui/Seo';

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <div className="container-page max-w-3xl py-4 md:py-8">
        <Seo title="Notifications" noindex />
        <div className="card overflow-hidden">
          <NotificationCenter variant="page" />
        </div>
        <p className="mt-4 text-center text-sm"><Link to="/account/settings/notifications" className="inline-flex items-center gap-1.5 font-semibold"><Settings className="h-4 w-4" aria-hidden />Notification settings</Link></p>
      </div>
    </RequireAuth>
  );
}
