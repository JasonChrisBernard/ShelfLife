import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  getFoods,
  getExpiredFoods,
} from "../services/foodService";

import {
  getFoodHistory,
} from "../services/historyService";

function Dashboard() {
  const [foods, setFoods] = useState([]);
  const [expiredFoods, setExpiredFoods] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          foodsData,
          expiredData,
          historyData,
        ] = await Promise.all([
          getFoods(),
          getExpiredFoods(),
          getFoodHistory(),
        ]);

        setFoods(foodsData);
        setExpiredFoods(expiredData);
        setHistory(historyData);
      } catch (error) {
        console.error(error);

        setError(
          error.message ||
            "Failed to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // =========================
  // TOP SUMMARY
  // =========================

  const pantryItems = foods.length;

  const useSoonItems = foods.filter(
    (food) =>
      food.expiryStatus === "Use Soon"
  ).length;

  // =========================
  // CONSUMED HISTORY
  // =========================

  const consumedHistory = history.filter(
    (item) =>
      item.action === "CONSUMED"
  );

  const totalConsumed = consumedHistory.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  const consumptionRecords =
    consumedHistory.length;

  const consumedByFood =
    consumedHistory.reduce(
      (totals, item) => {
        totals[item.foodName] =
          (totals[item.foodName] || 0) +
          item.quantity;

        return totals;
      },
      {}
    );

  const mostConsumedEntry =
    Object.entries(consumedByFood).sort(
      (a, b) => b[1] - a[1]
    )[0];

  const mostConsumedFood =
    mostConsumedEntry
      ? mostConsumedEntry[0]
      : "No data";

  const mostConsumedQuantity =
    mostConsumedEntry
      ? mostConsumedEntry[1]
      : 0;

  const recentConsumed =
    consumedHistory.slice(0, 5);

  // =========================
  // WASTED TOTAL
  // =========================

    const wastedHistory = history.filter(
    (item) => item.action === "WASTED"
    );

    const wasteReasonTotals = wastedHistory.reduce(
    (totals, item) => {
        const reason = item.wasteReason || "Other";

        totals[reason] =
        (totals[reason] || 0) + item.quantity;

        return totals;
    },
    {}
    );

    const wasteReasonChartData = [
    {
        reason: "Expired",
        quantity: wasteReasonTotals.Expired || 0,
    },
    {
        reason: "Spoiled",
        quantity: wasteReasonTotals.Spoiled || 0,
    },
    {
        reason: "Forgot",
        quantity: wasteReasonTotals.Forgot || 0,
    },
    {
        reason: "Too Much",
        quantity: wasteReasonTotals["Too Much"] || 0,
    },
    {
        reason: "Other",
        quantity: wasteReasonTotals.Other || 0,
    },
    ];

    const mostCommonWasteReasonEntry =
    Object.entries(wasteReasonTotals).sort(
        (a, b) => b[1] - a[1]
    )[0];

    const mostCommonWasteReason =
    mostCommonWasteReasonEntry
        ? mostCommonWasteReasonEntry[0]
        : "No data";

    const mostCommonWasteReasonQuantity =
    mostCommonWasteReasonEntry
        ? mostCommonWasteReasonEntry[1]
        : 0;

    

    const totalWasted = wastedHistory.reduce(
    (total, item) => total + item.quantity,
    0
    );

    const wasteRecords =
    wastedHistory.length;


    const wastedByFood =
    wastedHistory.reduce(
        (totals, item) => {
        totals[item.foodName] =
            (totals[item.foodName] || 0) +
            item.quantity;

        return totals;
        },
        {}
    );

    const mostWastedEntry =
        Object.entries(wastedByFood).sort(
            (a, b) => b[1] - a[1]
        )[0];

        const mostWastedFood =
        mostWastedEntry
            ? mostWastedEntry[0]
            : "No data";

        const mostWastedQuantity =
        mostWastedEntry
            ? mostWastedEntry[1]
            : 0;

    const totalProcessed =
    totalConsumed + totalWasted;

    const wasteRate =
    totalProcessed > 0
        ? Math.round(
            (totalWasted / totalProcessed) * 100
        )
        : 0;

    const recentWasted =
    wastedHistory.slice(0, 5);

  // =========================
  // EXPIRY COUNTS
  // =========================

  const safeCount = foods.filter(
    (food) =>
      food.expiryStatus === "Safe"
  ).length;

  const watchCount = foods.filter(
    (food) =>
      food.expiryStatus === "Watch"
  ).length;

  const expiringSoonCount = foods.filter(
    (food) =>
      food.expiryStatus ===
      "Expiring Soon"
  ).length;

  const useSoonCount = foods.filter(
    (food) =>
      food.expiryStatus === "Use Soon"
  ).length;

  const expiredCount =
    expiredFoods.length;

    const insights = [];

    if (useSoonCount > 0) {
    insights.push(
        `⏱️ You have ${useSoonCount} food ${
        useSoonCount === 1 ? "item" : "items"
        } that should be used within 3 days.`
    );
    }

    if (expiredCount > 0) {
    insights.push(
        `⚠️ You have ${expiredCount} expired ${
        expiredCount === 1 ? "item" : "items"
        } waiting for review.`
    );
    }

    if (mostWastedFood !== "No data") {
    insights.push(
        `🗑️ ${mostWastedFood} is currently your most wasted food.`
    );
    }

    if (mostCommonWasteReason !== "No data") {
    insights.push(
        `📊 ${mostCommonWasteReason} is your most common reason for food waste.`
    );
    }

    if (totalConsumed > 0 || totalWasted > 0) {
    insights.push(
        `📉 Your current waste rate is ${wasteRate}%.`
    );
    }

    if (totalWasted === 0 && totalConsumed > 0) {
    insights.push(
        "🎉 You have no recorded food waste yet. Keep it up!"
    );
    }



  return (
    <main className="app">
      <section className="dashboard-page">

        <div className="dashboard-header">
          <h1>Dashboard</h1>

          <p>
            Your ShelfLife overview and food
            insights.
          </p>
        </div>

        {loading && (
          <p>Loading dashboard...</p>
        )}

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* TOP CARDS */}

            <div className="dashboard-summary">

              <div className="dashboard-card">
                <span>🥗</span>

                <div>
                  <p>Pantry Items</p>
                  <h2>{pantryItems}</h2>
                </div>
              </div>

              <div className="dashboard-card">
                <span>⏱️</span>

                <div>
                  <p>Use Soon</p>
                  <h2>{useSoonItems}</h2>
                </div>
              </div>

              <div className="dashboard-card">
                <span>🍽️</span>

                <div>
                  <p>Consumed</p>
                  <h2>{totalConsumed}</h2>
                </div>
              </div>

              <div className="dashboard-card">
                <span>🗑️</span>

                <div>
                  <p>Wasted</p>
                  <h2>{totalWasted}</h2>
                </div>
              </div>

            </div>

            {/* DASHBOARD PANELS */}

            <div className="dashboard-sections">

              {/* EXPIRY */}

              <section className="dashboard-panel">
                <h2>Expiry Overview</h2>

                <div className="expiry-overview-list">

                  <div className="expiry-overview-item">
                    <span>🟢 Safe</span>
                    <strong>{safeCount}</strong>
                  </div>

                  <div className="expiry-overview-item">
                    <span>🟡 Watch</span>
                    <strong>{watchCount}</strong>
                  </div>

                  <div className="expiry-overview-item">
                    <span>
                      🟠 Expiring Soon
                    </span>

                    <strong>
                      {expiringSoonCount}
                    </strong>
                  </div>

                  <div className="expiry-overview-item">
                    <span>🔴 Use Soon</span>

                    <strong>
                      {useSoonCount}
                    </strong>
                  </div>

                  <div className="expiry-overview-item">
                    <span>⚫ Expired</span>

                    <strong>
                      {expiredCount}
                    </strong>
                  </div>

                </div>
              </section>

              {/* CONSUMED ANALYTICS */}

              <section className="dashboard-panel">

                <h2>🍽️ Consumed Analytics</h2>

                <div className="consumed-stats">

                  <div className="consumed-stat">
                    <span>
                      Total Consumed
                    </span>

                    <strong>
                      {totalConsumed}
                    </strong>
                  </div>

                  <div className="consumed-stat">
                    <span>
                      Consumption Records
                    </span>

                    <strong>
                      {consumptionRecords}
                    </strong>
                  </div>

                  <div className="consumed-stat">
                    <span>
                      Most Consumed Food
                    </span>

                    <strong>
                      {mostConsumedFood}
                    </strong>
                  </div>

                  <div className="consumed-stat">
                    <span>
                      Most Consumed Quantity
                    </span>

                    <strong>
                      {mostConsumedQuantity}
                    </strong>
                  </div>

                </div>

                <div className="recent-consumed">

                  <h3>
                    Recent Consumption
                  </h3>

                  {recentConsumed.length === 0 ? (
                    <p>
                      No consumed foods yet.
                    </p>
                  ) : (
                    recentConsumed.map(
                      (item) => (
                        <div
                          className="recent-consumed-item"
                          key={item._id}
                        >
                          <div>
                            <strong>
                              {item.foodName}
                            </strong>

                            <p>
                              {new Date(
                                item.actionDate
                              ).toLocaleDateString()}
                            </p>
                          </div>

                          <span>
                            Quantity:{" "}
                            {item.quantity}
                          </span>
                        </div>
                      )
                    )
                  )}

                </div>

              </section>

              {/* WASTE - PART E NEXT */}

              <section className="dashboard-panel">

                <h2>🗑️ Waste Analytics</h2>

                <div className="waste-stats">

                    <div className="waste-stat">
                    <span>Total Wasted</span>

                    <strong>
                        {totalWasted}
                    </strong>
                    </div>

                    <div className="waste-stat">
                    <span>Waste Records</span>

                    <strong>
                        {wasteRecords}
                    </strong>
                    </div>

                    <div className="waste-stat">
                    <span>Most Wasted Food</span>

                    <strong>
                        {mostWastedFood}
                    </strong>
                    </div>

                    <div className="waste-stat">
                    <span>Most Wasted Quantity</span>

                    <strong>
                        {mostWastedQuantity}
                    </strong>
                    </div>

                    <div className="waste-stat">
                    <span>Waste Rate</span>

                    <strong>
                        {wasteRate}%
                    </strong>
                    </div>

                </div>

                <div className="recent-waste">

                    <h3>
                    Recent Waste
                    </h3>

                    {recentWasted.length === 0 ? (
                    <p>
                        No wasted foods yet. 🎉
                    </p>
                    ) : (
                    recentWasted.map((item) => (
                        <div
                        className="recent-waste-item"
                        key={item._id}
                        >

                        <div>
                            <strong>
                            {item.foodName}
                            </strong>

                            <p>
                            {new Date(
                                item.actionDate
                            ).toLocaleDateString()}
                            </p>
                        </div>

                        <div className="recent-waste-info">
                            <span>
                            Quantity: {item.quantity}
                            </span>

                            <span>
                            Reason: {item.wasteReason}
                            </span>
                        </div>

                        </div>
                    ))
                    )}

                </div>

            </section>

            </div>
          </>
        )}

      </section>

      <section className="dashboard-panel waste-reason-panel">

        <h2>📊 Waste Reasons</h2>

        <div className="waste-reason-summary">

            <div>
            <span>Most Common Reason</span>

            <strong>
                {mostCommonWasteReason}
            </strong>
            </div>

            <div>
            <span>Quantity</span>

            <strong>
                {mostCommonWasteReasonQuantity}
            </strong>
            </div>

        </div>

        {totalWasted === 0 ? (
            <p>No waste data available yet.</p>
        ) : (
            <div className="waste-chart">

            <ResponsiveContainer
                width="100%"
                height={300}
            >
                <BarChart
                data={wasteReasonChartData}
                >

                <XAxis
                    dataKey="reason"
                />

                <YAxis
                    allowDecimals={false}
                />

                <Tooltip />

                <Bar
                    dataKey="quantity"
                />

                </BarChart>
            </ResponsiveContainer>

            </div>
        )}

        </section>
        <section className="dashboard-panel smart-insights-panel">

        <h2>💡 Smart Insights</h2>

        <p className="insights-description">
            Suggestions based on your pantry and food history.
        </p>

        {insights.length === 0 ? (
            <p>
            Add more pantry activity to generate insights.
            </p>
        ) : (
            <div className="insights-list">

            {insights.map((insight, index) => (
                <div
                className="insight-item"
                key={index}
                >
                {insight}
                </div>
            ))}

            </div>
        )}

        </section>
    </main>
  );
}

export default Dashboard;