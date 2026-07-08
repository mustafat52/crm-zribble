<?php

namespace App\Modules\Leads\Controllers;

use App\Http\Controllers\Controller;
use App\Models\CustomFieldDefinition;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class CustomFieldController extends Controller
{
    public function index(): JsonResponse
    {
        $fields = CustomFieldDefinition::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $fields]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label'       => 'required|string|max:100',
            'type'        => ['required', Rule::in(['text', 'number', 'select', 'date', 'phone'])],
            'options'     => 'nullable|array',
            'options.*'   => 'string|max:100',
            'is_required' => 'boolean',
            'sort_order'  => 'integer|min:0',
        ]);

        if ($validated['type'] === 'select' && empty($validated['options'])) {
            return response()->json([
                'message' => 'Options are required for select fields.',
            ], 422);
        }

        $field = CustomFieldDefinition::create([
            'business_id' => $request->user()->business_id,
            'label'       => $validated['label'],
            'type'        => $validated['type'],
            'options'     => $validated['options'] ?? null,
            'is_required' => $validated['is_required'] ?? false,
            'is_active'   => true,
            'sort_order'  => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['data' => $field], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        // T56 FIX: Scope to authenticated business before updating.
        // Without this, any authenticated user can update another business's custom fields.
        $field = CustomFieldDefinition::where('id', $id)
            ->where('business_id', $request->user()->business_id)
            ->firstOrFail();

        $validated = $request->validate([
            'label'       => 'sometimes|string|max:100',
            'options'     => 'nullable|array',
            'options.*'   => 'string|max:100',
            'is_required' => 'boolean',
            'is_active'   => 'boolean',
            'sort_order'  => 'integer|min:0',
        ]);

        $field->update($validated);

        return response()->json(['data' => $field]);
    }

    public function destroy(string $id): JsonResponse
    {
        // T56 FIX: Scope to authenticated business before deactivating.
        $field = CustomFieldDefinition::where('id', $id)
            ->where('business_id', request()->user()->business_id)
            ->firstOrFail();

        $field->update(['is_active' => false]);

        return response()->json(['message' => 'Field deactivated successfully.']);
    }
}
