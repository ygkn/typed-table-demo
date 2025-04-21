import { FC, ReactNode, useState } from "react";

import { Controller, useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { isNonNullish } from "remeda";
import * as v from "valibot";
import {
  createTable,
  defineTableColumnFilter,
  defineTableColumnFilterWithSchema,
} from "@/features/table/createTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import * as ShadCNUiTable from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ageFilterFormValuesSchema = v.object({
  min: v.pipe(v.string(), v.regex(/^[0-9]*$/)),
  max: v.pipe(v.string(), v.regex(/^[0-9]*$/)),
});

// AgeFilterの型定義（実際に利用するスキーマ）
type AgeFilter = {
  min?: number;
  max?: number;
};

type StatusFilterType = "active" | "inactive" | null;

// ステータスフィルターのためのスキーマ定義
const statusFilterSchema = v.union([
  v.literal("active"),
  v.literal("inactive"),
  v.nullable(v.null()),
]);

const AgeFilterPopupContent: React.FC<{
  filter: AgeFilter;
  setFilter: (filter: AgeFilter) => void;
  onClose: () => void;
}> = ({ filter, setFilter, onClose }) => {
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
    onClose();
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
  filter: StatusFilterType;
  setFilter: (filter: StatusFilterType) => void;
  onClose: () => void;
}> = ({ filter, setFilter, onClose }) => {
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
    onClose();
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

// 列キーの型定義
type TableColumnKey = "name" | "age" | "email" | "status";

// テーブルインスタンスを作成
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
    filter: defineTableColumnFilter<AgeFilter>({
      renderPopupContent: ({ filter, setFilter, onClose }) => {
        return (
          <AgeFilterPopupContent
            filter={filter ?? { min: undefined, max: undefined }}
            setFilter={setFilter}
            onClose={onClose}
          />
        );
      },
      renderFilterChipContent: ({ filter }) => [
        isNonNullish(filter.min) && `min: ${filter.min}`,
        isNonNullish(filter.max) && `max: ${filter.max}`,
      ],
      initial: { min: undefined, max: undefined },
      encodeForUrl: (filter) => {
        return `${filter.min ?? ""}~${filter.max ?? ""}`;
      },
      decodeFromUrl: (encoded) => {
        const [min, max] = encoded.split("~");
        return {
          min: min ? Number(min) : undefined,
          max: max ? Number(max) : undefined,
        };
      },
    }),
    sortable: true,
    initialVisibility: true,
    renderHeadCell() {
      return "Age";
    },
  },
  {
    key: "email" as const,
    filter: null,
    sortable: true,
    initialVisibility: true,
    renderHeadCell() {
      return "Email";
    },
  },
  {
    key: "status" as const,
    filter: defineTableColumnFilterWithSchema(statusFilterSchema, {
      renderPopupContent: ({ filter, setFilter, onClose }) => {
        return (
          <StatusFilterPopupContent
            filter={filter}
            setFilter={setFilter}
            onClose={onClose}
          />
        );
      },
      renderFilterChipContent: ({ filter }) => filter ?? "all",
      initial: null,
    }),
    sortable: true,
    initialVisibility: true,
    renderHeadCell() {
      return "Status";
    },
  },
] as const);

// テーブルコンポーネント
const Table: FC<{
  data: TableViewModel[];
  totalCount: number;
}> = ({ data, totalCount }) => {
  const { state, actions } = table.useTable();
  const [openedFilterColumnKey, setOpenedFilterColumnKey] = useState<
    "age" | "status" | null
  >(null);

  const visibleColumns = table.columnDefinitions.filter((column) =>
    state.columnVisibility.includes(column.key)
  );

  const filteringColumns = visibleColumns.filter(
    (column) =>
      column.filter !== null &&
      state.filter[column.key as keyof typeof state.filter] !== null
  );

  // レンダリングのヘルパー関数
  const renderFilterChipContent = (
    column: (typeof table.columnDefinitions)[number]
  ): ReactNode => {
    if (!column.filter) return null;

    switch (column.key) {
      case "age":
        if (state.filter.age) {
          return column.filter.renderFilterChipContent({
            filter: state.filter.age,
          });
        }
        break;
      case "status":
        if (state.filter.status) {
          return column.filter.renderFilterChipContent({
            filter: state.filter.status,
          });
        }
        break;
    }
    return null;
  };

  // フィルターポップアップの内容をレンダリングする関数
  const renderFilterPopupContent = (
    column: (typeof table.columnDefinitions)[number]
  ): ReactNode => {
    if (!column.filter) return null;

    switch (column.key) {
      case "age":
        return column.filter.renderPopupContent({
          filter: state.filter.age ?? null,
          setFilter: (filter) => {
            actions.setFilter("age", filter);
            setOpenedFilterColumnKey(null);
          },
          onClose: () => setOpenedFilterColumnKey(null),
        });
      case "status":
        return column.filter.renderPopupContent({
          filter: state.filter.status ?? null,
          setFilter: (filter) => {
            actions.setFilter("status", filter);
            setOpenedFilterColumnKey(null);
          },
          onClose: () => setOpenedFilterColumnKey(null),
        });
      default:
        return null;
    }
  };

  // フィルターをクリアする関数
  const clearFilter = (column: TableColumnKey) => {
    if (column === "age" || column === "status") {
      actions.setFilter(column, null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <KeywordSearch
          keyword={state.keywordSearch ?? ""}
          setKeyword={actions.setKeywordSearch}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table.columnDefinitions.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={state.columnVisibility.includes(column.key)}
                onCheckedChange={(checked) =>
                  actions.setColumnVisibility(column.key, checked)
                }
              >
                {column.renderHeadCell()}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteringColumns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filteringColumns.map((column) => (
            <div
              key={column.key}
              className="flex items-center gap-1 bg-primary-foreground text-primary-background rounded-full px-2"
            >
              <div>{column.renderHeadCell()}</div>
              {renderFilterChipContent(column)}
              <Button variant="ghost" onClick={() => clearFilter(column.key)}>
                <X aria-label="clear" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ShadCNUiTable.Table>
        <ShadCNUiTable.TableHeader>
          <ShadCNUiTable.TableRow>
            {visibleColumns.map((column) => (
              <ShadCNUiTable.TableHead key={column.key}>
                {column.renderHeadCell()}
                {column.sortable && (
                  <Button
                    onClick={() => actions.toggleSort(column.key)}
                    variant="ghost"
                  >
                    {state.sort.sortBy === column.key ? (
                      state.sort.sortOrder === "asc" ? (
                        <ArrowDown />
                      ) : (
                        <ArrowUp />
                      )
                    ) : (
                      <ArrowUpDown />
                    )}
                  </Button>
                )}
                {column.filter && (
                  <Popover
                    open={openedFilterColumnKey === column.key}
                    onOpenChange={(open) =>
                      setOpenedFilterColumnKey(
                        open ? (column.key as "age" | "status") : null
                      )
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost">
                        <Filter />
                      </Button>
                    </PopoverTrigger>
                    <PopoverAnchor>
                      <PopoverContent>
                        {renderFilterPopupContent(column)}
                      </PopoverContent>
                    </PopoverAnchor>
                  </Popover>
                )}
              </ShadCNUiTable.TableHead>
            ))}
          </ShadCNUiTable.TableRow>
        </ShadCNUiTable.TableHeader>
        <ShadCNUiTable.TableBody>
          {data.map((row, rowIndex) => (
            <ShadCNUiTable.TableRow key={rowIndex}>
              {visibleColumns.map((column) => (
                <ShadCNUiTable.TableCell key={column.key}>
                  {renderCell(column.key as TableColumnKey, row)}
                </ShadCNUiTable.TableCell>
              ))}
            </ShadCNUiTable.TableRow>
          ))}
        </ShadCNUiTable.TableBody>
      </ShadCNUiTable.Table>

      <div className="flex items-center justify-end space-x-2 pt-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {`Page ${state.pagination} of ${Math.ceil(
            totalCount / 10
          )}, Total ${totalCount} items`}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => actions.setPagination(state.pagination - 1)}
            disabled={state.pagination === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => actions.setPagination(state.pagination + 1)}
            disabled={state.pagination === Math.ceil(totalCount / 10)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

// セル内容のレンダリング関数
const renderCell = (key: TableColumnKey, row: TableViewModel) => {
  switch (key) {
    case "name":
      return row.name;
    case "age":
      return row.age;
    case "email":
      return row.email;
    case "status":
      return row.status;
    default:
      return null;
  }
};

const Home: FC = () => {
  const { state } = table.useTable();

  const { data, totalCount } = useUserData({
    limit: 10,
    offset: (state.pagination - 1) * 10,
    keyword: state.keywordSearch ?? "",
    minAge: state.filter.age?.min ?? null,
    maxAge: state.filter.age?.max ?? null,
    status: state.filter.status ?? null,
    sortBy: state.sort.sortBy,
    sortDirection: state.sort.sortOrder,
  });

  return (
    <div>
      <Table data={data} totalCount={totalCount} />
    </div>
  );
};

export default Home;
