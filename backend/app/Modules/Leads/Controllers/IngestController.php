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
            'mobile'        => 'required|string|max:20',
            'email'         => 'nullable|email|max:255',
            'source'        => 'nullable|string|max:100',
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
        $data['source']        = $data['source'] ?? 'api';

        // business_id injected by ApiKeyMiddleware — not from Auth user
        $data['business_id']   = $request->input('_api_business_id');

        $lead = $this->service->create($data);

        return response()->json($lead, 201);
    }
}