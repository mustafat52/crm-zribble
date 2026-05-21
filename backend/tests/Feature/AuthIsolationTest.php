<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * T25 — Auth Isolation Tests
 */
class AuthIsolationTest extends TestCase
{
    // Test 1: Unauthenticated request to leads rejected
    public function test_unauthenticated_request_to_leads_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/leads');
        $response->assertUnauthorized();
    }

    // Test 2: Unauthenticated request to lead detail rejected
    public function test_unauthenticated_request_to_lead_detail_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/leads/some-fake-uuid');
        $response->assertUnauthorized();
    }

    // Test 3: /me returns correct business context
    // Confirmed from AuthController: response is { user: { id, business_id, ... } }
    public function test_me_endpoint_returns_correct_business_user(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $ownerA = $this->createUser($businessA, 'owner');
        $ownerB = $this->createUser($businessB, 'owner');

        $responseA = $this->actingAsUser($ownerA)->getJson('/api/v1/me');
        $responseB = $this->actingAsUser($ownerB)->getJson('/api/v1/me');

        // /me wraps response: { "user": { "id": "...", "business_id": "..." } }
        $responseA->assertOk();
        $responseA->assertJsonPath('user.id', $ownerA->id);
        $responseA->assertJsonPath('user.business_id', $businessA->id);

        $responseB->assertOk();
        $responseB->assertJsonPath('user.id', $ownerB->id);
        $responseB->assertJsonPath('user.business_id', $businessB->id);
    }

    // Test 4: Team list only returns own business users
    // Confirmed from TeamController: response is { "data": [ {...}, ... ] }
    public function test_team_list_only_returns_own_business_users(): void
    {
        $businessA = $this->createBusiness('Business A');
        $businessB = $this->createBusiness('Business B');

        $branchA = $this->createBranch($businessA, 'Branch A1');
        $branchB = $this->createBranch($businessB, 'Branch B1');

        $ownerA = $this->createUser($businessA, 'owner');
        $execA  = $this->createUser($businessA, 'executive', $branchA);
        $execB  = $this->createUser($businessB, 'executive', $branchB);

        $response = $this->actingAsUser($ownerA)->getJson('/api/v1/team');

        $response->assertOk();

        // TeamController returns { "data": [...] }
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($execA->id, $ids, 'Business A team member must be visible');
        $this->assertNotContains($execB->id, $ids, 'Business B team member must NOT be visible');
    }
}