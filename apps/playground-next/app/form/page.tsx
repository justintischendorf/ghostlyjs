"use client";

import { useLoading } from "@/components/loading";
import { Ghost } from "ghostlyjs";

const field = "rounded-xl border border-border bg-background px-3 py-2";

export default function Form() {
  const { isLoading } = useLoading();

  return (
    <>
      <h1 className="text-2xl font-bold sm:text-3xl">Form</h1>

      {/* The help moves next to the form from lg on and gets wider */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_340px] 2xl:grid-cols-[1fr_400px]">
        {/* Inputs, textarea, select, checkbox, radio and buttons */}
        <Ghost name="form-fields" isLoading={isLoading}>
          <form className="flex flex-col gap-5 rounded-2xl border border-border p-4 sm:p-6 xl:p-8">
            {/* 1, 2, then 3 columns */}
            <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-medium">
                First name
                <input className={field} placeholder="Ada" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Last name
                <input className={field} placeholder="Lovelace" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2 2xl:col-span-1">
                Role
                <select className={field}>
                  <option>Engineer</option>
                  <option>Designer</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium">
              About you
              <textarea className={field} rows={4} placeholder="Tell us…" />
            </label>
            <div className="flex flex-col gap-3 text-sm sm:flex-row sm:gap-5">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked /> Newsletter
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="plan" defaultChecked /> Free
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="plan" /> Pro
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Volume
              <input type="range" />
            </label>
            {/* Full-width buttons on phones, Save on top */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-full border border-border px-5 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-foreground px-5 py-2 text-background"
              >
                Save
              </button>
            </div>
          </form>
        </Ghost>

        <Ghost name="form-help" isLoading={isLoading}>
          <aside className="flex flex-col gap-3 rounded-2xl bg-card p-4 sm:p-6">
            <h2 className="font-semibold">Why we ask</h2>
            <p className="text-sm text-muted">
              Native form controls are measured as one box each. Their inner
              parts like options or the text of a textarea are ignored.
            </p>
          </aside>
        </Ghost>
      </div>
    </>
  );
}
