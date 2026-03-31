import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertCircle, BarChart3, Activity, TrendingUp, Download, Trash2 } from 'lucide-react';
import { errorLogger } from '@/lib/errorLogger';
import { perfMonitor } from '@/lib/performanceMonitor';
import { analytics } from '@/lib/analyticsTracker';

export default function MonitoringDashboard() {
  const [errorStats, setErrorStats] = useState({});
  const [perfStats, setPerfStats] = useState({});
  const [analyticsData, setAnalyticsData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setErrorStats(errorLogger.getStats());
      setPerfStats(perfMonitor.getAllMetrics());
      setAnalyticsData(analytics.getAnalytics());
      setRefreshKey(k => k + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    const report = {
      errors: errorLogger.getErrors(),
      performance: perfMonitor.export(),
      analytics: analytics.getAnalytics(),
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-report-${Date.now()}.json`;
    a.click();
  };

  const handleClear = () => {
    if (confirm('Clear all monitoring data?')) {
      errorLogger.clear();
      perfMonitor.clear();
      analytics.clear();
      setRefreshKey(k => k + 1);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" key={refreshKey}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitoring Dashboard</h1>
            <p className="text-gray-600 mt-1">Error tracking, performance metrics, analytics</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Data
            </Button>
          </div>
        </div>

        <Tabs defaultValue="errors" className="space-y-4">
          <TabsList>
            <TabsTrigger value="errors" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Errors
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="errors" className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{errorStats.total || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-600">Critical</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{errorStats.critical || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-600">Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{errorStats.errors || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-600">Warnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{errorStats.warnings || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {errorLogger.getErrors().slice(-20).reverse().map(error => (
                    <div key={error.id} className={`p-3 rounded border-l-4 ${
                      error.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      error.severity === 'error' ? 'border-orange-500 bg-orange-50' :
                      error.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}>
                      <div className="font-mono text-sm font-bold">{error.type}</div>
                      <div className="text-sm text-gray-700">{error.message}</div>
                      <div className="text-xs text-gray-500 mt-1">{error.timestamp}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(perfStats).slice(0, 3).map(([name, stats]) => (
                <Card key={name}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div><span className="text-gray-600">Avg:</span> <span className="font-bold">{stats?.avg?.toFixed(2)}ms</span></div>
                    <div><span className="text-gray-600">P95:</span> <span className="font-bold">{stats?.p95?.toFixed(2)}ms</span></div>
                    <div><span className="text-gray-600">Count:</span> <span className="font-bold">{stats?.count}</span></div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Web Vitals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(perfMonitor.getWebVitals()).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-sm text-gray-600">{key.toUpperCase()}</div>
                      <div className="text-lg font-bold">
                        {value ? `${value.toFixed(0)}ms` : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {perfMonitor.getMemoryUsage() ? (
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">
                      {perfMonitor.getMemoryUsage().usage}
                    </div>
                    <div className="text-sm text-gray-600">
                      {(perfMonitor.getMemoryUsage().usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / 
                      {(perfMonitor.getMemoryUsage().jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">Memory API not available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {analyticsData && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Session Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Sessions</div>
                      <div className="text-2xl font-bold">{analyticsData.sessions?.totalSessions}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Active Sessions</div>
                      <div className="text-2xl font-bold">{analyticsData.sessions?.activeSessions}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Avg Duration</div>
                      <div className="text-2xl font-bold">{analyticsData.sessions?.avgSessionDuration}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Events</div>
                      <div className="text-2xl font-bold">{analyticsData.sessions?.totalEvents}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Feature Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analyticsData.features?.map(feature => (
                        <div key={feature.name} className="flex items-center justify-between">
                          <div className="font-medium">{feature.name}</div>
                          <div className="text-sm font-bold text-green-600">{feature.usageRate}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}