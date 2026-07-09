<?php

namespace App\Observers;

use App\Models\Business;
use App\Models\Branch;

/**
 * Auto-creates the default branch when a business is first created.
 * The business name, city (if available), and WhatsApp number become
 * the first branch — so every business always has at least one branch
 * from day one.
 *
 * Register this in AppServiceProvider::boot():
 *   Business::observe(BusinessObserver::class);
 */
class BusinessObserver
{
    public function created(Business $business): void
    {
        Branch::create([
            'business_id'     => $business->id,
            'name'            => $business->name,
            'whatsapp_number' => $business->whatsapp_number,
            'is_active'       => true,
        ]);
    }
}
