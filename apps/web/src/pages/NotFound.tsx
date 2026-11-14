import { Seo } from '../components/ui/Seo';
import { EmptyState } from '../components/ui/States';
import { LinkButton } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="container-page py-16">
      <Seo title="Page not found" noindex />
      <EmptyState title="We could not find that page" text="The link may be broken or the page may have moved." action={<LinkButton to="/">Go to home</LinkButton>} />
    </div>
  );
}
