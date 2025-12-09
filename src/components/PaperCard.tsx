import type { KeyboardEvent, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { formatAuthorsShort, getPublishedYear } from '../utils/papers';
import { getCategoryName } from '../utils/categories';

export type PaperCardVariant = 'grid' | 'list';

export interface PaperCardProps {
  id: number; // 컬렉션 아이템 ID 또는 Fallback ID
  paperId?: number;
  title?: string;
  authors?: string[];
  categories?: string[];
  abstractText?: string;
  arxivId?: string;
  publishedDate?: string;
  variant?: PaperCardVariant;
  collectionIdForRoute?: number; // 제공 시 라우트 인코딩
  onClick?: () => void;
  disabled?: boolean;
  disableLink?: boolean;
  actionButton?: React.ReactNode;
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
  onClick,
  disabled = false,
  disableLink = false,
  actionButton,
}: PaperCardProps) => {
  const authorsLabel = formatAuthorsShort(authors);
  const publishedYear = getPublishedYear(publishedDate);
  const isClickable = Boolean(onClick) && !disabled;

  const containerClass =
    variant === 'list'
      ? 'w-full p-6 bg-white rounded-lg shadow-md transition-shadow flex flex-col md:flex-row md:items-start md:justify-between gap-4'
      : 'p-6 bg-white rounded-lg shadow-md transition-shadow flex flex-col justify-between h-full';
  const metaWrapperClass = variant === 'list' ? 'flex-1' : 'flex-1';

  const linkHref =
    !disableLink && paperId
      ? `/paper/${paperId}${collectionIdForRoute ? `?collectionId=${collectionIdForRoute}` : ''}`
      : undefined;

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isClickable) return;
    // 액션 버튼 클릭 시 카드 클릭 방지
    if ((event.target as HTMLElement).closest('button')) return;

    event.preventDefault();
    onClick?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isClickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };

  const titleClass = `text-lg font-bold text-gray-800 line-clamp-2 md:line-clamp-1 ${!linkHref && isClickable && !disabled ? 'hover:underline' : ''
    }`;
  const TitleContent = <h3 className={titleClass}>{title || '제목 미상'}</h3>;

  const TitleNode =
    linkHref && !disabled ? (
      <Link to={linkHref} className="hover:underline">
        {TitleContent}
      </Link>
    ) : (
      TitleContent
    );

  const interactiveClasses = disabled
    ? 'opacity-70 cursor-not-allowed'
    : isClickable
      ? 'hover:shadow-xl cursor-pointer'
      : 'hover:shadow-xl';

  return (
    <div
      key={id}
      className={`${containerClass} ${interactiveClasses}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-disabled={disabled}
    >
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
            className={`text-sm text-gray-500 mt-3 ${variant === 'list' ? 'line-clamp-2 md:line-clamp-none' : 'line-clamp-3'
              }`}
          >
            {abstractText}
          </p>
        )}
        {arxivId && <p className="text-xs text-gray-400 mt-2">arXiv: {arxivId}</p>}
      </div>
      <div className={`mt-4 ${variant === 'list' ? 'md:mt-0 md:w-48 flex-shrink-0 flex flex-col items-end gap-2' : 'flex flex-col items-start gap-2'}`}>
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full"
            >
              {getCategoryName(tag)}
            </span>
          ))}
        </div>
        {actionButton && <div className="mt-2">{actionButton}</div>}
      </div>
    </div>
  );
};

export default PaperCard;
