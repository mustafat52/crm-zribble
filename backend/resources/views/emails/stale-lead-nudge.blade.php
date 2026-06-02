<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Follow Up Reminder</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
        .header { background: #7c3aed; padding: 28px 32px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; }
        .header p { color: #ddd6fe; margin: 6px 0 0; font-size: 14px; }
        .body { padding: 28px 32px; }
        .alert-box { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 14px 16px; margin-bottom: 22px; }
        .alert-box p { margin: 0; font-size: 14px; color: #92400e; line-height: 1.5; }
        .lead-card { background: #f3f4f6; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; }
        .field { margin-bottom: 10px; }
        .field:last-child { margin-bottom: 0; }
        .label { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
        .value { font-size: 15px; color: #111827; }
        .cta { display: inline-block; background: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; }
        .footer { padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>⏰ Lead Needs Attention</h1>
            <p>{{ $businessName }} · LeadOS CRM</p>
        </div>
        <div class="body">
            <div class="alert-box">
                <p>
                    <strong>{{ $leadName }}</strong> has had no activity for
                    <strong>{{ $daysSinceActivity }} {{ $daysSinceActivity === 1 ? 'day' : 'days' }}</strong>.
                    Reach out before they go cold.
                </p>
            </div>

            <div class="lead-card">
                <div class="field">
                    <div class="label">Lead Name</div>
                    <div class="value">{{ $leadName }}</div>
                </div>
                <div class="field">
                    <div class="label">Mobile</div>
                    <div class="value">{{ $leadMobile }}</div>
                </div>
                <div class="field">
                    <div class="label">Source</div>
                    <div class="value">{{ ucfirst($leadSource ?: 'Unknown') }}</div>
                </div>
            </div>

            <a href="{{ $appUrl }}/leads/{{ $leadId }}" class="cta">View Lead &rarr;</a>
        </div>
        <div class="footer">
            <p>
                This is an automated reminder from {{ $businessName }}'s CRM.<br>
                You are receiving this because you are assigned to this lead.
            </p>
        </div>
    </div>
</body>
</html>