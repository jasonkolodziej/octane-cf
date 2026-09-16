/** @jsxImportSource react */
import { AppSidebar } from './app-sidebar';
import { ChartAreaInteractive } from './chart-area-interactive';
import { DataTable } from './data-table';
import { SectionCards } from './section-cards';
import { SiteHeader } from './site-header';
import { SidebarInset, SidebarProvider } from './ui/sidebar';

const tableData = [
  { id: 1, header: 'Pulse CRM', type: 'Website', status: 'Done', target: '18k', limit: '24k', reviewer: 'Eddie Lake' },
  { id: 2, header: 'Mobile App', type: 'Mobile', status: 'In Progress', target: '12k', limit: '18k', reviewer: 'Jamik Tashpulatov' },
  { id: 3, header: 'Design System', type: 'Design', status: 'Done', target: '24k', limit: '30k', reviewer: 'Eddie Lake' },
  { id: 4, header: 'Marketing Campaign', type: 'Marketing', status: 'In Progress', target: '16k', limit: '20k', reviewer: 'Jamik Tashpulatov' },
  { id: 5, header: 'AI Research', type: 'Research', status: 'Done', target: '31k', limit: '36k', reviewer: 'Eddie Lake' },
  { id: 6, header: 'Customer Portal', type: 'Portal', status: 'In Progress', target: '14k', limit: '22k', reviewer: 'Jamik Tashpulatov' },
];

export function DashboardPanel() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <SectionCards />
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <ChartAreaInteractive />
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Performance</h2>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    Live
                  </span>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Open tasks', value: '12', change: '+4.5%' },
                    { label: 'Conversion', value: '7.8%', change: '+1.2%' },
                    { label: 'Avg. response', value: '2.4h', change: '-0.6h' },
                    { label: 'Satisfaction', value: '96%', change: '+2.1%' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm text-muted-foreground">{item.label}</div>
                        <div className="mt-1 text-2xl font-semibold tracking-tight">{item.value}</div>
                      </div>
                      <span
                        className={[
                          'rounded-full px-2 py-1 text-xs font-medium',
                          item.change.startsWith('-') ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600',
                        ].join(' ')}
                      >
                        {item.change}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DataTable data={tableData} />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
