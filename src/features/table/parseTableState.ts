import {
  ColumnDefinition,
  ExtractColumnKeys,
  SortableColumnKeys,
  FilterTypeMap,
  TableOptions,
  TableState,
} from "./types";

/**
 * テーブルのクエリパラメータのキーを生成する
 *
 * @param options テーブルのオプション
 * @returns クエリパラメータのキーオブジェクト
 */
export const getQueryKeys = (options?: TableOptions) => {
  const prefix = options?.queryParamPrefix ?? "table";
  const filterPrefix = `${prefix}_filter_`;

  return {
    keywordSearch: `${prefix}_keyword`,
    sortBy: `${prefix}_sort_by`,
    sortOrder: `${prefix}_sort_order`,
    columnVisibility: `${prefix}_columns`,
    page: `${prefix}_page`,
    filterPrefix,
  };
};

/**
 * テーブルの状態をURLパラメータから解析する
 *
 * @param searchParams URLSearchParamsオブジェクト
 * @param queryKeys クエリキーオブジェクト
 * @param columnDefinitions カラム定義配列
 * @returns テーブルの状態
 */
export const parseTableState = <Columns extends readonly ColumnDefinition[]>(
  searchParams: URLSearchParams,
  queryKeys: ReturnType<typeof getQueryKeys>,
  columnDefinitions: Columns
): TableState<Columns> => {
  // キーワード検索
  const keywordSearch = searchParams.get(queryKeys.keywordSearch);

  // ソート
  const sortByParam = searchParams.get(queryKeys.sortBy);
  const sortBy =
    sortByParam &&
    columnDefinitions.some((col) => col.key === sortByParam && col.sortable)
      ? (sortByParam as SortableColumnKeys<Columns>)
      : null;

  const sortOrderParam = searchParams.get(queryKeys.sortOrder);
  const sortOrder =
    sortOrderParam === "asc" || sortOrderParam === "desc"
      ? sortOrderParam
      : null;

  // 列の表示/非表示
  const columnVisibilityParam = searchParams.get(queryKeys.columnVisibility);
  const columnVisibility = parseColumnVisibility<Columns>(
    columnVisibilityParam,
    columnDefinitions
  );

  // ページネーション
  const pageParam = searchParams.get(queryKeys.page);
  const pagination = /[0-9]+/.test(pageParam ?? "")
    ? parseInt(pageParam ?? "")
    : 1;

  // フィルター
  const filter = parseFilters<Columns>(
    searchParams,
    queryKeys,
    columnDefinitions
  );

  return {
    keywordSearch,
    sort: { sortBy, sortOrder },
    columnVisibility,
    pagination,
    filter,
  };
};

/**
 * クエリパラメータからテーブルの列表示設定を解析する
 *
 * @param columnVisibilityParam 列表示のクエリパラメータ
 * @param columnDefinitions カラム定義配列
 * @returns 表示する列の配列
 */
const parseColumnVisibility = <Columns extends readonly ColumnDefinition[]>(
  columnVisibilityParam: string | null,
  columnDefinitions: Columns
): ExtractColumnKeys<Columns>[] => {
  const columnVisibilityArrayFromParam = (columnVisibilityParam ?? "")
    .split(",")
    .filter((key): key is ExtractColumnKeys<Columns> =>
      columnDefinitions.some((col) => col.key === key)
    );

  return columnVisibilityArrayFromParam.length > 0
    ? columnVisibilityArrayFromParam
    : (columnDefinitions
        .filter((col) => col.initialVisibility)
        .map((col) => col.key) as ExtractColumnKeys<Columns>[]);
};

/**
 * クエリパラメータからフィルター設定を解析する
 *
 * @param searchParams 検索パラメータオブジェクト
 * @param queryKeys クエリキーオブジェクト
 * @param columnDefinitions カラム定義配列
 * @returns フィルター設定オブジェクト
 */
const parseFilters = <Columns extends readonly ColumnDefinition[]>(
  searchParams: URLSearchParams,
  queryKeys: ReturnType<typeof getQueryKeys>,
  columnDefinitions: Columns
): FilterTypeMap<Columns> => {
  const filter = {} as FilterTypeMap<Columns>;

  try {
    columnDefinitions.forEach((col) => {
      const colKey = col.key as ExtractColumnKeys<Columns>;

      if (col.filter) {
        const filterParamKey = `${queryKeys.filterPrefix}${colKey}`;
        const encodedFilterValue = searchParams.get(filterParamKey);

        if (encodedFilterValue !== null) {
          try {
            const filterValue = col.filter.decodeFromUrl(encodedFilterValue);
            if (filterValue !== null) {
              (filter as Record<string, unknown>)[colKey] = filterValue;
            }
          } catch (error) {
            console.error(`Failed to decode filter for ${colKey}:`, error);
          }
        }
      }
    });
  } catch (error) {
    console.error("Error parsing filter parameters:", error);
  }

  return filter;
};
