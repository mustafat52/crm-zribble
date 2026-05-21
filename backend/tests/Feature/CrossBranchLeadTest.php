<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * T25 — Cross-Branch Lead Isolation Tests
 */
class CrossBranchLeadTest extends TestCase
{
    // Test 1: Executive in Branch 1 cannot see Branch 2 leads in list
    public function test_executive_only_sees_own_branch_leads_in_list(): void
    {
        $business = $this->createBusiness('Glamour Salon');

        $branch1 = $this->createBranch($business, 'Andheri Branch');
        $branch2 = $this->createBranch($business, 'Bandra Branch');

        $exec1 = $this->createUser($business, 'executive', $branch1);

        $lead1 = $this->createLead($business, $branch1);
        $lead2 = $this->createLead($business, $branch2);

        $response = $this->actingAsUser($exec1)->getJson('/api/v1/leads');

        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($lead1->id, $ids, 'Branch 1 lead must be visible to Branch 1 executive');
        $this->assertNotContains($lead2->id, $ids, 'Branch 2 lead must NOT be visible to Branch 1 executive');
    }

    // Test 2: Executive gets 404 on another branch's lead detail
    public function test_executive_gets_404_on_other_branch_lead_detail(): void
    {
        $business = $this->createBusiness('Glamour Salon');

        $branch1 = $this->createBranch($business, 'Andheri Branch');
        $branch2 = $this->createBranch($business, 'Bandra Branch');

        $exec1 = $this->createUser($business, 'executive', $branch1);
        $lead2 = $this->createLead($business, $branch2);

        $response = $this->actingAsUser($exec1)->getJson("/api/v1/leads/{$lead2->id}");

        $response->assertNotFound();
    }

    // Test 3: Executive cannot change status of another branch's lead
    // Field name confirmed from LeadController: 'status_id'
    public function test_executive_cannot_change_status_of_other_branch_lead(): void
    {
        $business = $this->createBusiness('Glamour Salon');

        $branch1 = $this->createBranch($business, 'Andheri Branch');
        $branch2 = $this->createBranch($business, 'Bandra Branch');

        $exec1  = $this->createUser($business, 'executive', $branch1);
        $status = $this->createLeadStatus($business, 'Contacted');
        $lead2  = $this->createLead($business, $branch2);

        $response = $this->actingAsUser($exec1)
            ->putJson("/api/v1/leads/{$lead2->id}/status", [
                'status_id' => $status->id,   // correct field name from controller
            ]);

        $response->assertNotFound();
    }

    // Test 4: Owner sees ALL branches (BranchScope bypass)
    public function test_owner_sees_leads_from_all_branches(): void
    {
        $business = $this->createBusiness('Glamour Salon');

        $branch1 = $this->createBranch($business, 'Andheri Branch');
        $branch2 = $this->createBranch($business, 'Bandra Branch');
        $branch3 = $this->createBranch($business, 'Juhu Branch');

        $owner = $this->createUser($business, 'owner');

        $lead1 = $this->createLead($business, $branch1);
        $lead2 = $this->createLead($business, $branch2);
        $lead3 = $this->createLead($business, $branch3);

        $response = $this->actingAsUser($owner)->getJson('/api/v1/leads');

        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($lead1->id, $ids, 'Owner must see Branch 1 leads');
        $this->assertContains($lead2->id, $ids, 'Owner must see Branch 2 leads');
        $this->assertContains($lead3->id, $ids, 'Owner must see Branch 3 leads');
    }

    // Test 5: Owner can access lead detail from any branch
    public function test_owner_can_read_lead_from_any_branch(): void
    {
        $business = $this->createBusiness('Glamour Salon');

        $branch2 = $this->createBranch($business, 'Bandra Branch');
        $owner   = $this->createUser($business, 'owner');
        $lead2   = $this->createLead($business, $branch2);

        $response = $this->actingAsUser($owner)->getJson("/api/v1/leads/{$lead2->id}");

        $response->assertOk();
        $response->assertJsonPath('id', $lead2->id);
    }
}