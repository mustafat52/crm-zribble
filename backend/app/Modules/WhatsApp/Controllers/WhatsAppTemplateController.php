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
        // T55 FIX: Scope to authenticated user's business explicitly.
        // If WhatsAppTemplate does not boot BusinessScope, this prevents
        // leaking other businesses' templates.
        $templates = WhatsAppTemplate::where('business_id', Auth::user()->business_id)
            ->orderBy('name')
            ->get();

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

        $exists = WhatsAppTemplate::where('name', $data['name'])
            ->where('business_id', Auth::user()->business_id)
            ->exists();

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
        // T55 FIX: Scope findOrFail to the authenticated business.
        // Without this, a user from Business A can update Business B's templates.
        $template = WhatsAppTemplate::where('id', $id)
            ->where('business_id', Auth::user()->business_id)
            ->firstOrFail();

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
        // T55 FIX: Scope to authenticated business before deactivating.
        $template = WhatsAppTemplate::where('id', $id)
            ->where('business_id', Auth::user()->business_id)
            ->firstOrFail();

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

    public function conversations(string $leadId)
    {
        $conversations = \App\Modules\WhatsApp\Models\WhatsAppConversation::withoutGlobalScopes()
            ->where('business_id', Auth::user()->business_id)
            ->where('lead_id', $leadId)
            ->orderBy('sent_at', 'asc')
            ->get()
            ->map(fn($c) => [
                'id'            => $c->id,
                'direction'     => $c->direction,
                'message_id'    => $c->message_id,
                'template_name' => $c->template_name,
                'body'          => $c->body,
                'status'        => $c->status,
                'recipient'     => $c->recipient,
                'sent_at'       => $c->sent_at?->toDateTimeString(),
                'delivered_at'  => $c->delivered_at?->toDateTimeString(),
                'read_at'       => $c->read_at?->toDateTimeString(),
            ]);

        return response()->json($conversations);
    }
}
