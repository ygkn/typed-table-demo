import { ReactNode, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as v from "valibot";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ColumnFilterDefinition<FilterCondition = any> = {
  /**
   * フィルターポップアップのコンテンツをレンダリングする関数
   */
  renderPopupContent: (props: {
    filter: FilterCondition | null;
    setFilter: (filter: FilterCondition | null) => void;
    onClose: () => void;
  }) => ReactNode;
  /**
   * フィルターチップのコンテンツをレンダリングする関数
   */
  renderFilterChipContent: (props: {
    filter: v.NonNullable<FilterCondition>;
  }) => ReactNode;
  /**
   * フィルターの初期値
   */
  initial: FilterCondition | null;
  /**
   * フィルター値をURLクエリパラメータ用に文字列にエンコードする関数
   */
  encodeForUrl: (filter: FilterCondition) => string;
  /**
   * URLクエリパラメータの文字列からフィルター値をデコードする関数
   */
  decodeFromUrl: (encoded: string) => FilterCondition | null;
};

// ValibotスキーマからURLパラメータのエンコード/デコード関数を生成するユーティリティ
export function createFilterEncoderDecoder<
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
>(schema: TSchema) {
  // エンコード関数：値をバリデーションした後、JSON文字列化
  const encodeForUrl = (value: v.InferOutput<TSchema>): string => {
    // 値をバリデーション（スキーマに合わない場合は例外）
    const validated = v.parse(schema, value);
    return JSON.stringify(validated);
  };

  // デコード関数：文字列をパースしてからバリデーション
  const decodeFromUrl = (encoded: string): v.InferOutput<TSchema> | null => {
    try {
      // JSON文字列をパース
      const parsed = JSON.parse(encoded);
      // パースした値をバリデーション
      return v.parse(schema, parsed);
    } catch {
      return null;
    }
  };

  return { encodeForUrl, decodeFromUrl };
}

export type ColumnDefinition<
  ColumnKey extends string = string,
  TFilterDefinition extends ColumnFilterDefinition | null = ColumnFilterDefinition | null
> = {
  key: ColumnKey;
  filter: TFilterDefinition;
  sortable: boolean;
  initialVisibility: boolean;
  renderHeadCell: () => ReactNode;
};

/**
 * 配列の要素型を取得するユーティリティ型
 * 例: [1, 2, 3] の配列から 1 | 2 | 3 のユニオン型を取得
 */
type ArrayElementUnion<T extends readonly unknown[]> = T[number];

/**
 * カラム定義配列から列キーのユニオン型を抽出するユーティリティ型
 * 例: カラム定義配列から "id" | "name" | "createdAt" のようなキー型を取得
 */
type ExtractColumnKeys<Columns extends readonly ColumnDefinition[]> =
  ArrayElementUnion<Columns>["key"];

/**
 * カラム定義からフィルター機能を持つカラムを抽出する型
 * filterプロパティがnullでないカラム定義を抽出
 */
type FilterableColumn<Column> = Column extends ColumnDefinition<
  string,
  infer FilterDefinition
>
  ? null extends FilterDefinition
    ? never
    : Column
  : never;

/**
 * フィルター可能なカラムからカラムキーのみを抽出する型
 */
type FilterableColumnKeys<Columns extends readonly ColumnDefinition[]> =
  FilterableColumn<ArrayElementUnion<Columns>>["key"];

/**
 * ソート可能なカラムを抽出する型
 * sortableプロパティがtrueのカラム定義を抽出
 */
type SortableColumn<Column> = Column extends ColumnDefinition<string> & {
  sortable: true;
}
  ? Column
  : never;

/**
 * ソート可能なカラムからカラムキーのみを抽出する型
 */
type SortableColumnKeys<Columns extends readonly ColumnDefinition[]> =
  SortableColumn<ArrayElementUnion<Columns>>["key"];

/**
 * カラム定義からフィルター条件の型を抽出する型
 */
type ExtractFilterCondition<Column> = Column extends ColumnDefinition<
  string,
  infer FilterDefinition
>
  ? FilterDefinition extends ColumnFilterDefinition<infer FilterCondition>
    ? FilterCondition | null
    : never
  : never;

/**
 * 特定のカラムキーに対応するフィルター条件型を取得する型
 */
type FilterTypeByColumnKey<
  Columns extends readonly ColumnDefinition[],
  ColumnKey extends FilterableColumnKeys<Columns>
> = ExtractFilterCondition<
  Extract<ArrayElementUnion<Columns>, { key: ColumnKey }>
>;

/**
 * カラム定義配列からフィルター型マップを構築するユーティリティ型
 * カラムキーとそれに対応するフィルター条件型のマッピングを作成
 */
type FilterTypeMap<Columns extends readonly ColumnDefinition[]> = {
  [Key in FilterableColumnKeys<Columns>]: FilterTypeByColumnKey<Columns, Key>;
};

type TableState<Columns extends readonly ColumnDefinition[]> = {
  keywordSearch: string | null;
  sort: {
    sortBy: SortableColumnKeys<Columns> | null;
    sortOrder: "asc" | "desc" | null;
  };
  columnVisibility: ExtractColumnKeys<Columns>[];
  pagination: number;
  filter: FilterTypeMap<Columns>;
};

// テーブルのオプション型定義
export type TableOptions = {
  /**
   * テーブル名（設定時、クエリパラメータに${tableName}_プレフィックスが付きます）
   */
  tableName?: string;
};

const baseQueryKeys = {
  keywordSearch: "keyword",
  sortBy: "sortBy",
  sortOrder: "sortOrder",
  columnVisibility: "columns",
  page: "page",
  filterPrefix: "f_",
};

export function createTable<
  const Columns extends readonly ColumnDefinition<string>[]
>(columnDefinitions: Columns, options?: TableOptions) {
  // テーブル名からプレフィックスを生成
  const prefix = options?.tableName ? `${options.tableName}_` : "";

  // プレフィックス付きのクエリキーを生成
  const queryKeys = {
    keywordSearch: `${prefix}${baseQueryKeys.keywordSearch}`,
    sortBy: `${prefix}${baseQueryKeys.sortBy}`,
    sortOrder: `${prefix}${baseQueryKeys.sortOrder}`,
    columnVisibility: `${prefix}${baseQueryKeys.columnVisibility}`,
    page: `${prefix}${baseQueryKeys.page}`,
    filterPrefix: `${prefix}${baseQueryKeys.filterPrefix}`,
  };

  // テーブルの状態を管理するフック
  const useTable = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    // クエリパラメータから状態を取得
    const getTableState = (): TableState<Columns> => {
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
      const columnVisibilityParam = searchParams.get(
        queryKeys.columnVisibility
      );
      const columnVisibilityArrayFromParam = (columnVisibilityParam ?? "")
        .split(",")
        .filter((key): key is ExtractColumnKeys<Columns> =>
          columnDefinitions.some((col) => col.key === key)
        );
      const columnVisibility =
        columnVisibilityArrayFromParam.length > 0
          ? columnVisibilityArrayFromParam
          : (columnDefinitions
              .filter((col) => col.initialVisibility)
              .map((col) => col.key) as ExtractColumnKeys<Columns>[]);

      // ページネーション
      const pageParam = searchParams.get(queryKeys.page);
      const pagination = /[0-9]+/.test(pageParam ?? "")
        ? parseInt(pageParam ?? "")
        : 1;

      // フィルター
      const filter = {} as FilterTypeMap<Columns>;
      try {
        // 各カラム定義を走査して、対応するフィルタークエリパラメータを探す
        columnDefinitions.forEach((col) => {
          const colKey = col.key as ExtractColumnKeys<Columns>;

          // フィルターが定義されているカラムのみ処理
          if (col.filter) {
            // f_${カラムキー} の形式でクエリパラメータを探す
            const filterParamKey = `${queryKeys.filterPrefix}${colKey}`;
            const encodedFilterValue = searchParams.get(filterParamKey);

            if (encodedFilterValue !== null) {
              try {
                // カスタムのデコード関数でフィルター値をデコード
                const filterValue =
                  col.filter.decodeFromUrl(encodedFilterValue);
                if (filterValue !== null) {
                  (filter as Record<string, unknown>)[colKey] = filterValue;
                }
              } catch (error) {
                // デコードエラーは無視して、そのフィルターはスキップ
                console.error(`Failed to decode filter for ${colKey}:`, error);
              }
            }
          }
        });
      } catch (error) {
        // エラー時は空のフィルターを返す
        console.error("Error parsing filter parameters:", error);
      }

      return {
        keywordSearch,
        sort: { sortBy, sortOrder },
        columnVisibility,
        pagination,
        filter,
      };
    };

    // 状態を更新する関数
    const setKeywordSearch = (keyword: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (keyword) {
        newParams.set(queryKeys.keywordSearch, keyword);
      } else {
        newParams.delete(queryKeys.keywordSearch);
      }
      newParams.delete(queryKeys.page);
      router.push(`?${newParams.toString()}`);
    };

    const setSort = (
      sortBy: SortableColumnKeys<Columns> | null,
      sortOrder: "asc" | "desc" | null
    ) => {
      const newParams = new URLSearchParams(searchParams);
      if (sortBy && sortOrder) {
        newParams.set(queryKeys.sortBy, sortBy as string);
        newParams.set(queryKeys.sortOrder, sortOrder);
      } else {
        newParams.delete(queryKeys.sortBy);
        newParams.delete(queryKeys.sortOrder);
      }
      router.push(`?${newParams.toString()}`);
    };

    const toggleSort = (sortBy: SortableColumnKeys<Columns>) => {
      const state = getTableState();
      if (state.sort.sortBy === sortBy) {
        if (state.sort.sortOrder === "asc") {
          setSort(sortBy, "desc");
        } else {
          setSort(null, null);
        }
      } else {
        setSort(sortBy, "asc");
      }
    };

    const setColumnVisibility = (
      columnKey: ExtractColumnKeys<Columns>,
      isVisible: boolean
    ) => {
      const state = getTableState();
      let newVisibleColumns: ExtractColumnKeys<Columns>[];

      if (isVisible) {
        newVisibleColumns = [...state.columnVisibility, columnKey];
      } else {
        newVisibleColumns = state.columnVisibility.filter(
          (col) => col !== columnKey
        );
      }

      // 少なくとも1つの列は表示されるようにする
      if (newVisibleColumns.length === 0) return;

      const newParams = new URLSearchParams(searchParams);
      newParams.set(queryKeys.columnVisibility, newVisibleColumns.join(","));
      router.push(`?${newParams.toString()}`);
    };

    // 型安全なフィルター設定
    const setFilter = <K extends FilterableColumnKeys<Columns>>(
      columnKey: K,
      filterValue: FilterTypeByColumnKey<Columns, K> | null
    ): void => {
      const newParams = new URLSearchParams(searchParams);
      const filterParamKey = `${queryKeys.filterPrefix}${columnKey}`;

      if (filterValue === null) {
        // フィルターを削除
        newParams.delete(filterParamKey);
      } else {
        // カラム定義を取得
        const columnDef = columnDefinitions.find(
          (col) => col.key === columnKey
        );

        if (columnDef?.filter) {
          // フィルター値をエンコード
          const encodedValue = columnDef.filter.encodeForUrl(
            filterValue as FilterTypeByColumnKey<Columns, K>
          );
          newParams.set(filterParamKey, encodedValue);
        }
      }

      // ページをリセット
      newParams.delete(queryKeys.page);
      router.push(`?${newParams.toString()}`);
    };

    const setPagination = (page: number) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set(queryKeys.page, page.toString());
      router.push(`?${newParams.toString()}`);
    };

    return {
      state: getTableState(),
      actions: {
        setKeywordSearch,
        setSort,
        toggleSort,
        setColumnVisibility,
        setFilter,
        setPagination,
      },
    };
  };

  return {
    useTable,
    columnDefinitions,
    // フィルターポップアップの状態
    useFilterPopup: () => {
      const [openedFilterColumnKey, setOpenedFilterColumnKey] =
        useState<ExtractColumnKeys<Columns> | null>(null);
      return {
        openedFilterColumnKey,
        setOpenedFilterColumnKey,
      };
    },
  };
}

export const defineTableColumnFilter = <FilterCondition,>(
  columnFilterDefinition: Omit<
    ColumnFilterDefinition<FilterCondition>,
    "encodeForUrl" | "decodeFromUrl"
  > & {
    encodeForUrl: ((filter: FilterCondition) => string) | undefined;
    decodeFromUrl: ((encoded: string) => FilterCondition | null) | undefined;
  }
): ColumnFilterDefinition<FilterCondition> => ({
  ...columnFilterDefinition,
  encodeForUrl:
    columnFilterDefinition.encodeForUrl ??
    ((filter: FilterCondition) => JSON.stringify(filter)),
  decodeFromUrl:
    columnFilterDefinition.decodeFromUrl ??
    ((encoded: string) => {
      try {
        return JSON.parse(encoded) as FilterCondition;
      } catch {
        return null;
      }
    }),
});

// Valibotスキーマを使用してフィルター定義を作成するヘルパー
export const defineTableColumnFilterWithSchema = <
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
>(
  schema: TSchema,
  columnFilterDefinition: Omit<
    ColumnFilterDefinition<v.InferOutput<TSchema>>,
    "encodeForUrl" | "decodeFromUrl"
  >
): ColumnFilterDefinition<v.InferOutput<TSchema>> => {
  const { encodeForUrl, decodeFromUrl } =
    createFilterEncoderDecoder<TSchema>(schema);

  return {
    ...columnFilterDefinition,
    encodeForUrl,
    decodeFromUrl,
  };
};
