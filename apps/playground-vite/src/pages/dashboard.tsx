import { Ghost } from "ghostlyjs";

import { useLoading } from "../components/loading";
import { months, orders, sales, stats } from "../lib/data";

const statusColors: Record<string, string> = {
  Paid: "bg-success/15 text-success",
  Pending: "bg-warning/15 text-warning",
  Refunded: "bg-danger/15 text-danger",
};

export default function Dashboard() {
  const { isLoading } = useLoading();

  return (
    <>
      <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>

      {/* Stat cards: 1, 2, then 4 columns */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 2xl:gap-6">
        {stats.map((stat, index) => (
          <Ghost
            key={stat.label}
            name={`dashboard-stat-${index}`}
            isLoading={isLoading}
          >
            <div className="flex flex-col gap-1 rounded-2xl border border-border p-4 sm:p-5">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="text-xl font-bold sm:text-2xl xl:text-3xl">
                {stat.value}
              </p>
              <p className="text-sm text-accent">{stat.change}</p>
            </div>
          </Ghost>
        ))}
      </div>

      {/* Bar chart: many small boxes of different heights. Taller on wider
          windows, month labels from md on. */}
      <Ghost name="dashboard-chart" isLoading={isLoading}>
        <section className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:p-5">
          <h2 className="font-semibold">Sales per month</h2>
          <div className="flex h-40 items-end gap-1 sm:h-48 sm:gap-2 lg:h-56 xl:h-64">
            {sales.map((value, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-md bg-accent"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
          <div className="hidden gap-2 text-center text-xs text-muted md:flex">
            {months.map((month) => (
              <span key={month} className="flex-1">
                {month}
              </span>
            ))}
          </div>
        </section>
      </Ghost>

      {/* Table, badges and progress bars: side by side from lg on */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr] 2xl:grid-cols-[3fr_1fr] 2xl:gap-6">
        <Ghost name="dashboard-orders" isLoading={isLoading}>
          <section className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="p-3 font-medium sm:p-4">Order</th>
                  {/* No customer column on phones */}
                  <th className="hidden p-3 font-medium sm:table-cell sm:p-4">
                    Customer
                  </th>
                  <th className="p-3 font-medium sm:p-4">Status</th>
                  <th className="p-3 text-right font-medium sm:p-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="p-3 font-mono sm:p-4">{order.id}</td>
                    <td className="hidden p-3 sm:table-cell sm:p-4">
                      {order.customer}
                    </td>
                    <td className="p-3 sm:p-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[order.status]}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right sm:p-4">{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </Ghost>

        <Ghost name="dashboard-goals" isLoading={isLoading}>
          <section className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:p-5">
            <h2 className="font-semibold">Goals</h2>
            {/* In a row at md, where the card is full width */}
            <div className="flex flex-col gap-4 md:flex-row md:gap-6 lg:flex-col lg:gap-4">
              {[
                { label: "Revenue", value: 72 },
                { label: "New customers", value: 45 },
                { label: "Reviews", value: 90 },
              ].map((goal) => (
                <div key={goal.label} className="flex flex-col gap-2 md:flex-1">
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
            </div>
          </section>
        </Ghost>
      </div>
    </>
  );
}
