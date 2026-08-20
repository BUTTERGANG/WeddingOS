import { useState, useEffect, type FormEvent } from "react";
import { Link } from "wouter";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { Client } from "@/lib/types";
import { Card, Badge, EmptyState, Skeleton, Button, Input, Select } from "@/components/ui";
import { X, Plus, Search, Users } from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPartner, setFormPartner] = useState("");
  const [formWeddingDate, setFormWeddingDate] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formStatus, setFormStatus] = useState("lead");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchClients = () => {
    setLoading(true);
    api<Client[]>("/clients")
      .then(setClients)
      .catch(() => toast.error("Failed to load clients"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api<Client>("/clients", {
        method: "POST",
        body: {
          name: formName,
          email: formEmail,
          phone: formPhone || null,
          partnerName: formPartner || null,
          weddingDate: formWeddingDate || null,
          venue: formVenue || null,
          status: formStatus,
          notes: formNotes || null,
        },
      });
      toast.success("Client added");
      setShowAdd(false);
      resetForm();
      fetchClients();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add client");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormPartner("");
    setFormWeddingDate("");
    setFormVenue("");
    setFormStatus("lead");
    setFormNotes("");
  };

  const statusVariant = (status: string) => {
    if (status === "active") return "success";
    if (status === "lead") return "warning";
    return "default";
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Client list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="w-48 h-5" />
                  <Skeleton className="w-32 h-4" />
                </div>
                <Skeleton className="w-20 h-6 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No matches" : "No clients yet"}
          description={search ? "No clients match your search" : "Add your first client to get started"}
          action={
            !search ? (
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Client
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {client.name}
                    {client.partnerName && (
                      <span className="text-gray-400 font-normal">
                        {" "}& {client.partnerName}
                      </span>
                    )}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    {client.weddingDate && (
                      <span>{new Date(client.weddingDate).toLocaleDateString()}</span>
                    )}
                    {client.venue && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="truncate">{client.venue}</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant={statusVariant(client.status)}>
                  {client.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add client modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Client</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input required value={formName} onChange={(e) => setFormName(e.target.value)} label="Name *" />
                </div>
                <div>
                  <Input type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)} label="Email *" />
                </div>
                <div>
                  <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} label="Phone" />
                </div>
                <div>
                  <Input value={formPartner} onChange={(e) => setFormPartner(e.target.value)} label="Partner Name" />
                </div>
                <div>
                  <Input type="date" value={formWeddingDate} onChange={(e) => setFormWeddingDate(e.target.value)} label="Wedding Date" />
                </div>
                <div className="col-span-2">
                  <Input value={formVenue} onChange={(e) => setFormVenue(e.target.value)} label="Venue" />
                </div>
                <div>
                  <Select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} label="Status">
                    <option value="lead">Lead</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={3} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={saving} className="flex-1">Add Client</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}