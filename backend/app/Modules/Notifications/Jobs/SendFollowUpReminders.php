<?php

namespace App\Modules\Notifications\Jobs;

use App\Mail\LeadCreatedMail;
use App\Modules\Leads\Models\LeadFollowup;
use App\Modules\Notifications\Models\InAppNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendFollowUpReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        // Find all pending follow-ups that are due in the next 30 minutes
        // and haven't been reminded yet
        $dueFollowups = LeadFollowup::where('status', 'pending')
            ->where('follow_up_at', '<=', now()->addMinutes(30))
            ->whereNull('reminded_at')
            ->with(['lead.business'])
            ->get();

        foreach ($dueFollowups as $followup) {
            $lead     = $followup->lead;
            $business = $lead?->business;

            if (! $lead || ! $business) {
                continue;
            }

            // Who to notify — assigned user, or fall back to owner
            $notifyUserId = $followup->assigned_to;
            $notifyUser   = null;

            if ($notifyUserId) {
                $notifyUser = $business->users()->where('id', $notifyUserId)->first();
            }

            // Fall back to owner if no assigned user
            if (! $notifyUser) {
                $ownerIds   = \DB::table('model_has_roles')
                    ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                    ->where('roles.name', 'owner')
                    ->where('model_has_roles.model_type', \App\Models\User::class)
                    ->pluck('model_has_roles.model_id');

                $notifyUser = $business->users()->whereIn('id', $ownerIds)->first();
            }

            if (! $notifyUser) {
                continue;
            }

            try {
                // 1. In-app notification
                InAppNotification::create([
                    'business_id' => $business->id,
                    'user_id'     => $notifyUser->id,
                    'lead_id'     => $lead->id,
                    'type'        => 'follow_up_due',
                    'title'       => 'Follow-up Due: ' . $lead->name,
                    'body'        => $followup->note ?? ('Scheduled for ' . $followup->follow_up_at->format('d M, h:i A')),
                    'url'         => '/leads/' . $lead->id,
                    'is_read'     => false,
                    'created_at'  => now(),
                ]);

                // 2. Email reminder
                Mail::to($notifyUser->email)->send(new LeadCreatedMail(
                    leadName:     $lead->name,
                    leadMobile:   $lead->mobile,
                    leadSource:   $lead->source ?? 'unknown',
                    businessName: $business->name,
                    assignedTo:   'Follow-up due: ' . $followup->follow_up_at->format('d M Y, h:i A'),
                ));

                // Mark as reminded so we don't send again
                $followup->update(['reminded_at' => now()]);

            } catch (\Exception $e) {
                Log::error('Follow-up reminder failed', [
                    'followup_id' => $followup->id,
                    'error'       => $e->getMessage(),
                ]);
            }
        }
    }
}