"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  useAdminMenu,
  useCreateProduct,
  useToggleProductStatus,
  useUpdateProduct,
} from "@/lib/api/admin";
import { useAdminSession } from "@/lib/api/auth";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, ErrorState } from "@/components/ui/LayoutPrimitives";

/**
 * Menu manager — Backend Master Reference §10.4–10.6.
 * POST /admin/products, PATCH /admin/products/:id,
 * PATCH /admin/products/:id/status (soft toggle). No DELETE ever.
 * Prices cross the wire as decimal strings ("299.00").
 */
export default function MenuManagerPage() {
  const router = useRouter();
  const session = useAdminSession();
  const menu = useAdminMenu();
  const createProduct = useCreateProduct();

  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [basePrice, setBasePrice] = React.useState("");
  const [isVeg, setIsVeg] = React.useState(true);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const toggle = useToggleProductStatus();

  React.useEffect(() => {
    if (session.data?.ok === false) router.replace("/admin/login");
  }, [session.data, router]);

  if (session.isLoading) return <p className="py-12 text-body">Checking session…</p>;
  if (session.data?.ok === false) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !categoryId) {
      setFormError("Name and category are required.");
      return;
    }
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(basePrice)) {
      setFormError('Base price must be a decimal string like "299.00".');
      return;
    }
    try {
      await createProduct.mutateAsync({
        name: name.trim(),
        categoryId,
        basePrice,
        isVeg,
      });
      setName("");
      setBasePrice("");
    } catch (err) {
      setFormError((err as Error)?.message || "Failed to create product.");
    }
  };

  return (
    <div className="min-w-0 space-y-5 pb-12 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="break-words text-h2 font-heading font-bold">Menu Manager</h1>
        <p className="mt-1 break-words text-body text-bodySecondary">
          Soft toggle only — products are never deleted so historical orders stay intact.
        </p>
      </div>

      <Card className="min-w-0 p-4 sm:p-6">
        <h2 className="font-heading font-bold">New product</h2>
        <form onSubmit={submit} className="mt-3 grid min-w-0 gap-3 md:grid-cols-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} />
          <Input
            label="Category ID"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="paste category id from list below"
            required
          />
          <Input
            label='Base price (decimal string, e.g. "299.00")'
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="299.00"
            required
          />
          <label className="flex min-w-0 items-center gap-2 text-body">
            <input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} />
            Vegetarian
          </label>
          <div className="md:col-span-2">
            <Button type="submit" className="w-full sm:w-auto" isLoading={createProduct.isPending}>
              Create product
            </Button>
          </div>
        </form>
        {formError && (
          <div className="mt-3">
            <ErrorState message={formError} />
          </div>
        )}
      </Card>

      {menu.isError && <ErrorState message="Failed to load admin menu." onRetry={() => menu.refetch()} />}

      {(menu.data?.categories ?? []).map((cat) => (
        <Card key={cat.id} className="min-w-0 p-4 sm:p-6">
          <h2 className="break-words font-heading font-bold">
            {cat.name} <span className="break-all text-caption text-mutedGray">({cat.id})</span>
          </h2>
          <ul className="mt-2 space-y-2">
            {cat.items.map((it) => (
              <ProductRow
                key={it.id}
                id={it.id}
                name={it.name}
                basePrice={it.basePrice}
                isActive={(it as { isActive?: boolean }).isActive ?? true}
                onToggle={async () => {
                  setTogglingId(it.id);
                  try {
                    await toggle.mutateAsync(it.id);
                    menu.refetch();
                  } finally {
                    setTogglingId(null);
                  }
                }}
                toggling={togglingId === it.id && toggle.isPending}
              />
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function ProductRow({
  id,
  name,
  basePrice,
  isActive,
  onToggle,
  toggling,
}: {
  id: string;
  name: string;
  basePrice: string;
  isActive: boolean;
  onToggle: () => void;
  toggling: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [price, setPrice] = React.useState(basePrice);
  const update = useUpdateProduct(id);
  const [err, setErr] = React.useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(price)) {
      setErr('Price must look like "299.00".');
      return;
    }
    try {
      await update.mutateAsync({ basePrice: price });
      setEditing(false);
    } catch (e) {
      setErr((e as Error)?.message || "Update failed.");
    }
  };

  return (
    <li className="flex min-w-0 flex-col items-stretch gap-3 border-t border-border-default py-3 text-body sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <span className="min-w-0 break-words">
        <span className={isActive ? "" : "line-through text-mutedGray"}>{name}</span>{" "}
        <span className="text-caption text-mutedGray">{formatINR(basePrice)}</span>{" "}
        <span className="text-caption">{isActive ? "● active" : "○ disabled"}</span>
      </span>
      <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        {editing ? (
          <>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} className="w-28 shrink-0" />
            <Button size="sm" className="flex-1 whitespace-nowrap sm:flex-none" onClick={save} isLoading={update.isPending}>
              Save
            </Button>
            <Button size="sm" className="flex-1 whitespace-nowrap sm:flex-none" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" className="flex-1 whitespace-nowrap sm:flex-none" variant="outline" onClick={() => { setPrice(basePrice); setEditing(true); }}>
            Edit price
          </Button>
        )}
        <Button size="sm" className="flex-1 whitespace-nowrap sm:flex-none" variant={isActive ? "danger" : "primary"} onClick={onToggle} disabled={toggling}>
          {toggling ? "…" : isActive ? "Disable" : "Enable"}
        </Button>
      </span>
      {err && <span className="w-full text-caption text-brand-red">{err}</span>}
      <span className="hidden">{id}</span>
    </li>
  );
}
