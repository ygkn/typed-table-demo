import * as v from "valibot";
import { ColumnFilterDefinition } from "./types";

/**
 * ValibotスキーマからURLパラメータのエンコード/デコード関数を生成するユーティリティ
 *
 * @param schema バリデーション用のvalibotスキーマ
 * @returns エンコードとデコード関数のオブジェクト
 */
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

/**
 * テーブルの列にフィルター機能を追加するための定義を作成します
 *
 * @param columnFilterDefinition フィルター定義オブジェクト
 * @returns 完全なフィルター定義
 */
export const defineTableColumnFilter = <FilterCondition>(
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

/**
 * Valibotスキーマを使用してフィルター定義を作成するヘルパー
 *
 * @param schema バリデーション用のvalibotスキーマ
 * @param columnFilterDefinition フィルター定義オブジェクト
 * @returns 完全なフィルター定義
 */
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
