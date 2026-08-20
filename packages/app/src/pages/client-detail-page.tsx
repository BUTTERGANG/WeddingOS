import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import type { Client, Invoice, Contract } from "@/lib/types";

interface ClientDetailPageProps {
  clientId: string;
}

const tabs = [
  { id: "timeline", label: "Timeline" },
  { id: "gallery", label: "Gallery" },
  { id: "invoices", label: "Invoices" },
  { id: "contracts", label: "Contracts" },
];

export default function ClientDetailPage({ clientId }: ClientDetailPageProps) {
  const [, navigate] = useLocation();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    const id = parseInt(clientId);
    if (isNaN(id)) {
      navigate("/clients");
      return;
    }

    Promise.all([
      api<Client>(`/clients/${id}`),
      api<Invoice[]>(`/clients/${id}/invoices`).catch(() => [] as Invoice[]),
      api<Contract[]>(`/clients/${id}/contracts`).catch(() => [] as Contract[]),
    ])
      .then(([clientData, invoiceData, contractData]) => {
        setClient(clientData);
        setInvoices(invoiceData);
        setContracts(contractData);
      })
      .catch(() => {
        toast.error("Failed to load client");
        navigate("/clients");
      })
      .finally(() => setLoading(false));
  }, [clientId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Client not found</p>
        <Link href="/clients" className="text-brand-600 hover:underline text-sm mt-2 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  const paidInvoices = invoices.filter((i) => i.status === "paid").length;
  const totalInvoiceAmount = invoices.reduce((sum, i) => sum + i.amountCents, 0);
  const signedContracts = contracts.filter((c) => c.status === "signed").length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/clients"
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Clients
              </Link>
              <span className="text-gray-300">/</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            {client.partnerName && (
              <p className="text-gray-500">
                &amp; {client.partnerName}
              </p>
            )}
          </div>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${
              client.status === "active"
                ? "bg-green-100 text-green-700"
                : client.status === "lead"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {client.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {client.weddingDate && (
            <div>
              <p className="text-gray-400">Wedding Date</p>
              <p className="font-medium text-gray-900">
                {new Date(client.weddingDate).toLocaleDateString()}
              </p>
            </div>
          )}
          {client.venue && (
            <div>
              <p className="text-gray-400">Venue</p>
              <p className="font-medium text-gray-900">{client.venue}</p>
            </div>
          )}
          {client.email && (
            <div>
              <p className="text-gray-400">Email</p>
              <p className="font-medium text-gray-900">{client.email}</p>
            </div>
          )}
          {client.phone && (
            <div>
              <p className="text-gray-400">Phone</p>
              <p className="font-medium text-gray-900">{client.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          <p className="text-sm text-gray-500">
            {paidInvoices === invoices.length && invoices.length > 0
              ? "All Paid"
              : `${paidInvoices}/${invoices.length} Paid`}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            ${(totalInvoiceAmount / 100).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Total Invoiced</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {signedContracts}/{contracts.length}
          </p>
          <p className="text-sm text-gray-500">Contracts Signed</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "timeline" && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Manage this client's wedding timeline</p>
            <Link
              href={`/clients/${client.id}/timeline`}
              className="inline-block px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600"
            >
              View Timeline
            </Link>
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Manage galleries and photos</p>
            <Link
              href={`/clients/${client.id}/gallery`}
              className="inline-block px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600"
            >
              View Gallery
            </Link>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">
              {invoices.length > 0
                ? `${invoices.length} invoice(s) created`
                : "No invoices yet"}
            </p>
            <Link
              href={`/clients/${client.id}/invoices`}
              className="inline-block px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600"
            >
              View Invoices
            </Link>
          </div>
        )}

        {activeTab === "contracts" && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">
              {contracts.length > 0
                ? `${contracts.length} contract(s)`
                : "No contracts yet"}
            </p>
            <Link
              href={`/clients/${client.id}/contracts`}
              className="inline-block px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600"
            >
              View Contracts
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}