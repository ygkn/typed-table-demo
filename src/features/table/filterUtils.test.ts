import { describe, it, expect } from "vitest";
import * as v from "valibot";
import {
  createFilterEncoderDecoder,
  defineTableColumnFilter,
  defineTableColumnFilterWithSchema,
} from "./filterUtils";

describe("createFilterEncoderDecoder", () => {
  // 数値の範囲フィルター用のスキーマ
  const ageFilterSchema = v.object({
    min: v.optional(v.number()),
    max: v.optional(v.number()),
  });

  it("スキーマに合致する値をエンコード・デコードできること", () => {
    const { encodeForUrl, decodeFromUrl } =
      createFilterEncoderDecoder(ageFilterSchema);

    const filter = { min: 20, max: 50 };
    const encoded = encodeForUrl(filter);

    expect(encoded).toBe(JSON.stringify(filter));
    expect(decodeFromUrl(encoded)).toEqual(filter);
  });

  it("スキーマに合致しない値をエンコードしようとするとエラーになること", () => {
    const { encodeForUrl } = createFilterEncoderDecoder(ageFilterSchema);

    // 不正な値 - minが文字列
    const invalidFilter = { min: "20", max: 50 };

    // @ts-expect-error 不正な値を渡すテスト
    expect(() => encodeForUrl(invalidFilter)).toThrow();
  });

  it("不正な文字列をデコードするとnullを返すこと", () => {
    const { decodeFromUrl } = createFilterEncoderDecoder(ageFilterSchema);

    // 不正なJSON文字列
    expect(decodeFromUrl("invalid-json")).toBeNull();

    // スキーマに合わない値
    expect(decodeFromUrl('{"min":"20","max":50}')).toBeNull();
  });
});

describe("defineTableColumnFilter", () => {
  it("デフォルトのエンコード・デコード関数が使われること", () => {
    const filter = defineTableColumnFilter<{ text: string }>({
      renderPopupContent: () => null,
      renderFilterChipContent: () => null,
      initial: null,
      encodeForUrl: undefined,
      decodeFromUrl: undefined,
    });

    const testFilter = { text: "test" };
    const encoded = filter.encodeForUrl(testFilter);

    expect(encoded).toBe(JSON.stringify(testFilter));
    expect(filter.decodeFromUrl(encoded)).toEqual(testFilter);
  });

  it("カスタムのエンコード・デコード関数が使われること", () => {
    const filter = defineTableColumnFilter<{ min?: number; max?: number }>({
      renderPopupContent: () => null,
      renderFilterChipContent: () => null,
      initial: null,
      encodeForUrl: (filter) => `${filter.min ?? ""}-${filter.max ?? ""}`,
      decodeFromUrl: (encoded) => {
        const [min, max] = encoded.split("-");
        return {
          min: min ? Number(min) : undefined,
          max: max ? Number(max) : undefined,
        };
      },
    });

    const testFilter = { min: 20, max: 50 };
    const encoded = filter.encodeForUrl(testFilter);

    expect(encoded).toBe("20-50");
    expect(filter.decodeFromUrl(encoded)).toEqual(testFilter);
  });
});

describe("defineTableColumnFilterWithSchema", () => {
  // ステータスフィルター用のスキーマ
  const statusFilterSchema = v.union([
    v.literal("active"),
    v.literal("inactive"),
  ]);

  it("スキーマを使ってフィルターを定義できること", () => {
    const filter = defineTableColumnFilterWithSchema(statusFilterSchema, {
      renderPopupContent: () => null,
      renderFilterChipContent: () => null,
      initial: null,
    });

    const testFilter = "active";
    const encoded = filter.encodeForUrl(testFilter);

    expect(encoded).toBe(JSON.stringify(testFilter));
    expect(filter.decodeFromUrl(encoded)).toBe(testFilter);
  });

  it("スキーマに合致しない値をエンコードしようとするとエラーになること", () => {
    const filter = defineTableColumnFilterWithSchema(statusFilterSchema, {
      renderPopupContent: () => null,
      renderFilterChipContent: () => null,
      initial: null,
    });

    // 不正な値 - スキーマにないステータス
    const invalidFilter = "pending";

    // @ts-expect-error 不正な値を渡すテスト
    expect(() => filter.encodeForUrl(invalidFilter)).toThrow();
  });
});
