<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .card { background: #ffffff; border-radius: 8px; padding: 30px; max-width: 560px; margin: 0 auto; }
        .header { font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 4px; }
        .subheader { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
        .section-title { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; margin-bottom: 10px; margin-top: 24px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
        .stat-box { background: #f9fafb; border-radius: 6px; padding: 12px 16px; border: 1px solid #e5e7eb; }
        .stat-val { font-size: 22px; font-weight: 700; color: #111827; }
        .stat-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
        .stat-box.accent { background: #7c3aed; border-color: #7c3aed; }
        .stat-box.accent .stat-val { color: #fff; }
        .stat-box.accent .stat-label { color: #e9d5ff; }
        .stat-box.warning { background: #fff5f5; border-color: #fecaca; }
        .stat-box.warning .stat-val { color: #dc2626; }
        .stat-box.warning .stat-label { color: #ef4444; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
        .row:last-child { border-bottom: none; }
        .row-label { color: #374151; text-transform: capitalize; }
        .row-val { font-weight: 700; color: #111827; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .footer { margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">📊 Daily Report</div>
        <div class="subheader">{{ $businessName }} · {{ $date }} · Good morning, {{ $ownerName }}!</div>

        <div class="section-title">Today at a Glance</div>
        <div class="stats-grid">
            <div class="stat-box accent">
                <div class="stat-val">{{ $totalToday }}</div>
                <div class="stat-label">New Leads Today</div>
            </div>
            <div class="stat-box">
                <div class="stat-val">{{ $totalWeek }}</div>
                <div class="stat-label">This Week</div>
            </div>
            <div class="stat-box">
                <div class="stat-val">{{ $totalMonth }}</div>
                <div class="stat-label">This Month</div>
            </div>
            <div class="stat-box {{ $overdueFollowups > 0 ? 'warning' : '' }}">
                <div class="stat-val">{{ $overdueFollowups }}</div>
                <div class="stat-label">Overdue Follow-ups</div>
            </div>
        </div>

        <div class="section-title">Conversion</div>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-val">{{ $converted }}</div>
                <div class="stat-label">Total Converted</div>
            </div>
            <div class="stat-box">
                <div class="stat-val">{{ $conversionRate }}%</div>
                <div class="stat-label">Conversion Rate</div>
            </div>
        </div>

        @if(count($bySource) > 0)
        <div class="section-title">Leads by Source</div>
        @foreach($bySource as $src)
        <div class="row">
            <span class="row-label">{{ $src['source'] }}</span>
            <span class="row-val">{{ $src['total'] }}</span>
        </div>
        @endforeach
        @endif



        @if(count($byStatus) > 0)
        <div class="section-title">Leads by Status</div>
        @foreach($byStatus as $st)
        <div class="row">
            <span class="row-label">{{ $st['status'] }}</span>
            <span class="row-val">{{ $st['total'] }}</span>
        </div>
        @endforeach
        @endif

        @if(count($byBranch) > 0)
        <div class="section-title">Leads by Branch</div>
        @foreach($byBranch as $br)
        <div class="row">
            <span class="row-label">{{ $br['branch'] }}</span>
            <span class="row-val">{{ $br['total'] }}</span>
        </div>
        @endforeach
        @endif

        <div class="footer">
            LeadOS · Daily digest sent at 8:00 AM · {{ $businessName }}<br>
            Total leads all time: {{ $totalAll }}
        </div>
    </div>
</body>
</html>