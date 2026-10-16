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
import { apiFetch } from "@/lib/api";
import {
  createProductRequestSchema,
  updateProductRequestSchema,
} from "@shared/contract/contract";
import type {
  AdminMenuItem,
  CreateProductRequest,
  UpdateProductRequest,
} from "@shared/contract/contract";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, ErrorState, Modal } from "@/components/ui/LayoutPrimitives";

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
  const [editingProduct, setEditingProduct] = React.useState<AdminMenuItem | null>(null);
  const updateProduct = useUpdateProduct(editingProduct?.id ?? "");

  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [basePrice, setBasePrice] = React.useState("");
  const [isVeg, setIsVeg] = React.useState(true);
  const [description, setDescription] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = React.useState<"idle" | "uploading" | "error" | "success">("idle");
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const previewUrlRef = React.useRef<string | null>(null);
  const uploadSequenceRef = React.useRef(0);
  const [variants, setVariants] = React.useState<{ label: string; priceDelta: string }[]>([]);
  const [addOns, setAddOns] = React.useState<{ label: string; price: string }[]>([]);
  const [inlineErrors, setInlineErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const toggle = useToggleProductStatus();

  React.useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  React.useEffect(() => {
    if (!editorOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditorOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      uploadSequenceRef.current += 1;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    };
  }, [editorOpen]);

  React.useEffect(() => {
    if (session.data?.ok === false) router.replace("/admin/login");
  }, [session.data, router]);

  if (session.isLoading) return <p className="py-12 text-body">Checking session…</p>;
  if (session.data?.ok === false) return null;

  const categories = menu.data?.categories ?? [];
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? categories[0];

  const clearUploadState = () => {
    uploadSequenceRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setUploadFile(null);
    setLocalPreviewUrl(null);
    setUploadStatus("idle");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearEditor = () => {
    setEditingProduct(null);
    setName("");
    setCategoryId("");
    setBasePrice("");
    setIsVeg(true);
    setDescription("");
    setImageUrl("");
    clearUploadState();
    setVariants([]);
    setAddOns([]);
    setInlineErrors({});
    setFormError(null);
  };

  const beginEdit = (product: AdminMenuItem) => {
    setEditingProduct(product);
    setName(product.name);
    setCategoryId(product.categoryId);
    setBasePrice(product.basePrice);
    setIsVeg(product.isVeg);
    setDescription(product.description ?? "");
    setImageUrl(product.imageUrl ?? "");
    clearUploadState();
    setVariants(product.variants.map(({ label, priceDelta }) => ({ label, priceDelta })));
    setAddOns(product.addOns.map(({ label, price }) => ({ label, price })));
    setInlineErrors({});
    setFormError(null);
  };

  const uploadProductImage = async (file: File) => {
    const requestId = ++uploadSequenceRef.current;
    const formData = new FormData();
    formData.append("file", file);
    setUploadStatus("uploading");
    setUploadError(null);
    try {
      const result = await apiFetch<{ imageUrl: string }>("/admin/uploads/product-image", {
        method: "POST",
        body: formData,
      });
      if (requestId !== uploadSequenceRef.current) return;
      setImageUrl(result.imageUrl);
      setUploadStatus("success");
      setUploadFile(null);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setLocalPreviewUrl(null);
    } catch (error) {
      if (requestId !== uploadSequenceRef.current) return;
      setUploadStatus("error");
      setUploadError((error as Error)?.message || "Image upload failed. Try again.");
    }
  };

  const selectImageFile = (file?: File) => {
    if (!file) return;
    uploadSequenceRef.current += 1;
    if (!(["image/svg+xml", "image/png", "image/jpeg", "image/webp"] as string[]).includes(file.type)) {
      setUploadStatus("error");
      setUploadError("Choose an SVG, PNG, JPEG, or WebP image.");
      setUploadFile(null);
      return;
    }
    if (file.size > 1024 * 1024) {
      setUploadStatus("error");
      setUploadError("Image must be 1 MB or smaller.");
      setUploadFile(null);
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setLocalPreviewUrl(previewUrl);
    setUploadFile(file);
    void uploadProductImage(file);
  };

  const normalizedVariants = () => variants
    .map((row) => ({ label: row.label.trim(), priceDelta: row.priceDelta }))
    .filter((row) => row.label !== "" || (row.priceDelta !== "" && row.priceDelta !== "0"));
  const normalizedAddOns = () => addOns
    .map((row) => ({ label: row.label.trim(), price: row.price }))
    .filter((row) => row.label !== "" || row.price !== "");

  const editPayload = (): UpdateProductRequest => {
    if (!editingProduct) return {};
    const patch: UpdateProductRequest = {};
    const trimmedName = name.trim();
    const nextDescription = description.trim();
    const nextImageUrl = imageUrl.trim();
    const nextVariants = normalizedVariants();
    const nextAddOns = normalizedAddOns();
    if (trimmedName !== editingProduct.name) patch.name = trimmedName;
    if (categoryId !== editingProduct.categoryId) patch.categoryId = categoryId;
    if (basePrice !== editingProduct.basePrice) patch.basePrice = basePrice;
    if (isVeg !== editingProduct.isVeg) patch.isVeg = isVeg;
    if (nextDescription && nextDescription !== (editingProduct.description ?? "")) patch.description = nextDescription;
    if (nextImageUrl && nextImageUrl !== (editingProduct.imageUrl ?? "")) patch.imageUrl = nextImageUrl;
    const initialVariants = editingProduct.variants.map(({ label, priceDelta }) => ({ label: label.trim(), priceDelta }));
    if (JSON.stringify(nextVariants) !== JSON.stringify(initialVariants)) patch.variants = nextVariants;
    const initialAddOns = editingProduct.addOns.map(({ label, price }) => ({ label: label.trim(), price }));
    if (JSON.stringify(nextAddOns) !== JSON.stringify(initialAddOns)) patch.addOns = nextAddOns;
    return patch;
  };

  const saveEditorStatus = async () => {
    if (!editingProduct) return;
    setTogglingId(editingProduct.id);
    try {
      await toggle.mutateAsync(editingProduct.id);
      setEditingProduct((current) => current ? { ...current, isActive: !current.isActive } : current);
      await menu.refetch();
    } finally {
      setTogglingId(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInlineErrors({});
    const nextVariants = normalizedVariants();
    const nextAddOns = normalizedAddOns();
    try {
      if (editingProduct) {
        const patch = editPayload();
        if (Object.keys(patch).length === 0) {
          setFormError("Make a change before saving.");
          return;
        }
        const parsed = updateProductRequestSchema.safeParse(patch);
        if (!parsed.success) {
          setInlineErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])));
          setFormError("Please correct the highlighted fields.");
          return;
        }
        await updateProduct.mutateAsync(parsed.data);
        await menu.refetch();
        clearEditor();
        setEditorOpen(false);
        return;
      }

      const payload: CreateProductRequest = {
        name,
        categoryId,
        basePrice,
        isVeg,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        ...(nextVariants.length ? { variants: nextVariants } : {}),
        ...(nextAddOns.length ? { addOns: nextAddOns } : {}),
      };
      const parsed = createProductRequestSchema.safeParse(payload);
      if (!parsed.success) {
        setInlineErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])));
        setFormError("Please correct the highlighted fields.");
        return;
      }
      await createProduct.mutateAsync(parsed.data);
      clearEditor();
      setEditorOpen(false);
      await menu.refetch();
    } catch (err) {
      setFormError((err as Error)?.message || `Failed to ${editingProduct ? "update" : "create"} product.`);
    }
  };

  const canSave = !editingProduct || Object.keys(editPayload()).length > 0;
  const savePending = editingProduct ? updateProduct.isPending : createProduct.isPending;

  return (
    <div className="min-w-0 space-y-4 pb-8 sm:space-y-5">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-h2 font-heading font-bold">Menu Manager</h1>
          <p className="mt-1 break-words text-body text-bodySecondary">
            Soft toggle only — products are never deleted so historical orders stay intact.
          </p>
        </div>
        <Button className="w-full shrink-0 whitespace-nowrap sm:w-auto" onClick={() => { clearEditor(); setEditorOpen(true); }}>
          + Add Product
        </Button>
      </div>

      {editorOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
        onClick={(event) => { if (event.target === event.currentTarget.firstElementChild) { clearUploadState(); setEditorOpen(false); } }}
        className="contents [&>div]:!p-0 sm:[&>div]:!p-4 [&>div>div]:!flex [&>div>div]:!h-[100dvh] [&>div>div]:!max-h-[100dvh] [&>div>div]:!max-w-none [&>div>div]:!flex-col [&>div>div]:!overflow-hidden [&>div>div]:!rounded-none [&>div>div]:!border-0 [&>div>div]:!p-0 sm:[&>div>div]:!h-[90dvh] sm:[&>div>div]:!max-h-[900px] sm:[&>div>div]:!max-w-[880px] sm:[&>div>div]:!rounded-modal sm:[&>div>div]:!border sm:[&>div>div]:!p-0 [&>div>div>div:first-child]:!sticky [&>div>div>div:first-child]:!top-0 [&>div>div>div:first-child]:!z-20 [&>div>div>div:first-child]:!bg-white [&>div>div>div:first-child]:!px-4 [&>div>div>div:first-child]:!py-4 sm:[&>div>div>div:first-child]:!px-8 [&>div>div>div:nth-child(2)]:!mt-0 [&>div>div>div:nth-child(2)]:!flex [&>div>div>div:nth-child(2)]:!min-h-0 [&>div>div>div:nth-child(2)]:!flex-1 [&>div>div>div:nth-child(2)]:!flex-col [&>div>div>div:nth-child(2)]:!overflow-y-auto"
      >
      <Modal isOpen={editorOpen} onClose={() => { clearUploadState(); setEditorOpen(false); }} title={editingProduct ? "Edit Product" : "Product Details"}>
      <div id="product-editor-title" className="sr-only">{editingProduct ? "Edit Product" : "Product Details"}</div>
      <div className="min-w-0 px-4 pb-2 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default pb-6">
          <div className="min-w-0">
            <p className="mt-1 max-w-2xl text-body text-bodySecondary">Specify options, ingredients, customization addons and pricing variables</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-label font-bold text-bodySecondary">Active Status</span>
            <button type="button" role="switch" aria-checked={editingProduct ? editingProduct.isActive : true} aria-label="Active Status" onClick={saveEditorStatus} disabled={!editingProduct || togglingId === editingProduct.id} className={`relative h-7 w-12 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${editingProduct ? (editingProduct.isActive ? "bg-brand-red" : "bg-border-default") : "cursor-not-allowed bg-brand-red"}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${editingProduct?.isActive ? "right-1" : editingProduct ? "left-1" : "right-1"}`} />
            </button>
          </div>
        </div>
        <form onSubmit={submit} className="mt-7 grid min-w-0 gap-x-5 gap-y-6 sm:grid-cols-2">
          <label className="block min-w-0 text-label font-bold text-charcoal">
            Product Name <span className="text-brand-red">*</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} error={inlineErrors.name} className="mt-1.5 h-12 rounded-lg" />
          </label>
          <label className="block min-w-0 text-label font-bold text-charcoal">
            Menu Category <span className="text-brand-red">*</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              aria-invalid={Boolean(inlineErrors.categoryId)}
              className={`mt-1.5 h-12 w-full min-w-0 rounded-lg border bg-white px-3.5 text-body text-charcoal focus:border-border-active focus:outline-none focus:ring-1 focus:ring-border-active ${inlineErrors.categoryId ? "border-brand-red focus:border-brand-red focus:ring-brand-red" : "border-border-default"}`}
            >
              <option value="">Choose a category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {inlineErrors.categoryId && <span className="mt-1 block text-caption text-brand-red">{inlineErrors.categoryId}</span>}
          </label>
          <label className="block min-w-0 text-label font-bold text-charcoal">
            Base Price (₹) <span className="text-brand-red">*</span>
            <Input
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="299.00"
              required
              error={inlineErrors.basePrice}
              className="mt-1.5 h-12 rounded-lg"
            />
          </label>
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-label font-bold text-charcoal">Product Type</legend>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsVeg(true)} aria-pressed={isVeg} className={`h-12 rounded-lg border text-body font-semibold ${isVeg ? "border-brand-red bg-status-errorBg text-brand-red" : "border-border-default bg-white text-bodySecondary"}`}>Pure Veg</button>
              <button type="button" onClick={() => setIsVeg(false)} aria-pressed={!isVeg} className={`h-12 rounded-lg border text-body font-semibold ${!isVeg ? "border-brand-red bg-status-errorBg text-brand-red" : "border-border-default bg-white text-bodySecondary"}`}>Non-Veg</button>
            </div>
          </fieldset>
          <label className="block min-w-0 text-label font-bold text-charcoal sm:col-span-2">
            Description
            <textarea
              rows={4}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={Boolean(inlineErrors.description)}
              className={`mt-1.5 w-full resize-y rounded-lg border bg-white px-3.5 py-3 text-body font-normal text-charcoal focus:outline-none focus:ring-1 ${inlineErrors.description ? "border-brand-red focus:border-brand-red focus:ring-brand-red" : "border-border-default focus:border-border-active focus:ring-border-active"}`}
            />
            {inlineErrors.description && <span className="mt-1 block text-caption text-brand-red">{inlineErrors.description}</span>}
          </label>

          <section className="min-w-0 sm:col-span-2">
            <h3 className="text-label font-bold text-charcoal">Product Photo</h3>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInputRef.current?.click(); } }}
              onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={(event) => { event.preventDefault(); setIsDraggingFile(false); selectImageFile(event.dataTransfer.files[0]); }}
              className={`mt-2 grid min-w-0 cursor-pointer gap-3 rounded-xl border border-dashed bg-cream-bg p-3 transition-colors sm:grid-cols-[88px_minmax(0,1fr)_40px] sm:items-center sm:p-4 ${isDraggingFile ? "border-brand-red bg-status-errorBg" : "border-border-default"}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/svg+xml,image/png,image/jpeg,image/webp"
                className="sr-only"
                aria-label="Choose product image"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => { selectImageFile(event.target.files?.[0]); event.currentTarget.value = ""; }}
              />
              {localPreviewUrl || imageUrl ? (
                <img src={localPreviewUrl ?? imageUrl} alt="Product preview" className="mx-auto h-[88px] w-[88px] rounded-lg border border-border-default bg-white object-cover sm:mx-0" />
              ) : (
                <div className="mx-auto grid h-[88px] w-[88px] place-items-center rounded-lg border border-border-default bg-white text-caption text-bodySecondary sm:mx-0">Upload</div>
              )}
              <div className="min-w-0 text-center sm:text-left">
                <p className="truncate font-semibold text-charcoal">{uploadFile?.name ?? (imageUrl ? imageUrl.split("/").pop()?.split("?")[0] : "Upload photo")}</p>
                <p className="mt-1 text-caption text-bodySecondary">Click or drag an SVG, PNG, JPEG, or WebP image here (max 1 MB).</p>
                {uploadStatus === "uploading" && <p role="status" className="mt-2 inline-flex items-center gap-2 text-caption font-semibold text-bodySecondary"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-border-default border-t-brand-red" />Uploading image…</p>}
                {uploadStatus === "success" && <p role="status" className="mt-2 text-caption font-semibold text-status-success">Image uploaded.</p>}
                {uploadError && <p role="alert" className="mt-2 text-caption font-semibold text-brand-red">{uploadError}</p>}
                {uploadStatus === "error" && uploadFile && <button type="button" onClick={(event) => { event.stopPropagation(); void uploadProductImage(uploadFile); }} className="mt-2 text-caption font-bold text-brand-red underline">Retry upload</button>}
              </div>
              {!editingProduct && (
                <button type="button" onClick={(event) => { event.stopPropagation(); setImageUrl(""); clearUploadState(); }} aria-label="Clear image URL" className="grid h-10 w-10 place-items-center justify-self-center rounded-lg text-brand-red hover:bg-status-errorBg focus:outline-none focus:ring-2 focus:ring-brand-red sm:justify-self-auto">
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg>
                </button>
              )}
            </div>
          </section>

          <section className="min-w-0 border-y border-border-default py-5 sm:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading font-bold text-charcoal">Variants &amp; Portions</h3>
              <button type="button" onClick={() => setVariants((rows) => [...rows, { label: "", priceDelta: "0" }])} className="text-caption font-bold text-brand-red hover:underline">+ Add Variant</button>
            </div>
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={index} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(88px,0.42fr)_36px] items-start gap-2">
                  <Input aria-label={`Variant ${index + 1} name`} value={variant.label} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value } : row))} maxLength={100} error={inlineErrors[`variants.${index}.label`]} className="h-10 rounded-lg" />
                  <Input aria-label={`Variant ${index + 1} price delta`} value={variant.priceDelta} onChange={(event) => setVariants((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, priceDelta: event.target.value } : row))} placeholder="+₹ 0" error={inlineErrors[`variants.${index}.priceDelta`]} className="h-10 min-w-0 rounded-lg" />
                  <button type="button" aria-label={`Remove variant ${index + 1}`} onClick={() => setVariants((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="grid h-9 w-9 place-items-center rounded-full border border-border-default text-bodySecondary hover:border-brand-red hover:text-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red">×</button>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 sm:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading font-bold text-charcoal">Add-ons &amp; Customizations</h3>
              <button type="button" onClick={() => setAddOns((rows) => [...rows, { label: "", price: "" }])} className="text-caption font-bold text-brand-red hover:underline">+ Add Choice</button>
            </div>
            <div className="space-y-2">
              {addOns.map((addOn, index) => (
                <div key={index} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(88px,0.42fr)_36px] items-start gap-2">
                  <Input aria-label={`Add-on ${index + 1} name`} value={addOn.label} onChange={(event) => setAddOns((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, label: event.target.value } : row))} maxLength={100} error={inlineErrors[`addOns.${index}.label`]} className="h-10 rounded-lg" />
                  <Input aria-label={`Add-on ${index + 1} price`} value={addOn.price} onChange={(event) => setAddOns((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, price: event.target.value } : row))} placeholder="+₹ 0" error={inlineErrors[`addOns.${index}.price`]} className="h-10 min-w-0 rounded-lg" />
                  <button type="button" aria-label={`Remove add-on ${index + 1}`} onClick={() => setAddOns((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="grid h-9 w-9 place-items-center rounded-full border border-border-default text-bodySecondary hover:border-brand-red hover:text-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red">×</button>
                </div>
              ))}
            </div>
          </section>

          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-border-default bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:flex-row sm:justify-end sm:px-8">
            <Button type="button" variant="outline" className="h-12 w-full rounded-lg px-6 text-body sm:w-auto" onClick={() => { clearEditor(); setEditorOpen(false); }}>
              Discard Changes
            </Button>
            <Button type="submit" className="h-12 w-full rounded-lg px-6 text-body sm:w-auto" isLoading={savePending} disabled={!canSave || uploadStatus === "uploading"}>
              Save Changes
            </Button>
          </div>
        </form>
        {formError && <div className="mt-3"><ErrorState message={formError} /></div>}
      </div>
      </Modal>
      </div>
      )}

      {menu.isError && <ErrorState message="Failed to load admin menu." onRetry={() => menu.refetch()} />}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(270px,0.8fr)_minmax(0,1.5fr)]">
        <Card className="min-w-0 overflow-hidden p-2 sm:p-4">
          <h2 className="font-heading text-h3 font-bold">Categories</h2>
          <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-2 xl:flex-col xl:gap-3 xl:overflow-visible xl:pb-0">
            {categories.map((category) => {
              const isSelected = selectedCategory?.id === category.id;
              const activeCount = category.items.filter((item) => (item as { isActive?: boolean }).isActive ?? true).length;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  aria-pressed={isSelected}
                  className={`w-auto min-w-max shrink-0 rounded-full border px-3 py-2 text-sm text-left transition-colors xl:w-full xl:min-w-0 xl:rounded-xl xl:p-3 ${isSelected ? "border-brand-red bg-status-errorBg" : "border-border-default bg-white hover:bg-cream-bg"}`}
                >
                  <span className="block whitespace-nowrap font-heading font-bold text-charcoal xl:whitespace-normal">{category.name}</span>
                  <span className="mt-1 hidden text-caption text-bodySecondary xl:block">{activeCount} active products</span>
                  <span className="ml-2 text-caption text-bodySecondary xl:hidden">{activeCount}</span>
                </button>
              );
            })}
            {categories.length === 0 && !menu.isLoading && <p className="text-body text-bodySecondary">No categories available.</p>}
          </div>
        </Card>

        <Card className="min-w-0 p-3 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default pb-4">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="break-words font-heading text-h3 font-bold">{selectedCategory?.name ?? "Products"}</h2>
              <span className="shrink-0 rounded-full bg-status-errorBg px-2.5 py-1 text-caption font-bold text-brand-red">{selectedCategory?.items.length ?? 0} items</span>
            </div>
          </div>
          {selectedCategory ? (
            <>
              <div className="hidden grid-cols-[minmax(0,1fr)_100px_100px_100px] gap-3 border-b border-border-default bg-cream-bg px-3 py-3 text-caption font-semibold uppercase text-bodySecondary md:grid">
                <span>Product Info</span><span>Price</span><span>Status</span><span className="text-right">Actions</span>
              </div>
              <ul className="min-w-0">
                {selectedCategory.items.map((item) => (
                  <ProductRow
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    imageUrl={item.imageUrl}
                    isVeg={item.isVeg}
                    basePrice={item.basePrice}
                    isActive={(item as { isActive?: boolean }).isActive ?? true}
                    onEdit={() => { beginEdit(item as AdminMenuItem); setEditorOpen(true); }}
                    onToggle={async () => {
                      setTogglingId(item.id);
                      try {
                        await toggle.mutateAsync(item.id);
                        menu.refetch();
                      } finally {
                        setTogglingId(null);
                      }
                    }}
                    toggling={togglingId === item.id && toggle.isPending}
                  />
                ))}
                {selectedCategory.items.length === 0 && <li className="py-8 text-center text-body text-bodySecondary">No products in this category.</li>}
              </ul>
            </>
          ) : (
            <p className="py-8 text-center text-body text-bodySecondary">Select a category to view its products.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function ProductRow({
  id,
  name,
  imageUrl,
  isVeg,
  basePrice,
  isActive,
  onEdit,
  onToggle,
  toggling,
}: {
  id: string;
  name: string;
  imageUrl: string | null;
  isVeg: boolean;
  basePrice: string;
  isActive: boolean;
  onEdit: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  return (
    <li className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_40px] items-center gap-x-3 gap-y-2 rounded-xl border border-border-default bg-white p-2 text-body md:my-2 md:grid-cols-[minmax(0,1fr)_100px_100px_100px] md:rounded-none md:border-x-0 md:border-b-0 md:px-2 md:py-3">
      <div className="col-span-3 flex min-w-0 items-center gap-3 md:col-span-1">
        {imageUrl ? <img src={imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border-default object-cover" /> : <div aria-hidden="true" className="h-12 w-12 shrink-0 rounded-lg border border-border-default bg-cream-bg" />}
        <span className="min-w-0 break-words">
          <span className={`block font-semibold ${isActive ? "" : "line-through text-mutedGray"}`}>{name}</span>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${isVeg ? "bg-status-successBg text-status-success" : "bg-status-errorBg text-brand-red"}`}>{isVeg ? "Veg" : "Non-Veg"}</span>
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2 md:col-auto">
        <span className="text-caption text-bodySecondary md:hidden">Price</span>
        <span className="font-semibold">{formatINR(basePrice)}</span>
      </div>
      <div className="flex items-center justify-end md:justify-start">
        <Button size="sm" className={`relative h-6 w-10 min-w-0 overflow-hidden px-0 text-transparent ${isActive ? "bg-brand-red" : "bg-border-default"}`} variant={isActive ? "danger" : "primary"} onClick={onToggle} disabled={toggling} aria-label={`${isActive ? "Disable" : "Enable"} ${name}`} role="switch" aria-checked={isActive}>
          <span className="sr-only">{toggling ? "Updating" : isActive ? "Disable" : "Enable"}</span>
          <span aria-hidden="true" className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isActive ? "translate-x-4" : ""}`} />
        </Button>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onEdit} className="grid h-10 w-10 place-items-center p-0" aria-label={`Edit ${name}`}>
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
      </Button>
      <span className="hidden">{id}</span>
    </li>
  );
}
