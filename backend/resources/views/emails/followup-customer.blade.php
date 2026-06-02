<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>We will be in touch</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
        .header { background: #7c3aed; padding: 28px 32px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; }
        .header p { color: #ddd6fe; margin: 6px 0 0; font-size: 14px; }
        .body { padding: 28px 32px; }
        .greeting { font-size: 16px; color: #111827; margin-bottom: 16px; line-height: 1.6; }
        .note-box { background: #f3f4f6; border-left: 3px solid #7c3aed; border-radius: 0 6px 6px 0; padding: 14px 16px; margin-bottom: 20px; }
        .note-box p { margin: 0; font-size: 14px; color: #374151; line-height: 1.6; font-style: italic; }
        .footer { padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>{{ $businessName }}</h1>
            <p>A message for you</p>
        </div>
        <div class="body">
            <p class="greeting">Hi {{ $customerName }},</p>

            <p class="greeting">
                Thank you for your interest in <strong>{{ $businessName }}</strong>.
                We wanted to let you know that one of our team members will be following
                up with you shortly.
            </p>

            @if($note)
            <div class="note-box">
                <p>{{ $note }}</p>
            </div>
            @endif

            <p class="greeting">
                We look forward to speaking with you soon.
            </p>

            <p class="greeting" style="margin-bottom:0;">
                Warm regards,<br>
                <strong>The {{ $businessName }} Team</strong>
            </p>
        </div>
        <div class="footer">
            <p>
                You received this email because you enquired with {{ $businessName }}.<br>
                If you did not make this enquiry, please disregard this email.
            </p>
        </div>
    </div>
</body>
</html>