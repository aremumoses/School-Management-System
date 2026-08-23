import { PageHeader } from '@/components/dashboard/page-header';
import { listBooks } from '@/lib/actions/library';
import { CatalogView } from './catalog-view';

export default async function LibrarianCatalogPage() {
  const books = await listBooks();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalog"
        description="The library's book collection — add, edit, and search titles."
      />
      <CatalogView books={books} />
    </div>
  );
}
