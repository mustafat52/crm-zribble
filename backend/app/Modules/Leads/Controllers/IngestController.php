<?php

namespace App\Modules\Leads\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Leads\Services\LeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IngestController extends Controller
{
    public function __construct(
        private readonly LeadService $service
    ) {}

    /**
     * POST /api/v1/ingest/lead
     * Public endpoint — auth via X-API-Key header (handled by ApiKeyMiddleware).
     * Fires full LeadCreated event pipeline identical to manual CRM entry.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            // T84 FIX: Add phone format validation to the ingest API.
            // Previously accepted any string including "abc" or "N/A",
            // causing WhatsApp sends to fail silently and breaking duplicate detection.
            'mobile'        => ['required', 'string', 'max:20', 'regex:/^[\+]?[0-9\s\-\(\)]{7,20}$/'],
            'email'         => 'nullable|email|max:255',
            // T85 FIX: Restrict source to allowed values in ingest too.
            // External webhooks often send "Website" (capital W) or variations that
            // become separate rows in the Sources report instead of grouping with "website".
            'source'        => 'nullable|string|in:manual,website,whatsapp,instagram,facebook,google,referral,api,qr,other',
            'campaign'      => 'nullable|string|max:255',
            'city'          => 'nullable|string|max:100',
            'interested_in' => 'nullable|string',
            'lead_value'    => 'nullable|numeric|min:0',
            'tags'          => 'nullable|array',
            'tags.*'        => 'string|max:50',
            'metadata'      => 'nullable|array',
            'custom_fields' => 'nullable|array',
        ]);

        // Source defaults to 'api' when coming through ingest
        $data['source']      = strtolower(trim($data['source'] ?? 'api'));

        // business_id injected by ApiKeyMiddleware — not from Auth user
        $data['business_id'] = $request->input('_api_business_id');

        $lead = $this->service->create($data);

        return response()->json($lead, 201);
    }
}
