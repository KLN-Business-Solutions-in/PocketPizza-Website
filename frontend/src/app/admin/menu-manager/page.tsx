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
    if (!/^\d+(\.\d{1,2})?$/.test(basePrice)) {
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
    <div className="space-y-6 pb-12">
      <h1 className="text-h2 font-heading font-bold">Menu Manager</h1>
      <p className="text-body text-bodySecondary">
        Soft toggle only — products are never deleted so historical orders stay intact.
      </p>

      <Card>
        <h2 className="font-heading font-bold">New product</h2>
        <form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-2">
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
          <label className="flex items-center gap-2 text-body">
            <input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} />
            Vegetarian
          </label>
          <div className="md:col-span-2">
            <Button type="submit" isLoading={createProduct.isPending}>
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
        <Card key={cat.id}>
          <h2 className="font-heading font-bold">
            {cat.name} <span className="text-caption text-mutedGray">({cat.id})</span>
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
    if (!/^\d+(\.\d{1,2})?$/.test(price)) {
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
    <li className="flex flex-wrap items-center justify-between gap-2 border-t py-2 text-body">
      <span>
        <span className={isActive ? "" : "line-through text-mutedGray"}>{name}</span>{" "}
        <span className="text-caption text-mutedGray">{formatINR(basePrice)}</span>{" "}
        <span className="text-caption">{isActive ? "● active" : "○ disabled"}</span>
      </span>
      <span className="flex items-center gap-2">
        {editing ? (
          <>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} className="w-28" />
            <Button size="sm" onClick={save} isLoading={update.isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => { setPrice(basePrice); setEditing(true); }}>
            Edit price
          </Button>
        )}
        <Button size="sm" variant={isActive ? "danger" : "primary"} onClick={onToggle} disabled={toggling}>
          {toggling ? "…" : isActive ? "Disable" : "Enable"}
        </Button>
      </span>
      {err && <span className="w-full text-caption text-brand-red">{err}</span>}
      <span className="hidden">{id}</span>
    </li>
  );
}
