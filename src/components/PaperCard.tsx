import { Link } from 'react-router-dom';
import { formatAuthorsShort, getPublishedYear } from '../utils/papers';

export type PaperCardVariant = 'grid' | 'list';

export interface PaperCardProps {
  id: number; // collection item id or fallback id
  paperId?: number;
  title?: string;
  authors?: string[];
  categories?: string[];
  abstractText?: string;
  arxivId?: string;
  publishedDate?: string;
  variant?: PaperCardVariant;
  collectionIdForRoute?: number; // if provided, encoded in paper route
}

const PaperCard = ({
  id,
  paperId,
  title,
  authors = [],
  categories = [],
  abstractText,
  arxivId,
  publishedDate,
  variant = 'grid',
  collectionIdForRoute,
}: PaperCardProps) => {
  const authorsLabel = formatAuthorsShort(authors);
  const publishedYear = getPublishedYear(publishedDate);

  const containerClass =
    variant === 'list'
      ? 'w-full p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col md:flex-row md:items-start md:justify-between gap-4'
      : 'p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow';
  const metaWrapperClass = variant === 'list' ? 'flex-1' : '';

  const linkHref = paperId
    ? `/paper/${paperId}${collectionIdForRoute ? `?collectionId=${collectionIdForRoute}` : ''}`
    : undefined;

  const TitleNode = paperId ? (
    <Link to={linkHref!} className="hover:underline">
      <h3 className="text-lg font-bold text-gray-800 line-clamp-2 md:line-clamp-1">{title || '제목 미상'}</h3>
    </Link>
  ) : (
    <h3 className="text-lg font-bold text-gray-800 line-clamp-2 md:line-clamp-1">{title || '제목 미상'}</h3>
  );

  return (
    <div key={id} className={containerClass}>
      <div className={metaWrapperClass}>
        {TitleNode}
        {authorsLabel && (
          <p className="text-sm text-gray-600 mt-1">
            {authorsLabel}
            {publishedYear ? ` - ${publishedYear}` : ''}
          </p>
        )}
        {abstractText && (
          <p
            className={`text-sm text-gray-500 mt-3 ${
              variant === 'list' ? 'line-clamp-2 md:line-clamp-none' : 'line-clamp-3'
            }`}
          >
            {abstractText}
          </p>
        )}
        {arxivId && <p className="text-xs text-gray-400 mt-2">arXiv: {arxivId}</p>}
      </div>
      <div className={`mt-4 ${variant === 'list' ? 'md:mt-0 md:w-48 flex-shrink-0' : ''}`}>
        {categories.slice(0, 5).map((tag) => (
          <span
            key={tag}
            className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full mb-2"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PaperCard;

