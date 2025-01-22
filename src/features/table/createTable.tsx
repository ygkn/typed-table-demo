import { FC, ReactNode, useState } from "react";

import * as ShadCNUiTable from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type NonEmptyArray<T> = [T, ...T[]];

/**
 * テーブルに表示するデータ
 *
 * APIから取得したデータは、この型に変換してテーブルに表示する
 */
export type AnyTableViewModelBase = Record<string, unknown>;

/**
 * ページネーションの設定
 *
 * null の場合はページネーションを表示しない（指定忘れ防止のため、optional ではない）
 */
export type TablePaginationDefinition = null | {
  /**
   * 1ページあたりの表示数
   */
  parPage: number;
};

/**
 * キーワード検索の設定
 *
 * null の場合はキーワード検索を表示しない（指定忘れ防止のため、optional ではない）
 */
export type TableKeywordSearchDefinition = null | {
  renderSearchInput: (props: {
    value: string;
    onChange: (value: string) => void;
  }) => ReactNode;

  encode: (value: string) => string;
  decode: (value: string) => string | null;
};

export type NonNullColumnFilterDefinition<
  TableViewModelBaseType extends AnyTableViewModelBase,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FilterCondition = any
> = {
  renderPopupContent: (props: {
    rows: TableViewModelBaseType[];
    filter: FilterCondition | null;
    setFilter: (filter: FilterCondition | null) => void;
    isOpen: boolean;
    onClose: () => void;
  }) => ReactNode;
  renderFilterChipContent: (props: { filter: FilterCondition }) => ReactNode;
  encode: (filter: FilterCondition | null) => unknown;
  decode: (filter: unknown) => FilterCondition | null;
  initial: FilterCondition | null;
};

/**
 * 列のフィルターの設定
 *
 * null の場合はフィルターを表示しない（指定忘れ防止のため、optional ではない）
 */
export type ColumnFilterDefinition<
  TableViewModelBaseType extends AnyTableViewModelBase,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FilterCondition = any
> = null | NonNullColumnFilterDefinition<
  TableViewModelBaseType,
  FilterCondition
>;

/**
 * 列の表示/非表示の設定
 */
export type ColumnVisibilityDefinition = {
  initialVisibility: boolean;
};

/**
 * 列の定義
 */
export type ColumnDefinition<
  TableViewModelType extends AnyTableViewModelBase,
  K extends keyof TableViewModelType = keyof TableViewModelType,
  TColumnFilterDefinition extends ColumnFilterDefinition<TableViewModelType> = ColumnFilterDefinition<TableViewModelType>,
  TColumnSortDefinition extends boolean = boolean
> = {
  key: K;

  filter: TColumnFilterDefinition;

  sortable: TColumnSortDefinition;

  visibility: ColumnVisibilityDefinition;

  renderHeadCell: () => string;

  renderBodyCell: (props: {
    rowIndex: number;
    row: TableViewModelType;
    data: TableViewModelType[];
  }) => ReactNode;
};

export type TableDefinition<
  TableViewModelBaseType extends AnyTableViewModelBase,
  TablePaginationDefinitionType extends TablePaginationDefinition = TablePaginationDefinition,
  TableKeywordSearchDefinitionType extends TableKeywordSearchDefinition = TableKeywordSearchDefinition,
  ColumnDefinitions extends Array<
    ColumnDefinition<TableViewModelBaseType>
  > = Array<ColumnDefinition<TableViewModelBaseType>>
> = {
  /**
   * テーブルのキー
   *
   * localStorage に保存する際のキーとして使用する
   */
  key: string;

  pagination: TablePaginationDefinitionType;

  keywordSearch: TableKeywordSearchDefinitionType;

  columns: ColumnDefinitions;
};

/**
 * テーブルのキーワード検索の状態
 */
export type TableKeywordSearchState<
  TableViewModelBaseType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelBaseType>
> =
  // TableDefinition から TableKeywordSearchDefinition を取り出す
  TableDefinitionType extends TableDefinition<
    TableViewModelBaseType,
    TablePaginationDefinition,
    infer TableKeywordSearchDefinitionInfer extends TableKeywordSearchDefinition
  >
    ? TableKeywordSearchDefinitionInfer extends null
      ? undefined
      : string
    : never;

type AnyTableSortState<
  SortBy extends string = string,
  SortOrder extends "asc" | "desc" = "asc" | "desc"
> = {
  sortBy: SortBy;
  sortOrder: SortOrder;
};

/**
 * テーブルのソートの状態
 *
 * デフォルトのソート順のときは undefined とする
 */
export type TableSortState<
  TableViewModelBaseType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelBaseType>
> =
  // TableDefinition から ColumnDefinitions を取り出す
  TableDefinitionType extends TableDefinition<
    TableViewModelBaseType,
    TablePaginationDefinition,
    TableKeywordSearchDefinition,
    infer ColumnDefinitionsInfer
  >
    ? ColumnsSortKey<
        TableViewModelBaseType,
        ColumnDefinitionsInfer
      > extends string
      ?
          | AnyTableSortState<
              ColumnsSortKey<TableViewModelBaseType, ColumnDefinitionsInfer>
            >
          | undefined
      : undefined
    : never;

type TableSortKey<
  TableViewModelBaseType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelBaseType>
> = TableDefinitionType extends TableDefinition<
  TableViewModelBaseType,
  TablePaginationDefinition,
  TableKeywordSearchDefinition,
  infer ColumnDefinitions
>
  ? ColumnsSortKey<TableViewModelBaseType, ColumnDefinitions>
  : never;

type ColumnsSortKey<
  TableViewModelBaseType extends AnyTableViewModelBase,
  ColumnDefinitions extends Array<ColumnDefinition<TableViewModelBaseType>>
> =
  // ColumnDefinitions に対して、再帰的に ColumnSortState を適用する
  // イメージ：
  // ColumnsSortState<..., [ColumnDefinition<...>, ColumnDefinition<...>]> =
  //   ColumnSortState<...> | ColumnsSortState<..., [ColumnDefinition<...>]> =
  //   ColumnSortState<...> | ColumnSortState<...> | ColumnsSortState<..., []> =
  //   ColumnSortState<...> | ColumnSortState<...> | never (union の単位元) =
  //   ColumnSortState<...> | ColumnSortState<...>
  //
  // ColumnDefinitions がタプルでない配列ならば、never を返す
  number extends ColumnDefinitions["length"]
    ? never
    : ColumnDefinitions extends [
        // 先頭の ColumnDefinition を取り出す
        ColumnDefinition<
          TableViewModelBaseType,
          infer Key,
          ColumnFilterDefinition<TableViewModelBaseType>,
          infer ColumnSortDefinitionType
        >,
        // 残りの ColumnDefinition の配列を取り出す。
        ...infer RestColumnDefinitions
      ]
    ?
        | ColumnSortState<TableViewModelBaseType, Key, ColumnSortDefinitionType>
        // 残りの ColumnDefinitions が空でないならば（停止条件）
        | (RestColumnDefinitions extends NonEmptyArray<
            ColumnDefinition<TableViewModelBaseType>
          >
            ? // 再帰的に ColumnsSortState を適用する
              ColumnsSortKey<TableViewModelBaseType, RestColumnDefinitions>
            : never)
    : never;

type ColumnSortState<
  TableViewModelBaseType extends AnyTableViewModelBase,
  Key extends keyof TableViewModelBaseType = keyof TableViewModelBaseType,
  ColumnSortableDefinitionType extends boolean = boolean
> = ColumnSortableDefinitionType extends true ? Key : never;

type TableColumnVisibilityState<
  TableViewModelBaseType extends AnyTableViewModelBase
> = Array<keyof TableViewModelBaseType>;

type TablePaginationState<
  TableViewModelBaseType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelBaseType>
> =
  // TableDefinition から TablePaginationDefinition を取り出す
  TableDefinitionType extends TableDefinition<
    TableViewModelBaseType,
    infer TablePaginationDefinitionInfer
  >
    ? TablePaginationDefinitionInfer extends null
      ? undefined
      : number
    : never;

type TableFilterColumnState<
  TableViewModelBaseType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelBaseType>
> =
  // TableDefinition から ColumnDefinitions を取り出す
  TableDefinitionType extends TableDefinition<
    TableViewModelBaseType,
    TablePaginationDefinition,
    TableKeywordSearchDefinition,
    infer ColumnDefinitions
  >
    ? ColumnsFilterState<TableViewModelBaseType, ColumnDefinitions>
    : never;

type ColumnsFilterState<
  TableViewModelBaseType extends AnyTableViewModelBase,
  ColumnDefinitions extends Array<ColumnDefinition<TableViewModelBaseType>>
> =
  // ColumnDefinitions から ColumnFilterState を組み立てる
  //
  // イメージ：
  // ColumnsFilterState<..., [ColumnDefinition<...>, ColumnDefinition<...>]> =
  //   ColumnFilterState<...> & ColumnsFilterState<..., [ColumnDefinition<...>]> =
  //   ColumnFilterState<...> & ColumnFilterState<...> & ColumnsFilterState<..., []> =
  //   ColumnFilterState<...> & ColumnFilterState<...> & {} (intersection の単位元) =
  //   ColumnFilterState<...> & ColumnFilterState<...>
  //
  // ColumnDefinitions がタプルでない配列ならば、never を返す
  number extends ColumnDefinitions["length"]
    ? never
    : // ColumnDefinitions から ColumnFilterState を組み立てる
    ColumnDefinitions extends [
        ColumnDefinition<
          TableViewModelBaseType,
          infer Key,
          infer ColumnFilterDefinitionType
        >,
        ...infer RestColumnDefinitions
      ]
    ? ColumnFilterState<
        TableViewModelBaseType,
        Key,
        ColumnFilterDefinitionType
      > & //
        // 残りの ColumnDefinitions が空（停止条件）でないならば
        (RestColumnDefinitions extends NonEmptyArray<
          ColumnDefinition<TableViewModelBaseType>
        >
          ? ColumnsFilterState<TableViewModelBaseType, RestColumnDefinitions>
          : Record<never, never>)
    : never;

type ColumnFilterState<
  TableViewModelBaseType extends AnyTableViewModelBase,
  Key extends keyof TableViewModelBaseType,
  ColumnFilterDefinitionType extends ColumnFilterDefinition<TableViewModelBaseType>
> = ColumnFilterDefinitionType extends null
  ? Record<never, never>
  : ColumnFilterDefinitionType extends ColumnFilterDefinition<
      TableViewModelBaseType,
      infer FilterConditionInfer
    >
  ? {
      [key in Key]: FilterConditionInfer | null;
    }
  : never;

type TableColumnFilterCondition<
  TableViewModelBaseType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelBaseType>,
  ColumnKey extends keyof TableViewModelBaseType
> =
  // TableDefinition から ColumnDefinitions を取り出す
  TableDefinitionType extends TableDefinition<
    TableViewModelBaseType,
    TablePaginationDefinition,
    TableKeywordSearchDefinition,
    infer ColumnDefinitions
  >
    ? ColumnDefinitions[number] &
        ColumnDefinition<
          TableViewModelBaseType,
          ColumnKey
        > extends ColumnDefinition<
        TableViewModelBaseType,
        ColumnKey,
        ColumnFilterDefinition<
          TableViewModelBaseType,
          infer FilterConditionInfer
        >
      >
      ? FilterConditionInfer
      : never
    : never;

export type TableState<
  TableViewModelBaseType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelBaseType>
> = {
  keywordSearch: TableKeywordSearchState<
    TableViewModelBaseType,
    TableDefinitionType
  >;
  sort: TableSortState<TableViewModelBaseType, TableDefinitionType>;
  columnVisibility: TableColumnVisibilityState<TableViewModelBaseType>;
  pagination: TablePaginationState<TableViewModelBaseType, TableDefinitionType>;

  filter: TableFilterColumnState<TableViewModelBaseType, TableDefinitionType>;
};

const getKeywordSearchFromQueryString = <
  TableViewModelType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelType>
>(
  queryParams: URLSearchParams,
  tableDefinition: TableDefinitionType
): TableKeywordSearchState<TableViewModelType, TableDefinitionType> => {
  if (tableDefinition.keywordSearch === null) {
    return undefined as unknown as TableKeywordSearchState<
      TableViewModelType,
      TableDefinitionType
    >;
  }

  const keywordSearchQueryParam =
    queryParams.get(queryKeys.keywordSearch) ?? "";

  return tableDefinition.keywordSearch.decode(
    keywordSearchQueryParam
  ) as TableKeywordSearchState<TableViewModelType, TableDefinitionType>;
};

const getSortFromQueryString = <
  TableViewModelType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelType>
>(
  queryParams: URLSearchParams,
  tableDefinition: TableDefinitionType
): TableSortState<TableViewModelType, TableDefinitionType> => {
  const sortByQueryParam = queryParams.get(queryKeys.sortBy);
  const sortTargetColumn = tableDefinition.columns.find(
    (column) => column.key === sortByQueryParam && column.sortable
  );
  const sortOrderQueryParam = queryParams.get(queryKeys.sortOrder);
  const sortOrder =
    sortOrderQueryParam === "asc" || sortOrderQueryParam === "desc"
      ? sortOrderQueryParam
      : undefined;

  return (sortTargetColumn !== undefined && sortOrder !== undefined
    ? {
        sortBy: sortTargetColumn.key,
        sortOrder,
      }
    : undefined) as unknown as TableSortState<
    TableViewModelType,
    TableDefinitionType
  >;
};

const getFilterFromQueryString = <
  TableViewModelType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelType>
>(
  queryParams: URLSearchParams,
  tableDefinition: TableDefinitionType
): TableFilterColumnState<TableViewModelType, TableDefinitionType> => {
  let filter: TableFilterColumnState<TableViewModelType, TableDefinitionType>;

  try {
    const rawData = JSON.parse(queryParams.get(queryKeys.filter) ?? "");

    filter = Object.fromEntries(
      tableDefinition.columns
        .map(
          (column) =>
            [
              column.key,
              column.filter?.decode(rawData[column.key]) ?? null,
            ] as const
        )
        .filter(
          ([, value]) =>
            // value が undefined: filter が無効な列
            // value が null: フィルターが設定されていない
            value !== undefined
        )
    ) as TableFilterColumnState<TableViewModelType, TableDefinitionType>;
  } catch {
    // JSON.parse に失敗した場合は、フィルターを初期化する

    filter = Object.fromEntries(
      tableDefinition.columns
        .map((column) => [column.key, column.filter?.initial ?? null])
        .filter(
          ([, value]) =>
            // value が undefined: filter が無効な列
            // value が null: フィルターが設定されていない
            value !== undefined
        )
    ) as TableFilterColumnState<TableViewModelType, TableDefinitionType>;
  }

  return filter;
};

const getVisibleColumnsFromQueryString = <
  TableViewModelType extends AnyTableViewModelBase
>(
  queryParams: URLSearchParams,
  tableDefinition: TableDefinition<TableViewModelType>
): TableColumnVisibilityState<TableViewModelType> => {
  const columnVisibilityQueryParam = queryParams.get(
    queryKeys.columnVisibility
  );

  const visibleColumns = columnVisibilityQueryParam
    ?.split(",")
    .filter(
      (maybeColumnKey): maybeColumnKey is keyof TableViewModelType & string =>
        tableDefinition.columns.some((column) => maybeColumnKey === column.key)
    );
  if (visibleColumns === undefined || visibleColumns.length === 0) {
    return tableDefinition.columns
      .filter((column) => column.visibility.initialVisibility)
      .map((column) => column.key);
  }

  return visibleColumns;
};

const getPageFromQueryString = <
  TableViewModelType extends AnyTableViewModelBase,
  TableDefinitionType extends TableDefinition<TableViewModelType>
>(
  queryParams: URLSearchParams,
  tableDefinition: TableDefinitionType
): TablePaginationState<TableViewModelType, TableDefinitionType> => {
  if (tableDefinition.pagination === null) {
    return undefined as unknown as TablePaginationState<
      TableViewModelType,
      TableDefinitionType
    >;
  }

  const pageFromQuery = queryParams.get(queryKeys.page) ?? "";
  return (/^[1-9][0-9]*$/.test(pageFromQuery)
    ? Number(pageFromQuery)
    : 1) as unknown as TablePaginationState<
    TableViewModelType,
    TableDefinitionType
  >;
};

const queryKeys = {
  keywordSearch: "keyword",
  sortBy: "sortBy",
  sortOrder: "sortOrder",
  columnVisibility: "columns",
  page: "page",
  filter: "filter",
};

export const createTable = <
  TableViewModelType extends AnyTableViewModelBase
>() => {
  const defineColumnFilter = <FilterConditionType,>(
    columnFilterDefinition: NonNullColumnFilterDefinition<
      TableViewModelType,
      FilterConditionType
    >
  ): typeof columnFilterDefinition => columnFilterDefinition;

  const defineTable = <
    TableDefinitionType extends TableDefinition<TableViewModelType>
  >(
    tableDefinition: TableDefinitionType
  ) => {
    const useTableState = (): TableState<
      TableViewModelType,
      TableDefinitionType
    > => {
      const searchParams = useSearchParams();

      return {
        keywordSearch: getKeywordSearchFromQueryString(
          searchParams,
          tableDefinition
        ),
        sort: getSortFromQueryString(searchParams, tableDefinition),
        columnVisibility: getVisibleColumnsFromQueryString(
          searchParams,
          tableDefinition
        ),
        pagination: getPageFromQueryString(searchParams, tableDefinition),
        filter: getFilterFromQueryString(searchParams, tableDefinition),
      };
    };

    const useTableActions = () => {
      const searchParams = useSearchParams();
      const router = useRouter();

      const setKeywordSearch = (value: string) => {
        // keywordSearch が null の場合はこの関数を呼び出せないはず
        if (tableDefinition.keywordSearch === null) {
          throw new Error("キーワード検索が設定されていません");
        }

        const encodedValue = tableDefinition.keywordSearch.encode(value);

        const newSearchParams = new URLSearchParams(searchParams);

        newSearchParams.set(queryKeys.keywordSearch, encodedValue);
        newSearchParams.delete(queryKeys.page);

        router.push(`?${newSearchParams.toString()}`);
      };

      const setSort = (
        sortBy: TableSortKey<TableViewModelType, TableDefinitionType>,
        sortOrder: "asc" | "desc"
      ) => {
        const newSearchParams = new URLSearchParams(searchParams);

        newSearchParams.set(queryKeys.sortBy, sortBy);
        newSearchParams.set(queryKeys.sortOrder, sortOrder);
        newSearchParams.delete(queryKeys.page);

        router.push(`?${newSearchParams.toString()}`);
      };

      const resetSort = () => {
        const newSearchParams = new URLSearchParams(searchParams);

        newSearchParams.delete(queryKeys.sortBy);
        newSearchParams.delete(queryKeys.sortOrder);
        newSearchParams.delete(queryKeys.page);

        router.push(`?${newSearchParams.toString()}`);
      };

      /**
       * ソートの状態をトグルする
       *
       * asc -> desc -> undefined -> asc という順番でトグルする
       */
      const toggleSort = (
        sortBy: TableSortKey<TableViewModelType, TableDefinitionType>
      ) => {
        const sortByQueryParam = searchParams.get(queryKeys.sortBy);
        const sortOrderQueryParam = searchParams.get(queryKeys.sortOrder);

        if (sortByQueryParam === sortBy) {
          if (sortOrderQueryParam === "asc") {
            setSort(sortBy, "desc");
          } else {
            resetSort();
          }
        } else {
          setSort(sortBy, "asc");
        }
      };

      const setFilter = <ColumnKey extends keyof TableViewModelType>(
        columnKey: ColumnKey,
        filter: TableColumnFilterCondition<
          TableViewModelType,
          TableDefinitionType,
          ColumnKey
        >
      ) => {
        const currentFilter = getFilterFromQueryString<
          TableViewModelType,
          TableDefinitionType
        >(searchParams, tableDefinition);

        const newSearchParams = new URLSearchParams(searchParams);

        const newFilter = Object.fromEntries(
          Object.entries({
            ...(currentFilter as Record<string, unknown>),
            [columnKey]: filter,
          }).filter(([, value]) => value !== null)
        ) as TableFilterColumnState<TableViewModelType, TableDefinitionType>;

        const newFilterString = JSON.stringify(newFilter);

        newSearchParams.set(queryKeys.filter, newFilterString);

        router.push(`?${newSearchParams.toString()}`);
      };

      const setColumnVisibility = (
        columnKey: keyof TableViewModelType,
        isVisible: boolean
      ) => {
        const visibleColumns =
          getVisibleColumnsFromQueryString<TableViewModelType>(
            searchParams,
            tableDefinition
          );

        if (isVisible) {
          const newVisibleColumns = new Set([...visibleColumns, columnKey]);

          // すべての列が表示されている場合は、columnVisibility を削除する
          if (
            tableDefinition.columns.every((column) =>
              newVisibleColumns.has(column.key)
            )
          ) {
            const newSearchParams = new URLSearchParams(searchParams);

            newSearchParams.delete(queryKeys.columnVisibility);

            router.push(`?${newSearchParams.toString()}`);

            return;
          }

          // tableDefinition.columns の順番に従って文字列を組み立てる
          const newVisibleColumnsString = tableDefinition.columns
            .map((column) => column.key)
            .filter((columnKey) => newVisibleColumns.has(columnKey))
            .join(",");

          const newSearchParams = new URLSearchParams(searchParams);

          newSearchParams.set(
            queryKeys.columnVisibility,
            newVisibleColumnsString
          );

          router.push(`?${newSearchParams.toString()}`);

          return;
        }

        const newVisibleColumns = new Set(
          visibleColumns.filter((column) => column !== columnKey)
        );

        // 表示される列が無くなってしまう場合は、何もしない
        if (newVisibleColumns.size === 0) {
          return;
        }

        // tableDefinition.columns の順番に従って文字列を組み立てる
        const newVisibleColumnsString = tableDefinition.columns
          .map((column) => column.key)
          .filter((columnKey) => newVisibleColumns.has(columnKey))
          .join(",");

        const newSearchParams = new URLSearchParams(searchParams);

        newSearchParams.set(
          queryKeys.columnVisibility,
          newVisibleColumnsString
        );

        router.push(`?${newSearchParams.toString()}`);
      };

      const setPagination = (page: number) => {
        if (tableDefinition.pagination === null) {
          throw new Error("ページネーションが設定されていません");
        }

        const newSearchParams = new URLSearchParams(searchParams);

        newSearchParams.set(queryKeys.page, page.toString());

        router.push(`?${newSearchParams.toString()}`);
      };

      const goPreviousPage = () => {
        const currentPage = getPageFromQueryString<
          TableViewModelType,
          TableDefinitionType
        >(searchParams, tableDefinition);

        if (currentPage === undefined) {
          return;
        }

        setPagination(currentPage - 1);
      };

      const goNextPage = () => {
        const currentPage = getPageFromQueryString<
          TableViewModelType,
          TableDefinitionType
        >(searchParams, tableDefinition);

        if (currentPage === undefined) {
          return;
        }

        setPagination(currentPage + 1);
      };

      return {
        setKeywordSearch,
        setSort,
        toggleSort,
        setColumnVisibility,
        setPagination,
        goPreviousPage,
        goNextPage,
        setFilter,
      };
    };

    const Table: FC<{
      data: TableViewModelType[];
      totalCount: number;
    }> = ({ data, totalCount }) => {
      const tableState = useTableState();
      const tableActions = useTableActions();

      const [openedFilterColumnKey, setOpenedFilterColumnKey] = useState<
        keyof TableViewModelType | null
      >(null);

      const filteringColumns = tableDefinition.columns.filter(
        (column) =>
          tableState.columnVisibility.includes(column.key) &&
          column.filter !== null &&
          tableState.filter[column.key] !== null
      );
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {tableDefinition.keywordSearch &&
              tableDefinition.keywordSearch.renderSearchInput({
                value: tableState.keywordSearch ?? "",
                onChange: tableActions.setKeywordSearch,
              })}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {tableDefinition.columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key as string}
                    checked={tableState.columnVisibility.includes(
                      column.key as string
                    )}
                    onCheckedChange={(checked) =>
                      tableActions.setColumnVisibility(
                        column.key as string,
                        checked
                      )
                    }
                  >
                    {column.renderHeadCell()}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {filteringColumns.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filteringColumns.map((column) => (
                <div
                  key={column.key as string}
                  className="flex items-center gap-1 bg-primary-foreground text-primary-background rounded-full px-2"
                >
                  <div>{column.renderHeadCell()}</div>
                  {column.filter?.renderFilterChipContent({
                    filter: tableState.filter[column.key],
                  })}
                  <Button
                    variant="ghost"
                    onClick={() =>
                      tableActions.setFilter(
                        column.key,
                        // @ts-expect-error column は ColumnDefinition なので、key は必ず存在する
                        null
                      )
                    }
                  >
                    <X aria-label="clear" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <ShadCNUiTable.Table>
            <ShadCNUiTable.TableHeader>
              <ShadCNUiTable.TableRow>
                {tableDefinition.columns
                  .filter((column) =>
                    tableState.columnVisibility.includes(column.key)
                  )
                  .map((column) => (
                    <ShadCNUiTable.TableHead key={column.key as string}>
                      {column.renderHeadCell()}
                      {column.sortable && (
                        <Button
                          onClick={() =>
                            tableActions.toggleSort(
                              // @ts-expect-error column は ColumnDefinition なので、key は必ず存在する
                              column.key
                            )
                          }
                          variant="ghost"
                        >
                          {tableState.sort?.sortBy === column.key ? (
                            tableState.sort?.sortOrder === "asc" ? (
                              <ArrowDown />
                            ) : (
                              <ArrowUp />
                            )
                          ) : (
                            <ArrowUpDown />
                          )}
                        </Button>
                      )}
                      {column.filter && (
                        <Popover
                          open={openedFilterColumnKey === column.key}
                          onOpenChange={(open) =>
                            setOpenedFilterColumnKey(open ? column.key : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button variant="ghost">
                              <Filter />
                            </Button>
                          </PopoverTrigger>
                          <PopoverAnchor>
                            <PopoverContent>
                              {column.filter.renderPopupContent({
                                filter: tableState.filter[column.key],
                                setFilter: (filter) => {
                                  tableActions.setFilter(column.key, filter);
                                  setOpenedFilterColumnKey(null);
                                },
                                rows: data,
                                isOpen: openedFilterColumnKey === column.key,
                                onClose: () => setOpenedFilterColumnKey(null),
                              })}
                            </PopoverContent>
                          </PopoverAnchor>
                        </Popover>
                      )}
                    </ShadCNUiTable.TableHead>
                  ))}
              </ShadCNUiTable.TableRow>
            </ShadCNUiTable.TableHeader>
            <ShadCNUiTable.TableBody>
              {data.map((row, rowIndex) => (
                <ShadCNUiTable.TableRow key={rowIndex}>
                  {tableDefinition.columns
                    .filter((column) =>
                      tableState.columnVisibility.includes(column.key)
                    )
                    .map((column) => (
                      <ShadCNUiTable.TableCell key={column.key as string}>
                        {column.renderBodyCell({
                          rowIndex,
                          row,
                          data,
                        })}
                      </ShadCNUiTable.TableCell>
                    ))}
                </ShadCNUiTable.TableRow>
              ))}
            </ShadCNUiTable.TableBody>
          </ShadCNUiTable.Table>
          {tableDefinition.pagination && (
            <div className="flex items-center justify-end space-x-2 pt-4">
              <div className="flex-1 text-sm text-muted-foreground">
                {`Page ${tableState.pagination} of ${Math.ceil(
                  totalCount / tableDefinition.pagination.parPage
                )}, Total ${totalCount} items`}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => tableActions.goPreviousPage()}
                  disabled={tableState.pagination === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => tableActions.goNextPage()}
                  disabled={
                    tableState.pagination ===
                    Math.ceil(totalCount / tableDefinition.pagination.parPage)
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    };

    return {
      useTableState,
      tableDefinition,
      Table,
    };
  };

  return {
    table: defineTable,
    columnFilter: defineColumnFilter,
  };
};
