"use client";

import { useLoading } from "@/components/loading";
import { Ghost } from "ghostlyjs";

const field = "rounded-xl border border-border bg-background px-3 py-2";

export default function Form() {
  const { isLoading } = useLoading();

  return (
    <>
      <h1 className="text-3xl font-bold">Form</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Inputs, textarea, select, checkbox, radio and buttons */}
        <Ghost name="form-fields" isLoading={isLoading}>
          <form className="flex flex-col gap-5 rounded-2xl border border-border p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                First name
                <input className={field} placeholder="Ada" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Last name
                <input className={field} placeholder="Lovelace" />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Role
              <select className={field}>
                <option>Engineer</option>
                <option>Designer</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              About you
              <textarea className={field} rows={4} placeholder="Tell us…" />
            </label>
            <div className="flex flex-wrap gap-5 text-sm">
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
            <div className="flex justify-end gap-3">
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
          <aside className="flex flex-col gap-3 rounded-2xl bg-card p-6">
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
