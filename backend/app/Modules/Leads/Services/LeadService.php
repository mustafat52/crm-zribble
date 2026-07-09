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
     * Duplicate handling is configurable per business via settings->duplicate_handling:
     *   'merge' (default) — update the existing lead and return it
     *   'new'             — always create a fresh lead regardless
     * Fires LeadCreated event after creation.
     */
    public function create(array $data): Lead
    {
        $user       = Auth::user();
        $businessId = $data['business_id'] ?? $user->business_id;
        $branchId   = $data['branch_id']   ?? $user?->branch_id;

        // Load business settings to check duplicate_handling preference
        $business          = \App\Models\Business::find($businessId);
        $duplicateHandling = $business?->settings['duplicate_handling'] ?? 'merge';

        if ($duplicateHandling === 'merge') {
            // Check by mobile first, then email
            $existing = Lead::withoutGlobalScopes()
                ->where('business_id', $businessId)
                ->where('mobile', $data['mobile'])
                ->first();

        if (!$existing && !empty($data['email'])) {
            $existing = Lead::withoutGlobalScopes()
                ->where('business_id', $businessId)
                ->where('email', $data['email'])
                ->whereNotNull('email')
                ->first();
            }

            if ($existing) {
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
                    'duplicate_of'  => $existing->duplicate_of ?? $existing->id,
                ]);

                $this->logActivity($existing, 'duplicate_merged', 'Lead re-submitted — existing record updated.');

                $result = $existing->fresh(['status', 'assignedTo']);
                $result->is_duplicate = true;

                return $result;
            }
        }

        // Get the default status for this business (lowest sort_order)
        $defaultStatus = LeadStatus::withoutGlobalScopes()
            ->where('business_id', $businessId)
            ->orderBy('sort_order')
            ->first();

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

        $this->logActivity($lead, 'created', 'Lead created.');

        event(new LeadCreated($lead));
        \App\Modules\Reports\Services\ReportService::invalidateCache($lead->business_id);

        $result = $lead->load(['status', 'assignedTo']);
        $result->is_duplicate = false;

        return $result;
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

        $allowed    = ['name', 'email', 'city', 'interested_in', 'lead_value', 'tags', 'custom_fields', 'lost_reason'];
        $updateData = array_intersect_key($data, array_flip($allowed));

        $lead->update($updateData);

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
        'converted_at'   => $newStatus->is_converted ? ($lead->converted_at ?? now()) : null,
        ]);

        $this->logActivity($lead, 'status_changed', "Status changed to: {$newStatus->name}");

        event(new StatusChanged($lead, $oldStatusId, $statusId));
        \App\Modules\Reports\Services\ReportService::invalidateCache($lead->business_id);

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
            $user = User::where('id', $userId)
                ->where('business_id', $lead->business_id)
                ->firstOrFail();
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

        if (($data['type'] ?? 'note') === 'call_log') {
            $lead->update(['last_contacted_at' => now()]);
        }

        return $activity;
    }

    public function setFollowUp(string $id, string $followUpAt, ?string $note = null): Lead
    {
        $lead = Lead::findOrFail($id);

        $lead->update(['next_followup_at' => $followUpAt]);

        \App\Modules\Leads\Models\LeadFollowup::create([
            'business_id'  => $lead->business_id,
            'lead_id'      => $lead->id,
            'assigned_to'  => $lead->assigned_to,
            'follow_up_at' => $followUpAt,
            'note'         => $note,
            'status'       => 'pending',
        ]);

        $this->logActivity($lead, 'followup_set', "Follow-up scheduled for: {$followUpAt}" . ($note ? " — {$note}" : ''));

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

    /**
     * List all follow-ups for a lead, newest first.
     */
    public function listFollowups(string $id): array
    {
        $lead = Lead::findOrFail($id);

        $followups = \App\Modules\Leads\Models\LeadFollowup::where('lead_id', $lead->id)
            ->where('business_id', $lead->business_id)
            ->orderByDesc('follow_up_at')
            ->get()
            ->map(function ($f) {
                return [
                    'id'           => $f->id,
                    'follow_up_at' => $f->follow_up_at,
                    'note'         => $f->note,
                    'status'       => $f->status,
                    'reminded_at'  => $f->reminded_at,
                    'assigned_to'  => $f->assigned_to,
                    'created_at'   => $f->created_at,
                ];
            });

        return ['data' => $followups];
    }

    /**
     * Mark a follow-up as done.
     * Also clears next_followup_at on the lead if no other pending follow-ups remain.
     */
    public function markFollowupDone(string $id, string $followupId): array
    {
        $lead     = Lead::findOrFail($id);
        $followup = \App\Modules\Leads\Models\LeadFollowup::where('id', $followupId)
            ->where('lead_id', $lead->id)
            ->where('business_id', $lead->business_id)
            ->firstOrFail();

        $followup->update(['status' => 'done']);

        // If no more pending follow-ups, clear next_followup_at on the lead
        $hasPending = \App\Modules\Leads\Models\LeadFollowup::where('lead_id', $lead->id)
            ->where('status', 'pending')
            ->exists();

        if (!$hasPending) {
            $lead->update(['next_followup_at' => null]);
        } else {
            // Point next_followup_at to the next pending one
            $next = \App\Modules\Leads\Models\LeadFollowup::where('lead_id', $lead->id)
                ->where('status', 'pending')
                ->orderBy('follow_up_at')
                ->first();
            $lead->update(['next_followup_at' => $next->follow_up_at]);
        }

        $this->logActivity($lead, 'followup_set', 'Follow-up marked as done.');

        return ['success' => true, 'followup_id' => $followupId];
    }

    /**
     * Get all overdue pending follow-ups for the authenticated business.
     * Used by the dashboard overdue widget.
     */
    public function overdueFollowups(): array
    {
        $businessId = Auth::user()->business_id;

        $followups = \App\Modules\Leads\Models\LeadFollowup::with(['lead'])
            ->where('business_id', $businessId)
            ->where('status', 'pending')
            ->where('follow_up_at', '<', now())
            ->orderBy('follow_up_at')
            ->limit(20)
            ->get()
            ->map(function ($f) {
                return [
                    'id'           => $f->id,
                    'follow_up_at' => $f->follow_up_at,
                    'note'         => $f->note,
                    'status'       => $f->status,
                    'lead_id'      => $f->lead_id,
                    'lead_name'    => $f->lead?->name,
                    'lead_mobile'  => $f->lead?->mobile,
                ];
            });

        return ['data' => $followups];
    }
}