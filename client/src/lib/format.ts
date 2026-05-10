import type { ProductCardViewModel } from "../types/api";

export function toSentenceCase(value: string): string {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function buildSectionId(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function joinBookCollections(book: ProductCardViewModel): string {
  if (book.categories.length === 0) {
    return "Bookstore Edition";
  }

  return book.categories.map((item) => item.name).join(" • ");
}
