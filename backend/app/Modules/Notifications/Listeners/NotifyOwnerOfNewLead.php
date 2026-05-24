<?php

namespace App\Modules\Notifications\Listeners;

use App\Mail\LeadCreatedMail;
use App\Modules\Leads\Events\LeadCreated;
use App\Modules\Notifications\Models\InAppNotification;
use Illuminate\Support\Facades\Mail;

class NotifyOwnerOfNewLead
{
    public function handle(LeadCreated $event): void
    {
        $lead     = $event->lead;
        $business = $lead->business;

        if (! $business) {
            return;
        }

        // Find the business owner
        $ownerIds = \DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('roles.name', 'owner')
            ->where('model_has_roles.model_type', \App\Models\User::class)
            ->pluck('model_has_roles.model_id');

        $owner = $business->users()
            ->whereIn('id', $ownerIds)
            ->first();

        if (! $owner) {
            return;
        }

        $assignedName = null;
        if ($lead->assigned_to) {
            $assignedUser = $business->users()->where('id', $lead->assigned_to)->first();
            $assignedName = $assignedUser?->name;
        }

        // 1. Send email
        Mail::to($owner->email)->send(new LeadCreatedMail(
            leadName:     $lead->name,
            leadMobile:   $lead->mobile,
            leadSource:   $lead->source ?? 'unknown',
            businessName: $business->name,
            assignedTo:   $assignedName,
        ));

        // 2. Write in-app notification for owner
        InAppNotification::create([
            'business_id' => $business->id,
            'user_id'     => $owner->id,
            'lead_id'     => $lead->id,
            'type'        => 'lead_created',
            'title'       => 'New Lead: ' . $lead->name,
            'body'        => 'From ' . ($lead->source ?? 'unknown') . ' · ' . $lead->mobile,
            'url'         => '/leads/' . $lead->id,
            'is_read'     => false,
            'created_at'  => now(),
        ]);

        // 3. If lead is assigned to someone else, notify them too
        if ($lead->assigned_to && $lead->assigned_to !== $owner->id) {
            InAppNotification::create([
                'business_id' => $business->id,
                'user_id'     => $lead->assigned_to,
                'lead_id'     => $lead->id,
                'type'        => 'lead_assigned',
                'title'       => 'Lead Assigned to You: ' . $lead->name,
                'body'        => 'From ' . ($lead->source ?? 'unknown') . ' · ' . $lead->mobile,
                'url'         => '/leads/' . $lead->id,
                'is_read'     => false,
                'created_at'  => now(),
            ]);
        }
    }
}