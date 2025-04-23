import { ReactNode } from "react";
import * as v from "valibot";

/**
 * カラムフィルターの定義型
 */

export type ColumnFilterDefinition<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unknownにするとうまく型推論できない
  FilterCondition = any
> = {
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

// カラム定義型
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
 */
export type ArrayElementUnion<T extends readonly unknown[]> = T[number];

/**
 * カラム定義配列から列キーのユニオン型を抽出するユーティリティ型
 */
export type ExtractColumnKeys<Columns extends readonly ColumnDefinition[]> =
  ArrayElementUnion<Columns>["key"];

/**
 * カラム定義からフィルター機能を持つカラムを抽出する型
 */
export type FilterableColumn<Column> = Column extends ColumnDefinition<
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
export type FilterableColumnKeys<Columns extends readonly ColumnDefinition[]> =
  FilterableColumn<ArrayElementUnion<Columns>>["key"];

/**
 * ソート可能なカラムを抽出する型
 */
export type SortableColumn<Column> = Column extends ColumnDefinition<string> & {
  sortable: true;
}
  ? Column
  : never;

/**
 * ソート可能なカラムからカラムキーのみを抽出する型
 */
export type SortableColumnKeys<Columns extends readonly ColumnDefinition[]> =
  SortableColumn<ArrayElementUnion<Columns>>["key"];

/**
 * カラム定義からフィルター条件の型を抽出する型
 */
export type ExtractFilterCondition<Column> = Column extends ColumnDefinition<
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
export type FilterTypeByColumnKey<
  Columns extends readonly ColumnDefinition[],
  ColumnKey extends FilterableColumnKeys<Columns>
> = ExtractFilterCondition<
  Extract<ArrayElementUnion<Columns>, { key: ColumnKey }>
>;

/**
 * カラム定義配列からフィルター型マップを構築するユーティリティ型
 */
export type FilterTypeMap<Columns extends readonly ColumnDefinition[]> = {
  [Key in FilterableColumnKeys<Columns>]: FilterTypeByColumnKey<Columns, Key>;
};

// テーブルの状態型
export type TableState<Columns extends readonly ColumnDefinition[]> = {
  keywordSearch: string | null;
  sort: {
    sortBy: SortableColumnKeys<Columns> | null;
    sortOrder: SortOrder | null;
  };
  columnVisibility: ExtractColumnKeys<Columns>[];
  pagination: number;
  filter: FilterTypeMap<Columns>;
};

/**
 * ソート順序の型
 */
export type SortOrder = "asc" | "desc";

// テーブルのオプション型
export type TableOptions = {
  /**
   * テーブル名（設定時、クエリパラメータに${tableName}_プレフィックスが付きます）
   */
  tableName?: string;
  /**
   * クエリパラメータのプレフィックス（デフォルトは"table"）
   */
  queryParamPrefix?: string;
};
