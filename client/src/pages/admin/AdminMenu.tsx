import { Reorder } from "framer-motion";
import { FolderPlus, Layers, Plus, UtensilsCrossed } from "lucide-react";
import { useRef, useState } from "react";
import CategoryManager, { type CategoryActions } from "../../components/admin/CategoryManager";
import ItemEditor from "../../components/admin/ItemEditor";
import ItemRow from "../../components/admin/ItemRow";
import CategoryNav from "../../components/menu/CategoryNav";
import PageTransition from "../../components/PageTransition";
import Badge from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/Feedback";
import { useAuth } from "../../context/auth-context";
import { useToast } from "../../context/toast-context";
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  patchCategory,
  patchItem,
  reorderCategories,
  reorderItems,
  type AdminCategory,
  type AdminItem,
  type ItemBody,
} from "../../lib/adminApi";
import { apiError } from "../../lib/api";
import { useAdminMenu } from "../../lib/useAdmin";

type DelTarget = { kind: "item"; item: AdminItem } | { kind: "category"; cat: AdminCategory };

function moveBy<T extends { _id: string }>(list: T[], id: string, dir: -1 | 1) {
  const i = list.findIndex((x) => x._id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return null;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function MenuSkeleton() {
  return (
    <div role="status" aria-label="Loading menu">
      <Skeleton className="h-9 w-40" />
      <div className="mt-6 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-11 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}

export default function AdminMenu() {
  const { user } = useAuth();
  const { toast } = useToast();
  const rid = user?.restaurant?._id;
  const canEdit = user?.role === "admin";
  const { data, error, reload, update } = useAdminMenu(rid);

  const [catId, setCatId] = useState<string | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [del, setDel] = useState<DelTarget | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const dirtyItems = useRef<string[] | null>(null);
  const dirtyCats = useRef<string[] | null>(null);

  if (!rid) return <ErrorState title="No restaurant" hint="This account isn't linked to a restaurant." />;
  if (error && !data) {
    return (
      <ErrorState
        title="Couldn't load the menu"
        hint={apiError(error)}
        action={<Button onClick={reload}>Try again</Button>}
      />
    );
  }
  if (!data) return <MenuSkeleton />;

  const { restaurant, categories, items } = data;
  const currency = restaurant.currency;
  const active = categories.find((c) => c._id === catId) ?? categories[0] ?? null;
  const activeItems = active ? items.filter((i) => i.category === active._id) : [];
  const counts: Record<string, number> = {};
  for (const i of items) counts[i.category] = (counts[i.category] ?? 0) + 1;

  // optimistic writes: on failure show a toast and resync from the server
  const run = async (fn: () => Promise<unknown>, fail = "Couldn't save changes") => {
    try {
      await fn();
    } catch (e) {
      toast(apiError(e, fail), "error");
      reload();
    }
  };

  /* ---------- items ---------- */
  const openNew = () => {
    if (categories.length === 0) return setCatsOpen(true);
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (it: AdminItem) => {
    setEditing(it);
    setEditorOpen(true);
  };

  const saveItem = async (body: ItemBody) => {
    const saved = editing ? await patchItem(editing._id, body) : await createItem(rid, body);
    update((d) => ({
      ...d,
      items: editing ? d.items.map((i) => (i._id === saved._id ? saved : i)) : [...d.items, saved],
    }));
    if (editing && editing.category !== saved.category) reload();
    setCatId(saved.category);
    setEditorOpen(false);
    toast(editing ? "Item saved" : "Item added");
  };

  const toggleItem = (it: AdminItem, v: boolean) => {
    update((d) => ({ ...d, items: d.items.map((i) => (i._id === it._id ? { ...i, isAvailable: v } : i)) }));
    void run(() => patchItem(it._id, { isAvailable: v }));
  };

  const onItemsReorder = (next: AdminItem[]) => {
    if (!active) return;
    update((d) => ({ ...d, items: [...d.items.filter((i) => i.category !== active._id), ...next] }));
    dirtyItems.current = next.map((i) => i._id);
  };
  const persistItems = () => {
    const ids = dirtyItems.current;
    dirtyItems.current = null;
    if (ids) void run(() => reorderItems(rid, ids));
  };
  const moveItem = (it: AdminItem, dir: -1 | 1) => {
    const next = moveBy(activeItems, it._id, dir);
    if (!next) return;
    onItemsReorder(next);
    persistItems();
  };

  /* ---------- categories ---------- */
  const catActions: CategoryActions = {
    create: async (en, ar) => {
      try {
        const c = await createCategory(rid, { name: { en, ar } });
        update((d) => ({ ...d, categories: [...d.categories, c] }));
        setCatId(c._id);
        toast("Category added");
        return true;
      } catch (e) {
        toast(apiError(e, "Couldn't add the category"), "error");
        return false;
      }
    },
    rename: async (c, en, ar) => {
      try {
        const s = await patchCategory(c._id, { name: { en, ar } });
        update((d) => ({ ...d, categories: d.categories.map((x) => (x._id === s._id ? s : x)) }));
        return true;
      } catch (e) {
        toast(apiError(e, "Couldn't rename the category"), "error");
        return false;
      }
    },
    toggle: (c, v) => {
      update((d) => ({ ...d, categories: d.categories.map((x) => (x._id === c._id ? { ...x, isActive: v } : x)) }));
      void run(() => patchCategory(c._id, { isActive: v }));
    },
    remove: (c) => {
      setDel({ kind: "category", cat: c });
      setDelOpen(true);
    },
    reorder: (next) => {
      update((d) => ({ ...d, categories: next }));
      dirtyCats.current = next.map((c) => c._id);
    },
    persist: () => {
      const ids = dirtyCats.current;
      dirtyCats.current = null;
      if (ids) void run(() => reorderCategories(rid, ids));
    },
    move: (c, dir) => {
      const next = moveBy(categories, c._id, dir);
      if (!next) return;
      update((d) => ({ ...d, categories: next }));
      void run(() =>
        reorderCategories(
          rid,
          next.map((x) => x._id),
        ),
      );
    },
  };

  /* ---------- delete ---------- */
  const confirmDelete = async () => {
    const target = del;
    if (!target) return;
    setDelBusy(true);
    try {
      if (target.kind === "item") {
        await deleteItem(target.item._id);
        update((d) => ({ ...d, items: d.items.filter((i) => i._id !== target.item._id) }));
        toast("Item deleted");
      } else {
        await deleteCategory(target.cat._id);
        update((d) => ({
          ...d,
          categories: d.categories.filter((c) => c._id !== target.cat._id),
          items: d.items.filter((i) => i.category !== target.cat._id),
        }));
        toast("Category deleted");
      }
      setDelOpen(false);
    } catch (e) {
      toast(apiError(e, "Couldn't delete"), "error");
    } finally {
      setDelBusy(false);
    }
  };

  const delTitle = del?.kind === "category" ? "Delete category?" : "Delete item?";
  const delMessage =
    del?.kind === "category"
      ? `"${del.cat.name.en}" and its ${counts[del.cat._id] ?? 0} item(s) will be permanently deleted.`
      : del
        ? `"${del.item.name.en}" will be permanently deleted.`
        : "";

  return (
    <PageTransition>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Menu</h1>
          <p className="mt-1 text-sm text-muted">
            {canEdit ? "Drag the handle to reorder. Changes go live right away." : "Read-only view."}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="soft" onClick={() => setCatsOpen(true)}>
              <Layers className="h-4 w-4" aria-hidden />
              Categories
            </Button>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" aria-hidden />
              Add item
            </Button>
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="Create your first category"
          hint="Categories group your dishes, like Starters or Drinks."
          action={
            canEdit ? (
              <Button onClick={() => setCatsOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                Add category
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mt-6">
            <CategoryNav
              label="Categories"
              activeId={active?._id ?? null}
              onSelect={setCatId}
              items={categories.map((c) => ({ id: c._id, label: c.isActive ? c.name.en : `${c.name.en} (hidden)` }))}
            />
          </div>

          {active && (
            <section className="mt-4">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-xl font-extrabold">{active.name.en}</h2>
                {!active.isActive && <Badge>Hidden from guests</Badge>}
                <span className="text-sm text-muted">
                  {activeItems.length} {activeItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              {activeItems.length === 0 ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No items yet"
                  hint="Guests don't see a category until it has items."
                  action={
                    canEdit ? (
                      <Button onClick={openNew}>
                        <Plus className="h-4 w-4" aria-hidden />
                        Add item
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <Reorder.Group axis="y" values={activeItems} onReorder={onItemsReorder} as="ul" className="space-y-2">
                  {activeItems.map((it) => (
                    <ItemRow
                      key={it._id}
                      item={it}
                      currency={currency}
                      canEdit={canEdit}
                      onEdit={() => openEdit(it)}
                      onDelete={() => {
                        setDel({ kind: "item", item: it });
                        setDelOpen(true);
                      }}
                      onToggle={(v) => toggleItem(it, v)}
                      onMove={(dir) => moveItem(it, dir)}
                      onDragEnd={persistItems}
                    />
                  ))}
                </Reorder.Group>
              )}
            </section>
          )}
        </>
      )}

      {canEdit && (
        <>
          <CategoryManager
            open={catsOpen}
            onClose={() => setCatsOpen(false)}
            categories={categories}
            counts={counts}
            a={catActions}
          />
          <ItemEditor
            open={editorOpen}
            onClose={() => setEditorOpen(false)}
            item={editing}
            categories={categories}
            defaultCategory={active?._id ?? ""}
            currency={currency}
            onSave={saveItem}
          />
          <ConfirmDialog
            open={delOpen}
            title={delTitle}
            message={delMessage}
            busy={delBusy}
            onConfirm={() => void confirmDelete()}
            onCancel={() => setDelOpen(false)}
          />
        </>
      )}
    </PageTransition>
  );
}