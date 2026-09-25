import { useCallback, useMemo, useState } from "react";
import api from "../api";
import { Button, Badge, Empty, Field, Skeleton, PageHead, StatCard } from "../components/UI";
import { useAuth } from "../context";
import { useRefresh } from "../hooks";
import { CheckCircle2, CircleX, RefreshCw, Send, XCircle } from "lucide-react";
import toast from "react-hot-toast";

const tones = { pending: "orange", approved: "green", rejected: "red", cancelled: "muted" };
export default function Leave() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [f, setF] = useState({ type: "casual", fromDate: "", toDate: "", reason: "" });
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return api
      .get("/leaves")
      .then((r) => setRows(r.data))
      .catch((e) => {
        setError(e.response?.data?.message || "Unable to load leave records");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);
  useRefresh(load);
  const counts = useMemo(
    () => ({
      pending: rows.filter((x) => x.status === "pending").length,
      approved: rows.filter((x) => x.status === "approved").length,
      rejected: rows.filter((x) => x.status === "rejected").length,
      total: rows.length,
    }),
    [rows],
  );
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/leaves", f);
      toast.success("Leave request submitted");
      setF({ type: "casual", fromDate: "", toDate: "", reason: "" });
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to submit leave request");
    }
  };
  const review = async (id, decision) => {
    try {
      await api.post("/leaves/" + id + "/review", { decision });
      toast.success(decision === "approved" ? "Leave approved" : "Leave rejected");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Unable to review leave");
    }
  };
  return (
    <>
      <PageHead
        title="Leave Management"
        subtitle={
          user.role === "employee"
            ? "Request leave and track approvals."
            : "Request your own leave and review requests across your scope."
        }
      />
      <div className="grid cols-4">
        <StatCard icon="checklist" tone="blue" label="Request" value={counts.total} sub="Leave" />
        <StatCard
          icon={<RefreshCw strokeWidth={3} />}
          tone="green"
          label="Pending"
          value={counts.pending}
          sub="Leave"
        />
        <StatCard icon="checked" tone="orange" label="Approved" value={counts.approved} sub="Leave" />
        <StatCard
          icon={<CircleX fill="currentColor" stroke="#fff" strokeWidth={2.4} />}
          tone="purple"
          label="Rejected"
          value={counts.rejected}
          sub="Leave"
        />
      </div>
      <form className="gp-card leave-form" onSubmit={submit} style={{ marginTop: 20 }}>
        <div className="gp-card-head">
          <div>
            <h3>New Request</h3>
            <p>
              {user.role === "employee"
                ? "Submit dates and reason for manager review."
                : "Submit your own leave request."}
            </p>
          </div>
        </div>
        <hr className="gp-divider" />
        <div className="form-grid two">
          <Field label="Type">
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="earned">Earned</option>
              <option value="unpaid">Unpaid</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="From">
            <input type="date" required value={f.fromDate} onChange={(e) => setF({ ...f, fromDate: e.target.value })} />
          </Field>
          <Field label="To">
            <input type="date" required value={f.toDate} onChange={(e) => setF({ ...f, toDate: e.target.value })} />
          </Field>
          <Field label="Reason">
            <textarea
              required
              placeholder="Enter reason for leave request"
              value={f.reason}
              onChange={(e) => setF({ ...f, reason: e.target.value })}
            />
          </Field>
        </div>
        <div className="form-actions">
          <Button variant="primary lg">
            <Send fill="#fff" stroke="var(--gp-primary)" strokeWidth={1.4} />
            Submit Request
          </Button>
        </div>
      </form>
      <section className="gp-card">
        <div className="gp-card-head">
          <div>
            <h3 className="light">Leave Requests</h3>
            <p>View and track your leave requests.</p>
          </div>
          <Button onClick={load}>
            <RefreshCw className="spin-icon" strokeWidth={2.6} />
            Refresh
          </Button>
        </div>
        {loading ? (
          <Skeleton />
        ) : error ? (
          <Empty title="Unable to load leave" text={error} />
        ) : rows.length ? (
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Dates</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Reviewed by</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x._id}>
                    <td>
                      <div className="person">
                        <div className="avatar">{(x.employee?.name || user.name)?.[0]}</div>
                        <div>
                          <b>{x.employee?.name || user.name}</b>
                          <span>{x.employee?.email || user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {x.fromDate} to {x.toDate}
                    </td>
                    <td>{x.type}</td>
                    <td>
                      <Badge tone={tones[x.status]}>{x.status}</Badge>
                    </td>
                    <td>{x.reviewedBy?.name || "-"}</td>
                    <td>
                      {user.role !== "employee" &&
                      x.status === "pending" &&
                      String(x.employee?._id || x.employee) !== String(user.id) ? (
                        <div className="actions">
                          <button type="button" onClick={() => review(x._id, "approved")} title="Approve">
                            <CheckCircle2 />
                          </button>
                          <button type="button" onClick={() => review(x._id, "rejected")} title="Reject">
                            <XCircle />
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="leave-list-empty">0 leave requests</div>
        )}
      </section>
    </>
  );
}
