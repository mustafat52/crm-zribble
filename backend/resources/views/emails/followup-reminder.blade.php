<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Follow-up Due</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f4f4f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f4; padding: 32px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                       style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

                    {{-- Header --}}
                    <tr>
                        <td style="background: #7c3aed; padding: 28px 32px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
                                LeadOS
                            </h1>
                            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">
                                {{ $businessName }}
                            </p>
                        </td>
                    </tr>

                    {{-- Alert bar --}}
                    <tr>
                        <td style="background: #fef3c7; border-bottom: 1px solid #fde68a; padding: 14px 32px;">
                            <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">
                                ⏰ A follow-up is due for <strong>{{ $leadName }}</strong>
                            </p>
                        </td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td style="padding: 28px 32px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 15px; line-height: 1.5;">
                                This is a reminder that a follow-up is scheduled with the lead below.
                            </p>

                            {{-- Lead card --}}
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                                   style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 20px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 6px 0;">
                                                    <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Lead Name</span><br>
                                                    <span style="font-size: 15px; font-weight: 600; color: #111827;">{{ $leadName }}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 6px 0; border-top: 1px solid #e5e7eb;">
                                                    <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Mobile</span><br>
                                                    <span style="font-size: 14px; color: #374151;">{{ $leadMobile }}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 6px 0; border-top: 1px solid #e5e7eb;">
                                                    <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Due At</span><br>
                                                    <span style="font-size: 14px; color: #7c3aed; font-weight: 600;">{{ $dueAt }}</span>
                                                </td>
                                            </tr>
                                            @if($note)
                                            <tr>
                                                <td style="padding: 6px 0; border-top: 1px solid #e5e7eb;">
                                                    <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Note</span><br>
                                                    <span style="font-size: 14px; color: #374151; font-style: italic;">{{ $note }}</span>
                                                </td>
                                            </tr>
                                            @endif
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            @if($appUrl && $leadId)
                            {{-- CTA button --}}
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="border-radius: 6px; background: #7c3aed;">
                                        <a href="{{ $appUrl }}/leads/{{ $leadId }}"
                                           style="display: inline-block; padding: 12px 24px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">
                                            View Lead →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            @endif
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 32px;">
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                LeadOS · Follow-up reminder sent automatically · {{ $businessName }}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
