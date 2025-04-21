import { expectTypeOf, describe, test } from "vitest";
import * as v from "valibot";
import {
  createTable,
  defineTableColumnFilter,
  defineTableColumnFilterWithSchema,
} from "./createTable";

const ageFilterSchema = v.object({
  min: v.optional(v.number()),
  max: v.optional(v.number()),
});

const statusFilterSchema = v.union([
  v.literal("active"),
  v.literal("inactive"),
  v.nullable(v.null()),
]);

type TestAgeFilter = v.InferOutput<typeof ageFilterSchema>;

describe("テーブル定義とユースケース", () => {
  const table = createTable([
    {
      key: "name" as const,
      filter: null,
      sortable: true,
      initialVisibility: true,
      renderHeadCell() {
        return "Name";
      },
    },
    {
      key: "age" as const,
      filter: defineTableColumnFilter<v.InferOutput<typeof ageFilterSchema>>({
        renderPopupContent: ({ filter, setFilter }) => {
          if (filter) {
            const updatedFilter = { ...filter, min: 20 };
            setFilter(updatedFilter);
          } else {
            setFilter({ min: 20, max: 50 });
          }
          return null;
        },
        renderFilterChipContent: ({ filter }) => {
          return filter.min != null && filter.max != null
            ? `${filter.min}~${filter.max}歳`
            : filter.min != null
            ? `${filter.min}歳以上`
            : filter.max != null
            ? `${filter.max}歳以下`
            : null;
        },
        initial: { min: undefined, max: undefined },
        encodeForUrl: (filter) => {
          return `${filter.min ?? ""}~${filter.max ?? ""}`;
        },
        decodeFromUrl: (encoded) => {
          const [min, max] = encoded.split("~");
          return v.parse(ageFilterSchema, {
            min: min ? Number(min) : undefined,
            max: max ? Number(max) : undefined,
          });
        },
      }),
      sortable: true,
      initialVisibility: true,
      renderHeadCell() {
        return "Age";
      },
    },
    {
      key: "status" as const,
      filter: defineTableColumnFilterWithSchema(statusFilterSchema, {
        renderPopupContent: () => null,
        renderFilterChipContent: () => null,
        initial: null,
      }),
      sortable: false,
      initialVisibility: true,
      renderHeadCell() {
        return "Status";
      },
    },
  ]);

  test("テーブルのstateが定義から推論されること", () => {
    expectTypeOf(table.useTable).returns.toHaveProperty("state");

    expectTypeOf(table.useTable).returns.toHaveProperty("state").toEqualTypeOf<{
      keywordSearch: string | null;
      sort: {
        // ソート可能なカラムのみ
        sortBy: "name" | "age" | null;
        sortOrder: "asc" | "desc" | null;
      };
      columnVisibility: ("name" | "age" | "status")[];
      pagination: number;
      filter: {
        // フィルター可能なカラムのみ、フィルターの型が推論される
        age: TestAgeFilter | null;
        status: "active" | "inactive" | null;
      };
    }>();
  });

  describe("フィルター操作メソッドがスキーマに適合する型の引数を受け取ること", () => {
    const { actions } = table.useTable();

    test("スキーマから推論されたフィルター型を受け取ること", () => {
      actions.setFilter("age", { min: 20, max: 50 });
    });

    test("フィルターがクリアできること", () => {
      actions.setFilter("age", null);
    });

    test("存在しないカラムのフィルターの値を設定できないこと", () => {
      // @ts-expect-error 存在しないカラムのフィルターの値を設定できない
      actions.setFilter("nonExistentColumn", { min: 20, max: 50 });
    });

    test("フィルター可能でないカラムのフィルターの値を設定できないこと", () => {
      // @ts-expect-error フィルター可能でないカラムのフィルターの値を設定できない
      actions.setFilter("status", { min: 20, max: 50 });
    });
  });

  describe("ソート操作メソッドが期待された型の引数を受け取ること", () => {
    const { actions } = table.useTable();

    test("ソート可能なカラムのみソートできること", () => {
      actions.toggleSort("age");
    });

    test("存在しないカラムのソートはできないこと", () => {
      // @ts-expect-error 存在しないカラムのソートはできない
      actions.toggleSort("nonExistentColumn");
    });

    test("フィルター可能でないカラムのソートはできないこと", () => {
      // @ts-expect-error フィルター可能でないカラムのソートはできない
      actions.toggleSort("status");
    });
  });
});
