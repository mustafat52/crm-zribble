<?php

namespace App\Modules\WhatsApp\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use App\Modules\WhatsApp\Models\WhatsAppTemplate;
use Illuminate\Support\Facades\Auth;

class WhatsAppTemplateController extends Controller
{
    public function index()
    {
        $templates = WhatsAppTemplate::orderBy('name')->get();

        return response()->json($templates->map(fn($t) => $this->format($t)));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'category'    => 'required|in:UTILITY,MARKETING,AUTHENTICATION',
            'language'    => 'nullable|string|max:10',
            'body_text'   => 'nullable|string',
            'variables'   => 'nullable|array',
            'template_id' => 'nullable|string|max:100',
        ]);

        $exists = WhatsAppTemplate::where('name', $data['name'])->exists();
        if ($exists) {
            return response()->json(['message' => 'A template with this name already exists.'], 422);
        }

        $template = WhatsAppTemplate::create([
            'business_id' => Auth::user()->business_id,
            'name'        => $data['name'],
            'category'    => $data['category'],
            'language'    => $data['language'] ?? 'en',
            'body_text'   => $data['body_text'] ?? null,
            'variables'   => $data['variables'] ?? [],
            'template_id' => $data['template_id'] ?? null,
            'is_active'   => true,
        ]);

        return response()->json($this->format($template), 201);
    }

    public function update(Request $request, string $id)
    {
        $template = WhatsAppTemplate::findOrFail($id);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'category'    => 'sometimes|in:UTILITY,MARKETING,AUTHENTICATION',
            'language'    => 'sometimes|string|max:10',
            'body_text'   => 'nullable|string',
            'variables'   => 'nullable|array',
            'template_id' => 'nullable|string|max:100',
            'is_active'   => 'sometimes|boolean',
        ]);

        $template->update($data);

        return response()->json($this->format($template->fresh()));
    }

    public function destroy(string $id)
    {
        $template = WhatsAppTemplate::findOrFail($id);
        $template->update(['is_active' => false]);

        return response()->json(['message' => 'Template deactivated.']);
    }

    private function format(WhatsAppTemplate $t): array
    {
        return [
            'id'          => $t->id,
            'name'        => $t->name,
            'category'    => $t->category,
            'language'    => $t->language,
            'body_text'   => $t->body_text,
            'variables'   => $t->variables ?? [],
            'template_id' => $t->template_id,
            'is_active'   => $t->is_active,
            'created_at'  => $t->created_at?->toDateTimeString(),
        ];
    }
}