<?php

namespace App\Modules\Leads\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use App\Models\LeadStatus;

class LeadStatusController
{
    /**
     * GET /api/v1/lead-statuses
     * Returns all lead statuses for the authenticated user's business.
     * BusinessScope applies automatically — no manual filtering needed.
     */
    public function index(): JsonResponse
    {
        $statuses = LeadStatus::orderBy('sort_order')
            ->get()
            ->map(fn (LeadStatus $s) => [
                'id'           => $s->id,
                'name'         => $s->name,
                'color'        => $s->color,
                'sort_order'   => $s->sort_order,
                'is_converted' => $s->is_converted,
                'is_lost'      => $s->is_lost,
                'is_terminal'  => $s->is_terminal,
            ]);

        return response()->json(['data' => $statuses]);
    }
}