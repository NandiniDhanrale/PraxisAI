"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type AnalyticsData = {
  totalQueries: number;
  avgLatency: number;
  confidenceBreakdown: { high: number; medium: number; low: number };
  citationRate: number;
  topQuestions: Array<{ query: string; count: number }>;
  queriesOverTime: Array<{ date: string; count: number }>;
  recentLogs: Array<{
    id: string;
    query: string;
    confidence: string;
    latencyMs: number;
    createdAt: string;
  }>;
};

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [plugin, setPlugin] = useState("");

  useEffect(() => {
    fetchData();
  }, [plugin]);

  const fetchData = async () => {
    const params = new URLSearchParams();
    if (plugin) params.set("plugin", plugin);
    const res = await fetch(`/api/analytics?${params}`);
    if (res.ok) {
      setData(await res.json());
    }
  };

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  const confidenceData = [
    { name: "High", value: data.confidenceBreakdown.high },
    { name: "Medium", value: data.confidenceBreakdown.medium },
    { name: "Low", value: data.confidenceBreakdown.low }
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-gray-500">Track queries, citations, and performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Filter by plugin..."
            value={plugin}
            onChange={(e) => setPlugin(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.totalQueries}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.avgLatency}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Citation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.citationRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-sm">
              <span className="text-green-600">H:{data.confidenceBreakdown.high}</span>
              <span className="text-yellow-600">M:{data.confidenceBreakdown.medium}</span>
              <span className="text-red-600">L:{data.confidenceBreakdown.low}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Queries Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {data.queriesOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.queriesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confidence Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {confidenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={confidenceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {confidenceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">No queries yet.</p>
          ) : (
            <div className="space-y-2">
              {data.topQuestions.map((q, i) => (
                <div key={i} className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">{q.query}</span>
                  <span className="text-xs text-gray-500">{q.count}x</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Queries</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No recent queries.</p>
          ) : (
            <div className="space-y-2">
              {data.recentLogs.map((log) => (
                <div key={log.id} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.query.slice(0, 80)}</span>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        log.confidence === "high" ? "bg-green-100 text-green-700" :
                        log.confidence === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {log.confidence}
                      </span>
                      <span className="text-xs text-gray-500">{log.latencyMs}ms</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
