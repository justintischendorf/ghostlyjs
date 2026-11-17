"use client";

import { useLoading } from "@/components/loading";
import { jobs, log } from "@/lib/data";
import { Ghost } from "ghostlyjs";

// No link points here: `ghostly measure --pages /admin` measures it.
export default function Admin() {
  const { isLoading } = useLoading();

  return (
    <>
      <h1 className="text-2xl font-bold sm:text-3xl">Admin</h1>

      <Ghost name="admin-jobs" isLoading={isLoading}>
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl border border-border p-4 sm:grid-cols-[12rem_1fr_6rem]"
            >
              <span className="font-medium">{job.name}</span>
              <span className="text-right text-sm text-muted sm:order-last">
                {job.state}
              </span>
              <div className="col-span-2 h-2 rounded-full bg-card sm:col-span-1">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Ghost>

      <Ghost name="admin-log" isLoading={isLoading}>
        {/* Long lines don't wrap: the block scrolls sideways */}
        <pre className="overflow-x-auto rounded-2xl bg-card p-4 font-mono text-xs leading-relaxed">
          {log.join("\n")}
        </pre>
      </Ghost>
    </>
  );
}
