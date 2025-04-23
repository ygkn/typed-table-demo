import { describe, expect, it } from "vitest";
import { getQueryKeys, parseTableState } from "./parseTableState";
import { ColumnDefinition } from "./types";
import { defineTableColumnFilter } from "./filterUtils";

describe("getQueryKeys", () => {
  it("デフォルトのプレフィックスでキーを生成する", () => {
    const keys = getQueryKeys();
    expect(keys).toEqual({
      keywordSearch: "table_keyword",
      sortBy: "table_sort_by",
      sortOrder: "table_sort_order",
      columnVisibility: "table_columns",
      page: "table_page",
      filterPrefix: "table_filter_",
    });
  });

  it("カスタムプレフィックスでキーを生成する", () => {
    const keys = getQueryKeys({ queryParamPrefix: "custom" });
    expect(keys).toEqual({
      keywordSearch: "custom_keyword",
      sortBy: "custom_sort_by",
      sortOrder: "custom_sort_order",
      columnVisibility: "custom_columns",
      page: "custom_page",
      filterPrefix: "custom_filter_",
    });
  });
});

describe("parseTableState", () => {
  // テスト用のカラム定義
  const columnDefinitions = [
    {
      key: "id",
      renderHeadCell: () => "ID",
      sortable: true,
      initialVisibility: true,
      filter: null,
    },
    {
      key: "name",
      renderHeadCell: () => "名前",
      sortable: true,
      initialVisibility: true,
      filter: defineTableColumnFilter<string>({
        decodeFromUrl: (value: string) => value,
        encodeForUrl: (value: string) => value,
        renderPopupContent: () => "名前",
        renderFilterChipContent: () => "名前",
        initial: null,
      }),
    },
    {
      key: "age",
      renderHeadCell: () => "年齢",
      sortable: false,
      initialVisibility: false,
      filter: defineTableColumnFilter<number>({
        decodeFromUrl: (value: string) => parseInt(value),
        encodeForUrl: (value: number) => value.toString(),
        renderPopupContent: () => "年齢",
        renderFilterChipContent: () => "年齢",
        initial: null,
      }),
    },
  ] as const satisfies readonly ColumnDefinition[];

  const queryKeys = getQueryKeys();

  it("空のURLパラメータからデフォルト値を返す", () => {
    const searchParams = new URLSearchParams();
    const state = parseTableState(searchParams, queryKeys, columnDefinitions);

    expect(state).toEqual({
      keywordSearch: null,
      sort: { sortBy: null, sortOrder: null },
      columnVisibility: ["id", "name"],
      pagination: 1,
      filter: {},
    });
  });

  it("キーワード検索パラメータを正しく解析する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(queryKeys.keywordSearch, "検索キーワード");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state.keywordSearch).toBe("検索キーワード");
  });

  it("ソートパラメータを正しく解析する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(queryKeys.sortBy, "id");
    searchParams.set(queryKeys.sortOrder, "desc");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state.sort).toEqual({
      sortBy: "id",
      sortOrder: "desc",
    });
  });

  it("無効なソートカラムを無視する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(queryKeys.sortBy, "invalid_column");
    searchParams.set(queryKeys.sortOrder, "asc");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state.sort).toEqual({
      sortBy: null,
      sortOrder: "asc",
    });
  });

  it("無効なソート順を無視する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(queryKeys.sortBy, "id");
    searchParams.set(queryKeys.sortOrder, "invalid_order");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state.sort).toEqual({
      sortBy: "id",
      sortOrder: null,
    });
  });

  it("カラム表示設定を正しく解析する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(queryKeys.columnVisibility, "id,age");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state.columnVisibility).toEqual(["id", "age"]);
  });

  it("無効なカラムを除外する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(queryKeys.columnVisibility, "id,invalid_column,name");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state.columnVisibility).toEqual(["id", "name"]);
  });

  it("ページネーションを正しく解析する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(queryKeys.page, "5");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state.pagination).toBe(5);
  });

  it("無効なページ番号はデフォルト値を使用する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(queryKeys.page, "invalid_page");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state.pagination).toBe(1);
  });

  it("フィルターを正しく解析する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(`${queryKeys.filterPrefix}name`, "山田");
    searchParams.set(`${queryKeys.filterPrefix}age`, "30");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state.filter).toEqual({
      name: "山田",
      age: 30,
    });
  });

  it("複数パラメータを組み合わせて解析する", () => {
    const searchParams = new URLSearchParams();
    searchParams.set(queryKeys.keywordSearch, "キーワード");
    searchParams.set(queryKeys.sortBy, "name");
    searchParams.set(queryKeys.sortOrder, "asc");
    searchParams.set(queryKeys.columnVisibility, "id,name,age");
    searchParams.set(queryKeys.page, "3");
    searchParams.set(`${queryKeys.filterPrefix}name`, "田中");

    const state = parseTableState(searchParams, queryKeys, columnDefinitions);
    expect(state).toEqual({
      keywordSearch: "キーワード",
      sort: { sortBy: "name", sortOrder: "asc" },
      columnVisibility: ["id", "name", "age"],
      pagination: 3,
      filter: { name: "田中" },
    });
  });
});
