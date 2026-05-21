<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * T25 — Cross-Tenant Lead Isolation Tests
 */
class CrossTenantLeadTest extends TestCase
{
    // Test 1: Lead list scoped to own business
    public function test_lead_list_only_returns_own_business_leads(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $branchA = $this->createBranch($businessA, 'Branch A1');
        $branchB = $this->createBranch($businessB, 'Branch B1');

        $ownerA = $this->createUser($businessA, 'owner');

        $leadA = $this->createLead($businessA, $branchA);
        $leadB = $this->createLead($businessB, $branchB);

        $response = $this->actingAsUser($ownerA)->getJson('/api/v1/leads');

        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($leadA->id, $ids, 'Business A lead should be visible to Business A owner');
        $this->assertNotContains($leadB->id, $ids, 'Business B lead must NOT be visible to Business A owner');
    }

    // Test 2: Cannot read lead from another business
    public function test_cannot_read_lead_belonging_to_another_business(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $branchB = $this->createBranch($businessB, 'Branch B1');
        $ownerA  = $this->createUser($businessA, 'owner');
        $leadB   = $this->createLead($businessB, $branchB);

        $response = $this->actingAsUser($ownerA)->getJson("/api/v1/leads/{$leadB->id}");

        $response->assertNotFound();
    }

    // Test 3: Cannot update lead from another business
    public function test_cannot_update_lead_belonging_to_another_business(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $branchB = $this->createBranch($businessB, 'Branch B1');
        $ownerA  = $this->createUser($businessA, 'owner');
        $leadB   = $this->createLead($businessB, $branchB);

        $response = $this->actingAsUser($ownerA)
            ->putJson("/api/v1/leads/{$leadB->id}", ['name' => 'Hacked Name']);

        $response->assertNotFound();

        $this->assertDatabaseHas('leads', [
            'id'   => $leadB->id,
            'name' => $leadB->name,
        ]);
    }

    // Test 4: Cannot change status of lead from another business
    // Field name confirmed from LeadController: 'status_id' (not lead_status_id)
    public function test_cannot_change_status_of_lead_from_another_business(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $branchB  = $this->createBranch($businessB, 'Branch B1');
        $ownerA   = $this->createUser($businessA, 'owner');
        $statusA  = $this->createLeadStatus($businessA, 'Contacted');
        $leadB    = $this->createLead($businessB, $branchB);

        $response = $this->actingAsUser($ownerA)
            ->putJson("/api/v1/leads/{$leadB->id}/status", [
                'status_id' => $statusA->id,   // correct field name from controller
            ]);

        $response->assertNotFound();
    }

    // Test 5: Cannot assign lead from another business
    public function test_cannot_assign_lead_belonging_to_another_business(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $branchA  = $this->createBranch($businessA, 'Branch A1');
        $branchB  = $this->createBranch($businessB, 'Branch B1');
        $ownerA   = $this->createUser($businessA, 'owner');
        $execA    = $this->createUser($businessA, 'executive', $branchA);
        $leadB    = $this->createLead($businessB, $branchB);

        $response = $this->actingAsUser($ownerA)
            ->putJson("/api/v1/leads/{$leadB->id}/assign", [
                'user_id' => $execA->id,
            ]);

        $response->assertNotFound();
    }

    // Test 6: Cannot add note to lead from another business
    // Field name confirmed from LeadController: 'note' (not content)
    public function test_cannot_add_note_to_lead_from_another_business(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $branchB = $this->createBranch($businessB, 'Branch B1');
        $ownerA  = $this->createUser($businessA, 'owner');
        $leadB   = $this->createLead($businessB, $branchB);

        $response = $this->actingAsUser($ownerA)
            ->postJson("/api/v1/leads/{$leadB->id}/notes", [
                'note' => 'Injected note from Business A',  // correct field name
                'type' => 'note',
            ]);

        $response->assertNotFound();

        $this->assertDatabaseMissing('lead_activities', [
            'lead_id' => $leadB->id,
        ]);
    }

    // Test 7: Lead statuses only returns own business statuses
    // /lead-statuses returns a flat array (no data wrapper) — confirmed from LeadStatusController
    public function test_lead_statuses_only_returns_own_business_statuses(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $ownerA  = $this->createUser($businessA, 'owner');
        $statusA = $this->createLeadStatus($businessA, 'A-New');
        $statusB = $this->createLeadStatus($businessB, 'B-New');

        $response = $this->actingAsUser($ownerA)->getJson('/api/v1/lead-statuses');

        $response->assertOk();

        // Try both flat array and data-wrapped — handles either response shape
        $body = $response->json();
        $items = isset($body['data']) ? $body['data'] : $body;
        $ids = collect($items)->pluck('id')->all();

        $this->assertContains($statusA->id, $ids, 'Business A status should be visible');
        $this->assertNotContains($statusB->id, $ids, 'Business B status must not be visible');
    }

    // Test 8: Branch list only returns own business branches
    public function test_branches_list_only_returns_own_business_branches(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $ownerA  = $this->createUser($businessA, 'owner');
        $branchA = $this->createBranch($businessA, 'A Branch');
        $branchB = $this->createBranch($businessB, 'B Branch');

        $response = $this->actingAsUser($ownerA)->getJson('/api/v1/branches');

        $response->assertOk();

        $body = $response->json();
        $items = isset($body['data']) ? $body['data'] : $body;
        $ids = collect($items)->pluck('id')->all();

        $this->assertContains($branchA->id, $ids, 'Business A branch should be visible');
        $this->assertNotContains($branchB->id, $ids, 'Business B branch must not be visible');
    }
}