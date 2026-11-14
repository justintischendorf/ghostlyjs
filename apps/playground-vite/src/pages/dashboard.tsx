import { Ghost } from "ghostlyjs";

import { useLoading } from "../components/loading";
import { orders, sales, stats } from "../lib/data";

const statusColors: Record<string, string> = {
  Paid: "bg-success/15 text-success",
  Pending: "bg-warning/15 text-warning",
  Refunded: "bg-danger/15 text-danger",
};

export default function Dashboard() {
  const { isLoading } = useLoading();

  return (
    <>
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Ghost
            key={stat.label}
            name={`dashboard-stat-${index}`}
            isLoading={isLoading}
          >
            <div className="flex flex-col gap-1 rounded-2xl border border-border p-5">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-accent">{stat.change}</p>
            </div>
          </Ghost>
        ))}
      </div>

      {/* Bar chart: many small boxes of different heights */}
      <Ghost name="dashboard-chart" isLoading={isLoading}>
        <section className="flex flex-col gap-4 rounded-2xl border border-border p-5">
          <h2 className="font-semibold">Sales per month</h2>
          <div className="flex h-48 items-end gap-2">
            {sales.map((value, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-md bg-accent"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </section>
      </Ghost>

      {/* Table, badges and progress bars */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Ghost name="dashboard-orders" isLoading={isLoading}>
          <section className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="p-4 font-medium">Order</th>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="p-4 font-mono">{order.id}</td>
                    <td className="p-4">{order.customer}</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </Ghost>

        <Ghost name="dashboard-goals" isLoading={isLoading}>
          <section className="flex flex-col gap-4 rounded-2xl border border-border p-5">
            <h2 className="font-semibold">Goals</h2>
            {[
              { label: "Revenue", value: 72 },
              { label: "New customers", value: 45 },
              { label: "Reviews", value: 90 },
            ].map((goal) => (
              <div key={goal.label} className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span>{goal.label}</span>
                  <span className="text-muted">{goal.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-card">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${goal.value}%` }}
                  />
                </div>
              </div>
            ))}
          </section>
        </Ghost>
      </div>
    </>
  );
}
