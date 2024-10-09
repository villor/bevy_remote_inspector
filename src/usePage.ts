import { create } from "zustand";

export type Page = "inspector" | "component" | "ui";

export const usePage = create<{
  currentPage: Page;
  setPage: (page: Page) => void;
}>((set) => ({
  currentPage: "inspector",
  setPage: (page: Page) => set({ currentPage: page }),
}));
