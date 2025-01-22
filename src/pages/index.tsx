import { FC } from "react";

import { Controller, useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { isNonNullish } from "remeda";
import * as v from "valibot";
import { createTable } from "@/features/table/createTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const ageFilterFormValuesSchema = v.object({
  min: v.pipe(v.string(), v.regex(/^[0-9]*$/)),
  max: v.pipe(v.string(), v.regex(/^[0-9]*$/)),
});

const ageFilterSchema = v.object({
  min: v.optional(v.number()),
  max: v.optional(v.number()),
});

type AgeFilter = v.InferOutput<typeof ageFilterSchema>;

const AgeFilterPopupContent: React.FC<{
  filter: AgeFilter;
  setFilter: (filter: AgeFilter) => void;
}> = ({ filter, setFilter }) => {
  const { register, handleSubmit } = useForm({
    resolver: valibotResolver(ageFilterFormValuesSchema),
    defaultValues: {
      min: filter.min?.toString(10) ?? "",
      max: filter.max?.toString(10) ?? "",
    },
  });

  const onSubmit = (data: v.InferOutput<typeof ageFilterFormValuesSchema>) => {
    setFilter({
      min: data.min === "" ? undefined : Number(data.min),
      max: data.max === "" ? undefined : Number(data.max),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>
        min:
        <Input type="number" {...register("min")} />
      </label>

      <label>
        max:
        <Input type="number" {...register("max")} />
      </label>

      <Button type="submit">OK</Button>
    </form>
  );
};

const statusFilterFormValuesSchema = v.object({
  status: v.picklist(["active", "inactive", "all"]),
});

const StatusFilterPopupContent: React.FC<{
  filter: "active" | "inactive" | null;
  setFilter: (filter: "active" | "inactive" | null) => void;
}> = ({ filter, setFilter }) => {
  const { handleSubmit, control } = useForm<
    v.InferOutput<typeof statusFilterFormValuesSchema>
  >({
    resolver: valibotResolver(statusFilterFormValuesSchema),
    defaultValues: {
      status: filter ?? "all",
    },
  });

  const onSubmit = (
    data: v.InferOutput<typeof statusFilterFormValuesSchema>
  ) => {
    setFilter(data.status === "all" ? null : data.status);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={field.onChange}>
            <Label>
              Active
              <RadioGroupItem value="active" />
            </Label>
            <Label>
              Inactive
              <RadioGroupItem value="inactive" />
            </Label>
            <Label>
              All
              <RadioGroupItem value="all" />
            </Label>
          </RadioGroup>
        )}
      />
      <Button type="submit">OK</Button>
    </form>
  );
};

const KeywordSearch: FC<{
  keyword: string;
  setKeyword: (keyword: string) => void;
}> = ({ keyword, setKeyword }) => {
  const { register, handleSubmit } = useForm({
    resolver: valibotResolver(v.object({ keyword: v.string() })),
    defaultValues: {
      keyword,
    },
  });

  const onSubmit = (data: { keyword: string }) => {
    setKeyword(data.keyword);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
      <Input type="text" {...register("keyword")} />
      <Button type="submit">Search</Button>
    </form>
  );
};

type TableViewModel = {
  name: string;
  age: number;
  email: string;
  status: "active" | "inactive";
};

// 実際は Tanstack Query などでデータを取得する
const useUserData = (query: {
  limit: number;
  offset: number;
  keyword: string;
  minAge: number | null;
  maxAge: number | null;
  status: "active" | "inactive" | null;
  sortBy: "name" | "age" | "email" | "status" | null;
  sortDirection: "asc" | "desc" | null;
}) => {
  const masterData: TableViewModel[] = Array.from({ length: 100 }, (_, i) => ({
    name: `User ${i}`,
    age: i + 20,
    email: `user${i}@example.com`,
    status: i % 2 === 0 ? "active" : "inactive",
  }));

  // フィルタリング

  const filteredData = masterData.filter((row) => {
    if (query.keyword) {
      if (
        !row.name.includes(query.keyword) &&
        !row.email.includes(query.keyword)
      ) {
        return false;
      }
    }

    if (query.minAge !== null) {
      if (row.age < query.minAge) {
        return false;
      }
    }

    if (query.maxAge !== null) {
      if (row.age > query.maxAge) {
        return false;
      }
    }

    if (query.status !== null) {
      if (row.status !== query.status) {
        return false;
      }
    }

    return true;
  });

  // ソート

  const sortedData =
    query.sortBy === null
      ? filteredData
      : filteredData.toSorted((a, b) => {
          if (query.sortBy === "name") {
            return a.name.localeCompare(b.name);
          }

          if (query.sortBy === "age") {
            return a.age - b.age;
          }

          if (query.sortBy === "email") {
            return a.email.localeCompare(b.email);
          }

          if (query.sortBy === "status") {
            return a.status.localeCompare(b.status);
          }

          return 0;
        });

  const finalSortedData =
    query.sortDirection === "asc" ? sortedData : sortedData.reverse();

  // ページネーション
  const slicedData = finalSortedData.slice(
    query.offset,
    query.offset + query.limit
  );

  return {
    data: slicedData,
    totalCount: finalSortedData.length,
  };
};

const define = createTable<TableViewModel>();
const { useTableState, Table } = define.table({
  key: "tableKey",

  pagination: {
    parPage: 10,
  },

  keywordSearch: {
    renderSearchInput({ value, onChange }) {
      return <KeywordSearch keyword={value} setKeyword={onChange} />;
    },
    encode: (keyword) => keyword,
    decode: (keyword) => keyword,
  },
  columns: [
    {
      key: "name",
      filter: null,
      sortable: true,
      visibility: {
        initialVisibility: true,
      },
      renderHeadCell() {
        return "Name";
      },
      renderBodyCell({ row }) {
        return <>{row.name}</>;
      },
    },
    {
      key: "age",
      filter: define.columnFilter<AgeFilter>({
        renderPopupContent: ({ filter, setFilter }) => {
          return (
            <AgeFilterPopupContent
              filter={filter ?? { min: undefined, max: undefined }}
              setFilter={setFilter}
            />
          );
        },
        renderFilterChipContent: ({ filter }) => [
          isNonNullish(filter.min) && `min: ${filter.min}`,
          isNonNullish(filter.max) && `max: ${filter.max}`,
        ],
        encode: (filter) => filter,
        decode: (filter) => {
          const result = v.safeParse(ageFilterSchema, filter);

          if (result.success) {
            return result.output;
          }

          return null;
        },
        initial: null,
      }),
      sortable: true,
      visibility: {
        initialVisibility: true,
      },

      renderHeadCell() {
        return "Age";
      },

      renderBodyCell({ row }) {
        return <>{row.age}</>;
      },
    },

    {
      key: "email",
      filter: null,
      sortable: true,
      visibility: {
        initialVisibility: true,
      },
      renderHeadCell() {
        return "Email";
      },
      renderBodyCell({ row }) {
        return <>{row.email}</>;
      },
    },
    {
      key: "status",
      filter: define.columnFilter<"active" | "inactive" | null>({
        renderPopupContent: ({ filter, setFilter }) => {
          return (
            <StatusFilterPopupContent filter={filter} setFilter={setFilter} />
          );
        },
        renderFilterChipContent: ({ filter }) => filter ?? "all",
        encode: (filter) => filter ?? "all",
        decode: (filter) =>
          filter === "active" || filter === "inactive" ? filter : null,
        initial: null,
      }),
      sortable: true,
      visibility: {
        initialVisibility: true,
      },
      renderHeadCell() {
        return "Status";
      },
      renderBodyCell({ row }) {
        return <>{row.status}</>;
      },
    },
  ],
} as const);

const Home: FC = () => {
  const tableState = useTableState();

  console.log(tableState);

  const { data, totalCount } = useUserData({
    limit: 10,
    offset: (tableState.pagination - 1) * 10,
    keyword: tableState.keywordSearch ?? "",
    minAge: tableState.filter.age?.min ?? null,
    maxAge: tableState.filter.age?.max ?? null,
    status: tableState.filter.status ?? null,
    sortBy: tableState.sort?.sortBy ?? null,
    sortDirection: tableState.sort?.sortOrder ?? null,
  });

  return (
    <div>
      <Table data={data} totalCount={totalCount} />
    </div>
  );
};

export default Home;
