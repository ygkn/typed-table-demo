import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { TableOptions } from "./types";
import { getQueryKeys } from "./parseTableState";

/**
 * テーブルのクエリパラメータ操作フック
 *
 * @param options テーブルのオプション
 * @returns クエリパラメータの操作メソッド
 */
export const useQueryParams = (options?: TableOptions) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // クエリパラメータキーを生成
  const queryKeys = useMemo(() => getQueryKeys(options), [options]);

  /**
   * クエリパラメータを更新する
   *
   * @param updates クエリパラメータの更新内容
   * @param resetPage ページをリセットするかどうか
   */
  const updateQueryParams = (
    updates: Record<string, string | null>,
    resetPage = false
  ) => {
    const newParams = new URLSearchParams(searchParams);

    // 更新内容を適用
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    // ページをリセットする場合
    if (resetPage) {
      newParams.delete(queryKeys.page);
    }

    // ページを更新
    router.push(`?${newParams.toString()}`);
  };

  return {
    searchParams,
    queryKeys,
    updateQueryParams,
  };
};
