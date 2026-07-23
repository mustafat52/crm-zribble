<div style="font-family:'DM Sans',Arial,sans-serif;max-width:440px;margin:0 auto;padding:32px;color:#09090b">
    <div style="font-weight:700;font-size:24px;letter-spacing:.04em">ZRIBBLE<span style="color:#ec4899">.</span></div>
    <h1 style="font-size:18px;margin:24px 0 8px">Password reset code</h1>
    <p style="color:#52525b;font-size:14px;margin:0 0 20px">
        Enter this code to reset your password. It expires in {{ $expiresMinutes }} minutes.
    </p>
    <div style="font-family:'DM Mono',monospace;font-size:32px;font-weight:500;letter-spacing:10px;
                background:#f4f4f5;border-radius:12px;padding:18px 0;text-align:center;color:#7c3aed">
        {{ $otp }}
    </div>
    <p style="color:#a1a1aa;font-size:12px;margin-top:24px">
        If you didn't request this, you can safely ignore this email.
    </p>
</div>