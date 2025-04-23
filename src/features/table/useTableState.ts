import { useMemo } from "react";
import { ColumnDefinition, TableState, TableOptions } from "./types";
import { useQueryParams } from "./useQueryParams";
import { parseTableState } from "./parseTableState";

/**
 * テーブルの状態を管理するフック
 *
 * @param columnDefinitions カラム定義配列
 * @param options テーブルのオプション
 * @returns テーブルの状態
 */
export const useTableState = <Columns extends readonly ColumnDefinition[]>(
  columnDefinitions: Columns,
  options?: TableOptions
) => {
  const { searchParams, queryKeys } = useQueryParams(options);

  // テーブルの状態をURLパラメータから作成
  const tableState = useMemo<TableState<Columns>>(() => {
    return parseTableState(searchParams, queryKeys, columnDefinitions);
  }, [searchParams, queryKeys, columnDefinitions]);

  return tableState;
};
