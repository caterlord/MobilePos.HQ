import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Stack,
  Text,
  Button,
  ActionIcon,
  Group,
  TextInput,
  Flex,
} from '@mantine/core';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  SortingState,
  ColumnSizingState,
  VisibilityState,
  OnChangeFn,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  IconAlertCircle,
  IconSparkles,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { CenterLoader } from './CenterLoader';
import { VirtualTableRow } from './VirtualTableRow';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string | React.ReactNode;
  totalItems?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  manualPagination?: boolean;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  actionColumnId?: string;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  columnSizing?: ColumnSizingState;
  onColumnSizingChange?: OnChangeFn<ColumnSizingState>;
  hideFooter?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  globalFilter?: string;
  onGlobalFilterChange?: OnChangeFn<string>;
}

export const DataTable = <TData,>({
  data,
  columns,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No items found',
  totalItems,
  page = 1,
  onPageChange,
  pageSize = 50,
  manualPagination = false,
  enableSearch = false,
  searchPlaceholder = 'Search...',
  actionColumnId = 'actions',
  columnVisibility,
  onColumnVisibilityChange,
  columnSizing,
  onColumnSizingChange,
  hideFooter = true,
  sorting,
  onSortingChange,
  globalFilter,
  onGlobalFilterChange,
}: DataTableProps<TData>) => {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalGlobalFilter, setInternalGlobalFilter] = useState('');
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>({});
  const [internalColumnSizing, setInternalColumnSizing] = useState<ColumnSizingState>({});

  const finalSorting = sorting ?? internalSorting;
  const finalOnSortingChange = onSortingChange ?? setInternalSorting;

  const finalGlobalFilter = globalFilter ?? internalGlobalFilter;
  const finalOnGlobalFilterChange = onGlobalFilterChange ?? setInternalGlobalFilter;

  const finalColumnVisibility = columnVisibility ?? internalColumnVisibility;
  const finalOnColumnVisibilityChange = onColumnVisibilityChange ?? setInternalColumnVisibility;
  
  const finalColumnSizing = columnSizing ?? internalColumnSizing;
  const finalOnColumnSizingChange = onColumnSizingChange ?? setInternalColumnSizing;

  const [showActionShadow, setShowActionShadow] = useState(false);
  const [hoveredResizeColumnId, setHoveredResizeColumnId] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const resizeCursorRestoreRef = useRef<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: finalSorting,
      globalFilter: finalGlobalFilter,
      columnVisibility: finalColumnVisibility,
      columnSizing: finalColumnSizing,
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    manualPagination,
    onSortingChange: finalOnSortingChange,
    onGlobalFilterChange: finalOnGlobalFilterChange,
    onColumnVisibilityChange: finalOnColumnVisibilityChange,
    onColumnSizingChange: finalOnColumnSizingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 5,
  });

  const totalTableWidth = table.getVisibleLeafColumns().reduce((sum, col) => sum + col.getSize(), 0);

  const updateActionShadow = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) {
      setShowActionShadow(false);
      return;
    }

    const { scrollWidth, clientWidth, scrollLeft } = container;
    const hasHorizontalScroll = scrollWidth - clientWidth > 1;
    if (!hasHorizontalScroll) {
      setShowActionShadow(false);
      return;
    }

    const isAtRightEdge = scrollLeft + clientWidth >= scrollWidth - 1;
    setShowActionShadow(!isAtRightEdge);
  }, []);

  const setBodyResizeCursor = useCallback((active: boolean) => {
    const bodyStyle = document.body.style;
    if (active) {
      if (resizeCursorRestoreRef.current === null) {
        resizeCursorRestoreRef.current = bodyStyle.cursor || '';
      }
      bodyStyle.cursor = 'col-resize';
    } else {
      if (resizeCursorRestoreRef.current !== null) {
        bodyStyle.cursor = resizeCursorRestoreRef.current;
        resizeCursorRestoreRef.current = null;
      } else {
        bodyStyle.cursor = '';
      }
    }
  }, []);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleScroll = () => updateActionShadow();
    container.addEventListener('scroll', handleScroll);
    
    // Also resize observer to handle container resize
    const observer = new ResizeObserver(handleScroll);
    observer.observe(container);

    updateActionShadow();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      setBodyResizeCursor(false);
      setHoveredResizeColumnId(null);
    };
  }, [updateActionShadow, rows.length, totalTableWidth, setBodyResizeCursor]);

  const totalPages = manualPagination 
    ? Math.ceil((totalItems || 0) / pageSize) 
    : table.getPageCount();

  const currentPage = manualPagination ? page : table.getState().pagination.pageIndex + 1;

  const handlePageChange = (newPage: number) => {
    if (manualPagination) {
      onPageChange?.(newPage);
    } else {
      table.setPageIndex(newPage - 1);
    }
  };

  const headerHeight = 48;

  return (
    <Paper shadow="none" p={0} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {enableSearch && (
        <Box p="md" style={{ borderBottom: '1px solid #dee2e6' }}>
          <TextInput
            placeholder={searchPlaceholder}
            value={finalGlobalFilter ?? ''}
            onChange={(e) => finalOnGlobalFilterChange(e.target.value)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              finalGlobalFilter ? (
                <ActionIcon variant="subtle" color="gray" onClick={() => finalOnGlobalFilterChange('')}>
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
          />
        </Box>
      )}

      <Box style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {loading ? (
          <CenterLoader message="Loading items..." />
        ) : error ? (
          <Stack align="center" justify="center" h="100%" gap="sm">
            <IconAlertCircle size={24} color="var(--mantine-color-red-6)" />
            <Text fw={600}>{error}</Text>
            {onRetry && (
              <Button variant="light" onClick={onRetry}>
                Retry
              </Button>
            )}
          </Stack>
        ) : rows.length === 0 ? (
          <Stack align="center" justify="center" h="100%" gap="sm">
            <IconSparkles size={24} color="var(--mantine-color-gray-6)" />
            <Text fw={600}>{emptyMessage}</Text>
          </Stack>
        ) : (
          <Box
            ref={tableContainerRef}
            style={{
              overflow: 'auto',
              height: '100%',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize() + headerHeight}px`,
                width: totalTableWidth,
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  display: 'flex',
                  width: totalTableWidth,
                  height: headerHeight,
                  backgroundColor: 'white',
                  borderBottom: '1px solid #dee2e6',
                }}
              >
                {table.getFlatHeaders().map((header) => (
                  <div
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                      maxWidth: header.getSize(),
                      position: header.id === actionColumnId ? 'sticky' : 'relative',
                      borderBottom: '1px solid #dee2e6',
                      ...(header.id === actionColumnId
                        ? {
                            right: 0,
                            backgroundColor: 'white',
                            boxShadow: showActionShadow ? 'inset 3px 0 6px -4px rgba(15, 23, 42, 0.2)' : 'none',
                            zIndex: 3,
                            transition: 'box-shadow 120ms ease',
                          }
                        : { backgroundColor: 'white' }),
                    }}
                  >
                    <Flex
                      align="center"
                      justify={header.column.id === actionColumnId ? 'flex-end' : 'flex-start'}
                      gap="xs"
                      style={{
                        height: '100%',
                        padding: '0 16px',
                        fontWeight: 600,
                        fontSize: 12,
                        color: 'var(--mantine-color-gray-7)',
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        userSelect: 'none',
                        width: '100%',
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' ▴',
                        desc: ' ▾',
                      }[header.column.getIsSorted() as string] ?? null}
                    </Flex>
                    
                    {header.column.getCanResize() && header.id !== actionColumnId && (
                        <Box
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onMouseEnter={() => {
                            setHoveredResizeColumnId(header.id);
                            setBodyResizeCursor(true);
                          }}
                          onMouseLeave={() => {
                            setBodyResizeCursor(false);
                            setHoveredResizeColumnId((current) => (current === header.id ? null : current));
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: -4,
                            height: '100%',
                            width: 8,
                            cursor: 'col-resize',
                            userSelect: 'none',
                            touchAction: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                          }}
                        >
                          <Box
                            style={{
                              width: 2,
                              height: '60%',
                              borderRadius: 1,
                              backgroundColor:
                                header.column.getIsResizing() || hoveredResizeColumnId === header.id
                                  ? 'var(--mantine-color-indigo-5)'
                                  : 'transparent',
                              transition: 'background-color 120ms ease',
                            }}
                          />
                        </Box>
                      )}
                  </div>
                ))}
              </div>

              <div style={{ position: 'absolute', top: headerHeight, left: 0, width: '100%' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <VirtualTableRow
                      key={row.id}
                      row={row}
                      virtualRow={virtualRow}
                      totalTableWidth={totalTableWidth}
                      showActionShadow={showActionShadow}
                    />
                  );
                })}
              </div>
            </div>
          </Box>
        )}
      </Box>

      {!hideFooter && (
        <Box p="xs" style={{ borderTop: '1px solid #dee2e6' }}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {manualPagination ? totalItems : rows.length} items
            </Text>
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                disabled={currentPage <= 1 || loading}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <IconChevronLeft size={16} />
              </ActionIcon>
              <Text size="sm">
                Page {currentPage} of {totalPages || 1}
              </Text>
              <ActionIcon
                variant="subtle"
                disabled={currentPage >= totalPages || loading}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <IconChevronRight size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Box>
      )}
    </Paper>
  );
};
