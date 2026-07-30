"use client";

import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Combobox } from "@base-ui/react/combobox";

import type { CategoryOption, TagOption } from "@/features/articles/article-dto";

const labelClassName = "block text-sm font-medium text-foreground";

const inputGroupClassName =
  "flex min-h-(--control-height) w-full items-center rounded-md border border-input bg-background shadow-xs transition-[border-color,box-shadow] duration-(--motion-duration) ease-(--motion-easing) focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 motion-reduce:transition-none";

const inputClassName =
  "h-full w-full border-0 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground";

const tagInputClassName =
  "min-w-20 flex-1 border-0 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted-foreground";

const chipsClassName = "flex w-full flex-wrap items-center gap-1.5 px-2 py-1.5";

const chipClassName =
  "inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-foreground";

const chipRemoveClassName =
  "text-muted-foreground transition-colors hover:text-foreground";

const itemClassName =
  "flex cursor-default items-center gap-2 py-1.5 pl-3 pr-2 text-sm text-foreground outline-none data-[highlighted]:bg-muted data-[highlighted]:text-foreground";

const itemIndicatorClassName = "flex size-4 items-center justify-center text-muted-foreground";

// 分类/标签作为 Combobox item 的统一形状。
// existing 项来自数据库；creatable 项是用户输入的新名称，仅在表单状态中存在。
type TaxonomyItem = {
  readonly id: string;
  readonly name: string;
  readonly creatable?: string;
};

function normalizeForCompare(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function makeCreatableItem(query: string): TaxonomyItem {
  const trimmed = query.trim();
  return {
    creatable: trimmed,
    id: `create:${normalizeForCompare(trimmed)}`,
    name: trimmed,
  };
}

function buildCategoryItems(
  categories: readonly CategoryOption[],
  query: string,
): readonly TaxonomyItem[] {
  const trimmed = query.trim();
  const base = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  if (trimmed.length === 0) {
    return base;
  }

  const lowered = normalizeForCompare(trimmed);

  if (base.some((item) => normalizeForCompare(item.name) === lowered)) {
    return base;
  }

  return [...base, makeCreatableItem(trimmed)];
}

function buildTagItems(
  tags: readonly TagOption[],
  query: string,
  selectedNames: readonly string[],
): readonly TaxonomyItem[] {
  const trimmed = query.trim();
  const selectedLower = new Set(selectedNames.map((name) => normalizeForCompare(name)));

  const existing = tags
    .filter((tag) => !selectedLower.has(normalizeForCompare(tag.name)))
    .map((tag) => ({ id: tag.id, name: tag.name }));

  if (trimmed.length === 0) {
    return existing;
  }

  const lowered = normalizeForCompare(trimmed);

  if (
    tags.some((tag) => normalizeForCompare(tag.name) === lowered) ||
    selectedLower.has(lowered)
  ) {
    return existing;
  }

  return [...existing, makeCreatableItem(trimmed)];
}

export function ArticleTaxonomyFields({
  categories,
  fieldErrors,
  initialCategoryName,
  initialTagNames,
  tags,
}: {
  categories: readonly CategoryOption[];
  fieldErrors?: {
    categoryName?: readonly string[];
    tagNames?: readonly string[];
  };
  initialCategoryName: string;
  initialTagNames: readonly string[];
  tags: readonly TagOption[];
}) {
  const categoryId = useId();
  const tagId = useId();

  // ─── 分类（单选） ───────────────────────────────────────────
  const [categoryValue, setCategoryValue] = useState<TaxonomyItem | null>(() => {
    const trimmed = initialCategoryName.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const lowered = normalizeForCompare(trimmed);
    const existing = categories.find(
      (category) => normalizeForCompare(category.name) === lowered,
    );

    return existing
      ? { id: existing.id, name: existing.name }
      : { id: `create:${lowered}`, name: trimmed };
  });
  const [categoryQuery, setCategoryQuery] = useState(categoryValue?.name ?? "");
  const categoryHighlightedRef = useRef<TaxonomyItem | undefined>(undefined);

  function handleCategoryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || categoryHighlightedRef.current) {
      return;
    }

    const trimmed = categoryQuery.trim();
    if (trimmed === "") {
      return;
    }

    event.preventDefault();

    const lowered = normalizeForCompare(trimmed);
    const existing = categories.find(
      (category) => normalizeForCompare(category.name) === lowered,
    );

    if (existing) {
      setCategoryValue({ id: existing.id, name: existing.name });
      setCategoryQuery(existing.name);
      return;
    }

    const newItem = makeCreatableItem(trimmed);
    setCategoryValue(newItem);
    setCategoryQuery(newItem.name);
  }

  // ─── 标签（多选） ───────────────────────────────────────────
  const [tagValues, setTagValues] = useState<TaxonomyItem[]>(() =>
    initialTagNames.map((name) => {
      const lowered = normalizeForCompare(name);
      const existing = tags.find(
        (tag) => normalizeForCompare(tag.name) === lowered,
      );
      return existing
        ? { id: existing.id, name: existing.name }
        : { id: `create:${lowered}`, name };
    }),
  );
  const [tagQuery, setTagQuery] = useState("");
  const tagHighlightedRef = useRef<TaxonomyItem | undefined>(undefined);

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || tagHighlightedRef.current) {
      return;
    }

    const trimmed = tagQuery.trim();
    if (trimmed === "") {
      return;
    }

    event.preventDefault();

    const lowered = normalizeForCompare(trimmed);

    // 已选标签中存在大小写不敏感匹配 —— 直接清空输入
    if (tagValues.some((tag) => normalizeForCompare(tag.name) === lowered)) {
      setTagQuery("");
      return;
    }

    const existing = tags.find(
      (tag) => normalizeForCompare(tag.name) === lowered,
    );
    const item = existing
      ? { id: existing.id, name: existing.name }
      : makeCreatableItem(trimmed);

    setTagValues((prev) => [...prev, item]);
    setTagQuery("");
  }

  const categoryItems = useMemo(
    () => buildCategoryItems(categories, categoryQuery),
    [categories, categoryQuery],
  );
  const tagItems = useMemo(
    () => buildTagItems(tags, tagQuery, tagValues.map((tag) => tag.name)),
    [tags, tagQuery, tagValues],
  );

  const categoryErrorId = `${categoryId}-error`;
  const tagErrorId = `${tagId}-error`;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        {/* ─── 分类 ─── */}
        <div>
          <label className={labelClassName} htmlFor={categoryId}>
            分类
            <span className="ml-2 font-normal text-muted-foreground">可选</span>
          </label>
          <Combobox.Root<TaxonomyItem, false>
            items={categoryItems}
            value={categoryValue}
            onValueChange={(next) => {
              setCategoryValue(next);
              setCategoryQuery(next ? next.name : "");
            }}
            inputValue={categoryQuery}
            onInputValueChange={(value) => {
              setCategoryQuery(value);
              if (value === "") {
                setCategoryValue(null);
              }
            }}
            onItemHighlighted={(item) => {
              categoryHighlightedRef.current = item;
            }}
            itemToStringLabel={(item) => item.name}
            isItemEqualToValue={(a, b) => a.id === b.id}
          >
            <Combobox.InputGroup
              className={inputGroupClassName}
              aria-invalid={Boolean(fieldErrors?.categoryName?.length)}
              aria-describedby={fieldErrors?.categoryName?.length ? categoryErrorId : undefined}
            >
              <Combobox.Input
                id={categoryId}
                className={inputClassName}
                placeholder="选择或输入分类"
                autoComplete="off"
                onKeyDown={handleCategoryKeyDown}
              />
            </Combobox.InputGroup>
            <Combobox.Portal>
              <Combobox.Positioner
                className="z-50 min-w-(--anchor-width) rounded-md border border-border bg-popover shadow-md"
                sideOffset={4}
              >
                <Combobox.Popup className="max-h-64 overflow-auto p-1 outline-none">
                  <Combobox.Empty>
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      没有匹配的分类。
                    </div>
                  </Combobox.Empty>
                  <Combobox.List>
                    {(item: TaxonomyItem) =>
                      item.creatable ? (
                        <Combobox.Item
                          key={item.id}
                          className={itemClassName}
                          value={item}
                        >
                          <span className={itemIndicatorClassName}>
                            <PlusIcon className="size-4" />
                          </span>
                          <span>使用新分类「{item.creatable}」</span>
                        </Combobox.Item>
                      ) : (
                        <Combobox.Item
                          key={item.id}
                          className={itemClassName}
                          value={item}
                        >
                          <Combobox.ItemIndicator className={itemIndicatorClassName}>
                            <CheckIcon className="size-4" />
                          </Combobox.ItemIndicator>
                          <span>{item.name}</span>
                        </Combobox.Item>
                      )
                    }
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
          {fieldErrors?.categoryName?.length ? (
            <p className="mt-2 text-sm text-destructive" id={categoryErrorId}>
              {fieldErrors.categoryName[0]}
            </p>
          ) : null}
        </div>

        {/* ─── 标签 ─── */}
        <div>
          <label className={labelClassName} htmlFor={tagId}>
            标签
            <span className="ml-2 font-normal text-muted-foreground">可选</span>
          </label>
          <Combobox.Root<TaxonomyItem, true>
            items={tagItems}
            multiple
            value={tagValues}
            onValueChange={(next) => {
              setTagValues(next);
              setTagQuery("");
            }}
            inputValue={tagQuery}
            onInputValueChange={setTagQuery}
            onItemHighlighted={(item) => {
              tagHighlightedRef.current = item;
            }}
            itemToStringLabel={(item) => item.name}
            isItemEqualToValue={(a, b) => a.id === b.id}
          >
            <Combobox.InputGroup
              className={inputGroupClassName}
              aria-invalid={Boolean(fieldErrors?.tagNames?.length)}
              aria-describedby={fieldErrors?.tagNames?.length ? tagErrorId : undefined}
            >
              <Combobox.Chips className={chipsClassName}>
                <Combobox.Value>
                  {(value: TaxonomyItem[]) => (
                    <>
                      {value.map((tag) => (
                        <Combobox.Chip
                          key={tag.id}
                          className={chipClassName}
                          aria-label={tag.name}
                        >
                          {tag.name}
                          <Combobox.ChipRemove
                            className={chipRemoveClassName}
                            aria-label={`移除标签 ${tag.name}`}
                          >
                            <XIcon className="size-3" />
                          </Combobox.ChipRemove>
                        </Combobox.Chip>
                      ))}
                      <Combobox.Input
                        id={tagId}
                        className={tagInputClassName}
                        placeholder={value.length > 0 ? "" : "选择或输入标签"}
                        autoComplete="off"
                        onKeyDown={handleTagKeyDown}
                      />
                    </>
                  )}
                </Combobox.Value>
              </Combobox.Chips>
            </Combobox.InputGroup>
            <Combobox.Portal>
              <Combobox.Positioner
                className="z-50 min-w-(--anchor-width) rounded-md border border-border bg-popover shadow-md"
                sideOffset={4}
              >
                <Combobox.Popup className="max-h-64 overflow-auto p-1 outline-none">
                  <Combobox.Empty>
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      没有匹配的标签。
                    </div>
                  </Combobox.Empty>
                  <Combobox.List>
                    {(item: TaxonomyItem) =>
                      item.creatable ? (
                        <Combobox.Item
                          key={item.id}
                          className={itemClassName}
                          value={item}
                        >
                          <span className={itemIndicatorClassName}>
                            <PlusIcon className="size-4" />
                          </span>
                          <span>使用新标签「{item.creatable}」</span>
                        </Combobox.Item>
                      ) : (
                        <Combobox.Item
                          key={item.id}
                          className={itemClassName}
                          value={item}
                        >
                          <Combobox.ItemIndicator className={itemIndicatorClassName}>
                            <CheckIcon className="size-4" />
                          </Combobox.ItemIndicator>
                          <span>{item.name}</span>
                        </Combobox.Item>
                      )
                    }
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
          {fieldErrors?.tagNames?.length ? (
            <p className="mt-2 text-sm text-destructive" id={tagErrorId}>
              {fieldErrors.tagNames[0]}
            </p>
          ) : null}
        </div>
      </div>

      {/* 隐藏输入：提交实际选中的名称（existing 用 name，new 用 creatable 名称） */}
      <input
        name="categoryName"
        type="hidden"
        value={categoryValue?.name ?? ""}
      />
      {tagValues.map((tag) => (
        <input key={tag.id} name="tagNames" type="hidden" value={tag.name} />
      ))}
    </>
  );
}
