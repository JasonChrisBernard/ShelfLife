import { useEffect, useState } from "react";
import { getFoodHistory } from "../services/historyService";

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getFoodHistory();

        setHistory(data);
      } catch (error) {
        console.error(error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  // All consumed records
  const consumedRecords = history.filter(
    (item) => item.action === "CONSUMED"
  );

  // All wasted records
  const wastedRecords = history.filter(
    (item) => item.action === "WASTED"
  );

  // Total quantity consumed
  const totalConsumed = consumedRecords.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Total quantity wasted
  const totalWasted = wastedRecords.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <main className="app">
      <section className="history-page">

        <div className="history-header">
          <div>
            <h1>Food History</h1>

            <p>
              See what food you consumed and wasted.
            </p>
          </div>
        </div>

        {loading && (
          <p>Loading history...</p>
        )}

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            {/* SUMMARY CARDS */}

            <div className="history-summary">

              <div className="history-summary-card">
                <div className="history-summary-icon">
                  🍽️
                </div>

                <div>
                  <p>Consumed</p>

                  <h2>
                    {totalConsumed}
                  </h2>
                </div>
              </div>

              <div className="history-summary-card">
                <div className="history-summary-icon">
                  🗑️
                </div>

                <div>
                  <p>Wasted</p>

                  <h2>
                    {totalWasted}
                  </h2>
                </div>
              </div>

            </div>

            {/* EMPTY HISTORY */}

            {history.length === 0 && (
              <div className="history-empty">
                <p>
                  No food history yet.
                </p>
              </div>
            )}

            {/* HISTORY LIST */}

            {history.length > 0 && (
              <div className="history-list">

                {history.map((item) => (
                  <div
                    className="history-item"
                    key={item._id}
                  >

                    <div className="history-item-main">

                      <div className="history-action-icon">
                        {item.action === "CONSUMED"
                          ? "🍽️"
                          : "🗑️"}
                      </div>

                      <div className="history-details">

                        <h3>
                          {item.foodName}
                        </h3>

                        <p>
                          Quantity:{" "}
                          <strong>
                            {item.quantity}
                          </strong>
                        </p>

                        <p>
                          Category:{" "}
                          {item.category}
                        </p>

                        {item.action === "WASTED" &&
                          item.wasteReason && (
                            <p>
                              Reason:{" "}
                              <strong>
                                {item.wasteReason}
                              </strong>
                            </p>
                          )}

                      </div>

                    </div>

                    <div className="history-item-side">

                      <span
                        className={
                          item.action === "CONSUMED"
                            ? "history-status consumed-status"
                            : "history-status wasted-status"
                        }
                      >
                        {item.action === "CONSUMED"
                          ? "Consumed"
                          : "Wasted"}
                      </span>

                      <span className="history-date">
                        {new Date(
                          item.actionDate
                        ).toLocaleDateString()}
                      </span>

                    </div>

                  </div>
                ))}

              </div>
            )}
          </>
        )}

      </section>
    </main>
  );
}

export default History;