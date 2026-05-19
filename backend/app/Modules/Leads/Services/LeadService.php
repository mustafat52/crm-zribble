<?php

namespace App\Modules\Leads\Services;

use App\Models\User;
use App\Modules\Leads\Events\LeadAssigned;
use App\Modules\Leads\Events\LeadCreated;
use App\Modules\Leads\Events\StatusChanged;
use App\Modules\Leads\Models\Lead;
use App\Modules\Leads\Models\LeadActivity;
use App\Modules\Leads\Models\LeadStatus;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class LeadService
{
    /**
     * List leads with filters and pagination.
     * Applies BusinessScope + BranchScope automatically via the Lead model.
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $query = Lead::query()
            ->with(['status', 'assignedTo'])
            ->orderByDesc('created_at');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('mobile', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        if (!empty($filters['status_id'])) {
            $query->where('lead_status_id', $filters['status_id']);
        }

        if (!empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }

        if (!empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        return $query->paginate(25);
    }

    /**
     * Create a lead — works for both manual CRM entry and public ingest API.
     * When called from IngestController, $data['business_id'] is pre-set by ApiKeyMiddleware.
     * When called from LeadController, business_id comes from the authenticated user.
     * Checks for duplicates by mobile within the same business.
     * Fires LeadCreated event after creation.
     */
    public function create(array $data): Lead
    {
        $user       = Auth::user();
        $businessId = $data['business_id'] ?? $user->business_id;
        $branchId   = $data['branch_id']   ?? $user?->branch_id;

        // Duplicate check — same mobile within same business
        $existing = Lead::withoutGlobalScope(\App\Models\Scopes\BranchScope::class)
            ->where('mobile', $data['mobile'])
            ->first();

        if ($existing) {
            // Per Q7: same business = update existing lead, not create new
            $existing->update([
                'name'          => $data['name'],
                'email'         => $data['email'] ?? $existing->email,
                'source'        => $data['source'] ?? $existing->source,
                'campaign'      => $data['campaign'] ?? $existing->campaign,
                'city'          => $data['city'] ?? $existing->city,
                'interested_in' => $data['interested_in'] ?? $existing->interested_in,
                'lead_value'    => $data['lead_value'] ?? $existing->lead_value,
                'tags'          => $data['tags'] ?? $existing->tags,
                'metadata'      => $data['metadata'] ?? $existing->metadata,
                'custom_fields' => $data['custom_fields'] ?? $existing->custom_fields,
            ]);

            $this->logActivity($existing, 'duplicate_merged', 'Lead re-submitted — existing record updated.');

            return $existing->fresh(['status', 'assignedTo']);
        }

        // Get the default status for this business (lowest sort_order)
        $defaultStatus = LeadStatus::orderBy('sort_order')->first();

        $lead = Lead::create([
            'business_id'    => $businessId,
            'branch_id'      => $branchId,
            'assigned_to'    => $data['assigned_to'] ?? null,
            'lead_status_id' => $data['lead_status_id'] ?? $defaultStatus?->id,
            'name'           => $data['name'],
            'mobile'         => $data['mobile'],
            'email'          => $data['email'] ?? null,
            'source'         => $data['source'] ?? 'manual',
            'campaign'       => $data['campaign'] ?? null,
            'city'           => $data['city'] ?? null,
            'interested_in'  => $data['interested_in'] ?? null,
            'lead_value'     => $data['lead_value'] ?? null,
            'tags'           => $data['tags'] ?? [],
            'metadata'       => $data['metadata'] ?? [],
            'custom_fields'  => $data['custom_fields'] ?? [],
        ]);

        $this->logActivity($lead, 'created', 'Lead created manually from CRM.');

        // Fire the event — Week 3 listeners will send WhatsApp + email
        event(new LeadCreated($lead));

        return $lead->load(['status', 'assignedTo']);
    }

    /**
     * Get a single lead with its full activity timeline.
     */
    public function find(string $id): Lead
    {
        return Lead::with(['status', 'assignedTo', 'activities.user'])
            ->findOrFail($id);
    }

    /**
     * Update lead fields.
     * Does not fire an event — field updates are not notification triggers.
     */
    public function update(string $id, array $data): Lead
    {
        $lead = Lead::findOrFail($id);

        $lead->update(array_filter([
            'name'          => $data['name'] ?? null,
            'email'         => $data['email'] ?? null,
            'city'          => $data['city'] ?? null,
            'interested_in' => $data['interested_in'] ?? null,
            'lead_value'    => $data['lead_value'] ?? null,
            'tags'          => $data['tags'] ?? null,
            'custom_fields' => $data['custom_fields'] ?? null,
            'lost_reason'   => $data['lost_reason'] ?? null,
        ], fn($v) => $v !== null));

        $this->logActivity($lead, 'updated', 'Lead details updated.');

        return $lead->fresh(['status', 'assignedTo']);
    }

    /**
     * Change a lead's status.
     * Fires StatusChanged event — Week 3 will send notifications on certain status changes.
     */
    public function changeStatus(string $id, string $statusId): Lead
    {
        $lead        = Lead::findOrFail($id);
        $oldStatusId = $lead->lead_status_id;
        $newStatus   = LeadStatus::findOrFail($statusId);

        $lead->update([
            'lead_status_id' => $statusId,
            'converted_at'   => $newStatus->is_converted ? now() : $lead->converted_at,
        ]);

        $this->logActivity($lead, 'status_changed', "Status changed to: {$newStatus->name}");

        event(new StatusChanged($lead, $oldStatusId, $statusId));

        return $lead->fresh(['status', 'assignedTo']);
    }

    /**
     * Assign a lead to a team member.
     * Fires LeadAssigned event — Week 3 will notify the assignee on WhatsApp.
     */
    public function assign(string $id, ?string $userId): Lead
    {
        $lead = Lead::findOrFail($id);

        if ($userId) {
            $user = User::findOrFail($userId);
        }

        $lead->update([
            'assigned_to'       => $userId,
            'last_contacted_at' => now(),
        ]);

        $this->logActivity(
            $lead,
            'assigned',
            $userId ? "Lead assigned to: {$user->name}" : 'Lead unassigned.'
        );

        event(new LeadAssigned($lead, $userId));

        return $lead->fresh(['status', 'assignedTo']);
    }

    /**
     * Add a note or call log to a lead's activity timeline.
     */
    public function addNote(string $id, array $data): LeadActivity
    {
        $lead     = Lead::findOrFail($id);
        $activity = $this->logActivity(
            $lead,
            $data['type'] ?? 'note',
            $data['note'],
            $data['metadata'] ?? []
        );

        // Update last_contacted_at when a call log is added
        if (($data['type'] ?? 'note') === 'call_log') {
            $lead->update(['last_contacted_at' => now()]);
        }

        return $activity;
    }

    /**
     * Set or update the follow-up date on a lead.
     */
    public function setFollowUp(string $id, string $followUpAt): Lead
    {
        $lead = Lead::findOrFail($id);

        $lead->update(['next_followup_at' => $followUpAt]);

        $this->logActivity($lead, 'followup_set', "Follow-up scheduled for: {$followUpAt}");

        return $lead->fresh(['status', 'assignedTo']);
    }

    /**
     * Internal helper — writes a row to lead_activities.
     * Called by every method above so the timeline is always complete.
     */
    private function logActivity(
        Lead $lead,
        string $type,
        string $note,
        array $metadata = []
    ): LeadActivity {
        return LeadActivity::create([
            'lead_id'     => $lead->id,
            'business_id' => $lead->business_id,
            'user_id'     => Auth::id(),
            'type'        => $type,
            'description' => $note,
            'metadata'    => $metadata,
        ]);
    }
}