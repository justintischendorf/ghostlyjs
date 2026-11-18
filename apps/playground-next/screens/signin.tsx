"use client";

import { useLoading } from "@/components/loading";
import { useNavigate } from "@/lib/navigation";
import { signIn } from "@/lib/session";
import { Ghost } from "ghostlyjs";
import { EyeOff } from "lucide-react";
import type { FormEvent } from "react";

// The pretend login. The account page sends you here without a session.
export default function SignIn() {
  const { isLoading } = useLoading();
  const navigate = useNavigate();

  function submit(event: FormEvent) {
    event.preventDefault();
    signIn();
    navigate("/account");
  }

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <form
        onSubmit={submit}
        className="mx-auto flex w-full max-w-sm flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted">A form, and a Ghost hidden below lg.</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            type="email"
            required
            className="rounded-xl border border-border bg-background px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Password
          <input
            type="password"
            required
            className="rounded-xl border border-border bg-background px-3 py-2 font-normal"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" /> Stay signed in
        </label>
        <button
          type="submit"
          className="rounded-full bg-foreground py-2.5 font-medium text-background"
        >
          Sign in
        </button>
      </form>

      {/* Only from lg on: below, the content of this <Ghost> is hidden */}
      <Ghost name="signin-highlights" isLoading={isLoading}>
        <aside className="hidden flex-col gap-4 rounded-3xl bg-accent p-8 text-on-accent lg:flex">
          <EyeOff className="size-8" />
          <p className="text-2xl font-semibold">
            “Hidden below lg: measured there with no size, and its skeleton
            takes no space either.”
          </p>
          <p className="text-on-accent/70">A Ghost in a hidden aside</p>
        </aside>
      </Ghost>
    </div>
  );
}
