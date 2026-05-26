<?php

namespace App\Modules\Leads\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Leads\Services\LeadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Modules\Leads\Models\LeadFollowup;

class LeadController extends Controller
{
    public function __construct(
        private readonly LeadService $service
    ) {}

    /**
     * GET /api/v1/leads
     * List leads with optional filters.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search'      => 'nullable|string|max:100',
            'status_id'   => 'nullable|uuid',
            'source'      => 'nullable|string|max:100',
            'assigned_to' => 'nullable|uuid',
            'date_from'   => 'nullable|date',
            'date_to'     => 'nullable|date',
        ]);

        return response()->json($this->service->list($filters));
    }

    /**
     * POST /api/v1/leads
     * Create a lead manually from the CRM.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'mobile'         => 'required|string|max:20',
            'email'          => 'nullable|email|max:255',
            'branch_id'      => 'nullable|uuid',
            'assigned_to'    => 'nullable|uuid',
            'lead_status_id' => 'nullable|uuid',
            'source'         => 'nullable|string|max:100',
            'campaign'       => 'nullable|string|max:255',
            'city'           => 'nullable|string|max:100',
            'interested_in'  => 'nullable|string',
            'lead_value'     => 'nullable|numeric|min:0',
            'tags'           => 'nullable|array',
            'tags.*'         => 'string|max:50',
            'metadata'       => 'nullable|array',
            'custom_fields'  => 'nullable|array',
        ]);

        $lead = $this->service->create($data);

        return response()->json($lead, 201);
    }

    /**
     * GET /api/v1/leads/{id}
     * Get a single lead with full activity timeline.
     */
    public function show(string $id): JsonResponse
    {
        return response()->json($this->service->find($id));
    }

    /**
     * PUT /api/v1/leads/{id}
     * Update lead fields.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'nullable|string|max:255',
            'email'         => 'nullable|email|max:255',
            'city'          => 'nullable|string|max:100',
            'interested_in' => 'nullable|string',
            'lead_value'    => 'nullable|numeric|min:0',
            'tags'          => 'nullable|array',
            'tags.*'        => 'string|max:50',
            'custom_fields' => 'nullable|array',
            'lost_reason'   => 'nullable|string|max:255',
        ]);

        return response()->json($this->service->update($id, $data));
    }

    /**
     * PUT /api/v1/leads/{id}/status
     * Change a lead's status.
     */
    public function changeStatus(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'status_id' => 'required|uuid',
        ]);

        return response()->json($this->service->changeStatus($id, $data['status_id']));
    }

    /**
     * PUT /api/v1/leads/{id}/assign
     * Assign or unassign a lead.
     */
    public function assign(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'nullable|uuid',
        ]);

        return response()->json($this->service->assign($id, $data['user_id'] ?? null));
    }

    /**
     * POST /api/v1/leads/{id}/notes
     * Add a note or call log to a lead.
     */
    public function addNote(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'type'     => 'nullable|in:note,call_log',
            'note'     => 'required|string',
            'metadata' => 'nullable|array',
        ]);

        return response()->json($this->service->addNote($id, $data), 201);
    }

    /**
     * POST /api/v1/leads/{id}/followup
     */
    public function setFollowUp(Request $request, string $id): JsonResponse
    {
        $data = $request->validate([
            'followup_at' => 'required|date|after:now',
            'note'        => 'nullable|string|max:500',
        ]);

        return response()->json($this->service->setFollowUp($id, $data['followup_at'], $data['note'] ?? null));
    }

    /**
     * GET /api/v1/leads/{id}/followups
     * List all follow-ups for a lead.
     */
    public function listFollowups(string $id): JsonResponse
    {
        return response()->json($this->service->listFollowups($id));
    }

    /**
     * POST /api/v1/leads/{id}/followups/{followupId}/done
     * Mark a follow-up as done.
     */
    public function markFollowupDone(string $id, string $followupId): JsonResponse
    {
        return response()->json($this->service->markFollowupDone($id, $followupId));
    }

    /**
     * GET /api/v1/leads/followups/overdue
     * Returns all overdue pending follow-ups across all leads for this business.
     */
    public function overdueFollowups(): JsonResponse
    {
        return response()->json($this->service->overdueFollowups());
    }
}