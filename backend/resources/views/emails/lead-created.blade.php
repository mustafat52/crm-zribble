<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .card { background: #ffffff; border-radius: 8px; padding: 30px; max-width: 500px; margin: 0 auto; }
        .header { font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 20px; }
        .row { margin-bottom: 12px; }
        .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-size: 15px; color: #111827; margin-top: 2px; }
        .badge { display: inline-block; background: #f0fdf4; color: #16a34a; padding: 3px 10px; border-radius: 20px; font-size: 12px; }
        .footer { margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">🔔 New Lead Received</div>

        <div class="row">
            <div class="label">Business</div>
            <div class="value">{{ $businessName }}</div>
        </div>

        <div class="row">
            <div class="label">Lead Name</div>
            <div class="value">{{ $leadName }}</div>
        </div>

        <div class="row">
            <div class="label">Mobile</div>
            <div class="value">{{ $leadMobile }}</div>
        </div>

        <div class="row">
            <div class="label">Source</div>
            <div class="value"><span class="badge">{{ $leadSource }}</span></div>
        </div>

        @if($assignedTo)
        <div class="row">
            <div class="label">Assigned To</div>
            <div class="value">{{ $assignedTo }}</div>
        </div>
        @endif

        <div class="footer">CRM Platform · Sent automatically on lead creation</div>
    </div>
</body>
</html>