<?php

namespace App\Modules\Notifications\Listeners;

use App\Mail\LeadCreatedMail;
use App\Modules\Leads\Events\LeadCreated;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;


class NotifyOwnerOfNewLead
{
    public function handle(LeadCreated $event): void
    {
        $lead = $event->lead;

        $lead->loadMissing('business');
        $business = $lead->business;

        if (!$business) return;

        $ownerRoleId = DB::table('roles')
            ->where('name', 'owner')
            ->where('guard_name', 'sanctum')
            ->value('id');

        if (!$ownerRoleId) return;

        $owner = User::where('business_id', $business->id)
            ->whereIn('id',
                DB::table('model_has_roles')
                    ->where('role_id', $ownerRoleId)
                    ->where('model_type', User::class)
                    ->pluck('model_id')
            )
            ->first();

        if (!$owner) return;

        $assignedName = null;
        if ($lead->assigned_to) {
            $lead->loadMissing('assignedTo');
            $assignedName = $lead->assignedTo?->name;
        }

        Mail::to($owner->email)->send(
            new LeadCreatedMail(
                leadName: $lead->name,
                leadMobile: $lead->mobile,
                leadSource: $lead->source ?? 'manual',
                businessName: $business->name,
                assignedTo: $assignedName,
            )
        );
    }
}