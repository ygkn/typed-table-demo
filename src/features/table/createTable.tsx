import { useState } from "react";
import { ColumnDefinition, TableOptions, ExtractColumnKeys } from "./types";
import { useTableState } from "./useTableState";
import { useTableActions } from "./useTableActions";
import {
  defineTableColumnFilter,
  defineTableColumnFilterWithSchema,
  createFilterEncoderDecoder,
} from "./filterUtils";

/**
 * テーブルコンポーネントファクトリー関数
 *
 * このAPIは型安全なテーブルコンポーネントを作成します。
 * テーブルの状態（ソート、フィルター、表示列など）はURLパラメータに格納され、
 * ページリロードやリンク共有時に保持されます。
 *
 * @param columnDefinitions - テーブルのカラム定義配列
 * @param options - テーブルのオプション設定
 * @returns テーブルインスタンス（フックとヘルパー関数を含む）
 */
export function createTable<
  const Columns extends readonly ColumnDefinition<string>[]
>(columnDefinitions: Columns, options?: TableOptions) {
  // テーブルの状態を管理するフック
  const useTable = () => {
    const state = useTableState(columnDefinitions, options);
    const actions = useTableActions(columnDefinitions, state, options);

    return {
      state,
      actions,
    };
  };

  // フィルターポップアップの状態管理フック
  const useFilterPopup = () => {
    const [openedFilterColumnKey, setOpenedFilterColumnKey] =
      useState<ExtractColumnKeys<Columns> | null>(null);
    return {
      openedFilterColumnKey,
      setOpenedFilterColumnKey,
    };
  };

  return {
    useTable,
    columnDefinitions,
    useFilterPopup,
  };
}

// ユーティリティ関数のみをエクスポート
export {
  defineTableColumnFilter,
  defineTableColumnFilterWithSchema,
  createFilterEncoderDecoder,
};
