import { useMemo } from "react";
import {
  ColumnDefinition,
  ExtractColumnKeys,
  SortableColumnKeys,
  FilterableColumnKeys,
  FilterTypeByColumnKey,
  TableState,
  TableOptions,
} from "./types";
import { useQueryParams } from "./useQueryParams";

/**
 * テーブルのアクションを提供するフック
 *
 * @param columnDefinitions カラム定義配列
 * @param tableState テーブルの状態
 * @param options テーブルのオプション
 * @returns テーブルのアクション関数
 */
export const useTableActions = <Columns extends readonly ColumnDefinition[]>(
  columnDefinitions: Columns,
  tableState: TableState<Columns>,
  options?: TableOptions
) => {
  const { queryKeys, updateQueryParams } = useQueryParams(options);

  // アクション関数
  const actions = useMemo(
    () => ({
      /**
       * キーワード検索を設定
       *
       * @param keyword 検索キーワード
       */
      setKeywordSearch: (keyword: string) => {
        updateQueryParams(
          {
            [queryKeys.keywordSearch]: keyword || null,
          },
          true
        );
      },

      /**
       * ソート設定を変更
       *
       * @param sortBy ソートするカラム
       * @param sortOrder ソート順序
       */
      setSort: (
        sortBy: SortableColumnKeys<Columns> | null,
        sortOrder: "asc" | "desc" | null
      ) => {
        updateQueryParams({
          [queryKeys.sortBy]: sortBy,
          [queryKeys.sortOrder]: sortOrder,
        });
      },

      /**
       * ソートをトグル（クリック時の挙動）
       *
       * @param sortBy ソートするカラム
       */
      toggleSort: (sortBy: SortableColumnKeys<Columns>) => {
        if (tableState.sort.sortBy === sortBy) {
          if (tableState.sort.sortOrder === "asc") {
            actions.setSort(sortBy, "desc");
          } else {
            actions.setSort(null, null);
          }
        } else {
          actions.setSort(sortBy, "asc");
        }
      },

      /**
       * 列の表示/非表示を切り替え
       *
       * @param columnKey カラムキー
       * @param isVisible 表示するかどうか
       */
      setColumnVisibility: (
        columnKey: ExtractColumnKeys<Columns>,
        isVisible: boolean
      ) => {
        let newVisibleColumns: ExtractColumnKeys<Columns>[];

        if (isVisible) {
          newVisibleColumns = [...tableState.columnVisibility, columnKey];
        } else {
          newVisibleColumns = tableState.columnVisibility.filter(
            (col) => col !== columnKey
          );
        }

        // 少なくとも1つの列は表示されるようにする
        if (newVisibleColumns.length === 0) return;

        updateQueryParams({
          [queryKeys.columnVisibility]: newVisibleColumns.join(","),
        });
      },

      /**
       * フィルターを設定
       *
       * @param columnKey カラムキー
       * @param filterValue フィルター値
       */
      setFilter: <K extends FilterableColumnKeys<Columns>>(
        columnKey: K,
        filterValue: FilterTypeByColumnKey<Columns, K> | null
      ): void => {
        const filterParamKey = `${queryKeys.filterPrefix}${columnKey}`;

        if (filterValue === null) {
          // フィルターを削除
          updateQueryParams({ [filterParamKey]: null }, true);
          return;
        }

        // カラム定義を取得
        const columnDef = columnDefinitions.find(
          (col) => col.key === columnKey
        );

        if (columnDef?.filter) {
          // フィルター値をエンコード
          const encodedValue = columnDef.filter.encodeForUrl(
            filterValue as FilterTypeByColumnKey<Columns, K>
          );
          updateQueryParams({ [filterParamKey]: encodedValue }, true);
        }
      },

      /**
       * ページネーションを設定
       *
       * @param page ページ番号
       */
      setPagination: (page: number) => {
        updateQueryParams({
          [queryKeys.page]: page.toString(),
        });
      },
    }),
    [queryKeys, updateQueryParams, tableState, columnDefinitions]
  );

  return actions;
};
