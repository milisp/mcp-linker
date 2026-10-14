import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  Table,
  useReactTable,
} from "@tanstack/react-table"
import { Search } from "lucide-react"
import * as React from "react"
import { useTranslation } from "react-i18next"

import { BatchActionsDropdown } from "@/components/manage/BatchActionsDropdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BatchActionsProps {
  handleBatchEnable?: () => void;
  handleBatchDisable?: () => void;
  handleBatchDelete: () => void;
  isDeleting: boolean;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  isLoading?: Boolean
  searchPlaceholder?: string
  emptyMessage?: string
  rowSelection: RowSelectionState;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onTableInstanceChange?: (table: Table<TData>) => void;
  batchActions?: BatchActionsProps;
  toolbar?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  rowSelection,
  setRowSelection,
  onTableInstanceChange,
  batchActions,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  React.useEffect(() => {
    if (onTableInstanceChange) {
      onTableInstanceChange(table);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {(searchKey || batchActions || toolbar) && (
        <div className="flex items-center gap-2 pb-3">
          {searchKey && (
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("table.search")}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="pl-8"
              />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
          {batchActions && (
            <BatchActionsDropdown
              hasSelectedRows={Object.keys(rowSelection).length > 0}
              handleBatchEnable={batchActions.handleBatchEnable}
              handleBatchDisable={batchActions.handleBatchDisable}
              handleBatchDelete={batchActions.handleBatchDelete}
              isDeleting={batchActions.isDeleting}
            />
          )}
          {toolbar}
          </div>
        </div>
      )}
      <div className="rounded-md border">
        <ShadcnTable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("table.noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ShadcnTable>
      </div>
      {table.getPageCount() > 1 && <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          {t("table.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          {t("table.next")}
        </Button>
      </div>}
    </div>
  )
} 