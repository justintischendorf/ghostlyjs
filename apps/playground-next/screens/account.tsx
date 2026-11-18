"use client";

import Avatar from "@/components/avatar";
import { useLoading } from "@/components/loading";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { me, sessions } from "@/lib/data";
import { useNavigate } from "@/lib/navigation";
import { signOut } from "@/lib/session";
import { Ghost } from "ghostlyjs";
import { Camera, LogOut, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

// Behind the pretend login (see lib/session.ts). Forms, switches, radio
// cards, buttons that log out and a part `ghostly measure` must skip.
export default function Account() {
  const { isLoading } = useLoading();
  const navigate = useNavigate();
  const [twoFactor, setTwoFactor] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState<string>();

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch("/api/account", { method: "PATCH" });
      setSaved(response.ok ? "Saved" : "Couldn't save.");
    } catch {
      setSaved("Couldn't save.");
    }
  }

  function logOut() {
    signOut();
    navigate("/signin");
  }

  return (
    <>
      <h1 className="text-2xl font-bold sm:text-3xl">Account settings</h1>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Section title="Profile" description="A form with a hidden file input.">
          <Ghost name="account-profile" isLoading={isLoading}>
            <form onSubmit={save} className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                {/* The file input is hidden; the camera badge opens it */}
                <label className="relative cursor-pointer">
                  <Avatar member={me} size="xl" />
                  <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-background bg-foreground text-background">
                    <Camera className="size-4" />
                  </span>
                  <input type="file" accept="image/*" className="sr-only" />
                </label>
                <div className="flex flex-col">
                  <span className="font-semibold">{me.name}</span>
                  <span className="text-sm text-muted">
                    Signed in since 2024
                  </span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Name
                  <input
                    defaultValue={me.name}
                    className="rounded-xl border border-border bg-background px-3 py-2 font-normal"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Email
                  <input
                    type="email"
                    defaultValue="ada@example.com"
                    className="rounded-xl border border-border bg-background px-3 py-2 font-normal"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                  About you
                  <textarea
                    rows={3}
                    defaultValue="A textarea of three rows."
                    className="resize-none rounded-xl border border-border bg-background px-3 py-2 font-normal"
                  />
                </label>
              </div>
              <div className="flex items-center justify-end gap-3">
                {saved && <span className="text-sm text-muted">{saved}</span>}
                <button
                  type="submit"
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
                >
                  Save changes
                </button>
              </div>
            </form>
          </Ghost>
        </Section>

        <Section title="Notifications">
          <Ghost name="account-notifications" isLoading={isLoading}>
            <ul className="flex flex-col divide-y divide-border">
              {[
                ["Reminders", "Switches at the right edge of each row."],
                ["Updates", "Text that wraps on phones, so the rows grow."],
                ["Messages", "On by default."],
                ["Newsletter", "Off by default."],
              ].map(([label, text], index) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{label}</span>
                    <span className="text-sm text-muted">{text}</span>
                  </div>
                  <Switch label={label!} defaultChecked={index < 2} />
                </li>
              ))}
            </ul>
          </Ghost>
        </Section>

        <Section title="Appearance">
          <Ghost name="account-appearance" isLoading={isLoading}>
            {/* Radio buttons as cards: the inputs are hidden */}
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Light", Sun],
                ["Dark", Moon],
                ["System", Monitor],
              ].map(([label, Icon]) => {
                const Shown = Icon as typeof Sun;
                return (
                  <label
                    key={label as string}
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-border p-3 has-checked:border-accent has-checked:bg-accent/10"
                  >
                    <input
                      type="radio"
                      name="theme"
                      defaultChecked={label === "System"}
                      className="sr-only"
                    />
                    <Shown className="size-5" />
                    <span className="text-sm">{label as string}</span>
                  </label>
                );
              })}
            </div>
          </Ghost>
        </Section>

        <Section
          title="Security"
          action={
            !twoFactor && (
              <button
                type="button"
                onClick={() => setTwoFactor(true)}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm"
              >
                <ShieldCheck className="size-4" /> Enable two-factor
              </button>
            )
          }
        >
          {/* Only shows after "Enable two-factor" */}
          {twoFactor && (
            <Ghost name="account-2fa" isLoading={isLoading}>
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-5 sm:flex-row sm:items-start">
                <QrCode />
                <div className="flex flex-col gap-3">
                  <p className="text-sm">
                    Scan the code with your authenticator app, then enter the
                    six digits it shows.
                  </p>
                  <div className="flex gap-1.5">
                    {Array.from({ length: 6 }, (_, index) => (
                      <input
                        key={index}
                        inputMode="numeric"
                        maxLength={1}
                        aria-label={`Digit ${index + 1}`}
                        className="size-10 rounded-xl border border-border bg-background text-center font-mono text-lg"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Ghost>
          )}
          <Ghost name="account-sessions" isLoading={isLoading}>
            <ul className="flex flex-col gap-2">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <Monitor className="size-5 shrink-0 text-muted" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {session.device}
                    </span>
                    <span className="text-xs text-muted">{session.place}</span>
                  </div>
                  {session.current ? (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                      This device
                    </span>
                  ) : (
                    // "Sign out": `ghostly measure` never taps it.
                    <button
                      type="button"
                      onClick={logOut}
                      className="text-sm text-danger"
                    >
                      Sign out
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Ghost>
        </Section>

        {/* `data-ghostly-skip`: nothing in here is tapped */}
        <div data-ghostly-skip>
          <Section title="Subscription">
            {cancelled ? (
              <Ghost name="account-cancelled" isLoading={isLoading}>
                <p className="text-sm">Shows only after a tap on Cancel.</p>
              </Ghost>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="font-semibold">Plus</span>, renews on 31
                  December.
                </p>
                <button
                  type="button"
                  onClick={() => setCancelled(true)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm"
                >
                  Cancel subscription
                </button>
              </div>
            )}
          </Section>
        </div>

        <Section title="Danger zone">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              An alert dialog with a DELETE that `ghostly measure` blocks.
            </p>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white"
            >
              Delete account
            </button>
          </div>
        </Section>

        <button
          type="button"
          onClick={logOut}
          className="flex w-fit items-center gap-2 self-center rounded-full border border-border px-4 py-2 text-sm"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>

      <DeleteDialog open={deleting} onClose={() => setDeleting(false)} />
    </>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// A made-up QR code: a grid of squares.
function QrCode() {
  return (
    <div className="grid size-32 shrink-0 grid-cols-8 gap-0.5 rounded-xl bg-white p-2">
      {Array.from({ length: 64 }, (_, index) => (
        <span
          key={index}
          className={(index * 13) % 5 < 2 ? "bg-black" : "bg-white"}
        />
      ))}
    </div>
  );
}

// Asks first, then sends a DELETE, which `ghostly measure` blocks.
function DeleteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState(false);

  async function remove() {
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) throw new Error();
    } catch {
      setError(true);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      alert
      title="Delete your account?"
      description="This can't be undone."
    >
      {error && (
        <p className="text-sm text-danger">
          The account couldn&apos;t be deleted.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-sm"
        >
          Keep account
        </button>
        <button
          type="button"
          onClick={remove}
          className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white"
        >
          Delete
        </button>
      </div>
    </Dialog>
  );
}
