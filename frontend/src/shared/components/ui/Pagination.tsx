import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft size={16} aria-hidden />
        Previous
      </Button>
      <span className="text-sm text-muted" aria-live="polite">
        Page {page} of {Math.max(1, totalPages)}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
        <ChevronRight size={16} aria-hidden />
      </Button>
    </nav>
  );
}
