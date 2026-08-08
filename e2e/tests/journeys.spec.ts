/**
 * Browser end-to-end flows — 15 §2, §13, §19, §20, §22.
 *
 * These assert the behaviours the release gate names, not framework mechanics:
 * no blank routes, the golden-case inline states, document gating, stale-result
 * handling, keyboard issue navigation and the absence of PHI in browser storage.
 */

import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Every route from 03 §2. */
const STATIC_ROUTES = [
  { path: '/verifications/new', heading: 'New verification' },
  { path: '/records', heading: 'Records' },
  { path: '/review', heading: 'Review queue' },
  { path: '/carriers', heading: 'Carrier master' },
  { path: '/templates', heading: 'Templates' },
  { path: '/system', heading: 'System' },
  { path: '/help', heading: 'Help' },
];

async function goldenCaseId(page: Page): Promise<string> {
  const response = await page.request.get('http://127.0.0.1:3001/v1/cases');
  const body = (await response.json()) as { items: { id: string; payer_label: string }[] };
  const found = body.items.find((c) => c.payer_label === 'Cigna ASH');
  if (!found) throw new Error('Seed data missing. Run `pnpm seed` first.');
  return found.id;
}

test.describe('no route is blank (05 §18)', () => {
  for (const route of STATIC_ROUTES) {
    test(`${route.path} renders real content`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { name: route.heading, level: 1 })).toBeVisible();

      // A populated page has substantive text, not an empty shell.
      const text = await page.locator('main').innerText();
      expect(text.length).toBeGreaterThan(200);
      // No unhandled render failure left the shell empty.
      await expect(page.locator('main')).not.toContainText('Something went wrong');
    });
  }

  test('/ redirects to New verification (03 §2)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/verifications\/new$/);
  });

  test('an unknown route explains itself and offers safe navigation', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: /Page not found/i })).toBeVisible();
    // Rendered as links so they are real navigations a keyboard or screen-reader
    // user can open in the usual ways.
    await expect(page.getByRole('link', { name: 'Go to New verification' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Records' })).toBeVisible();
  });

  test('there is no sign-in, profile or sign-out control (ADR-008, 03 §1)', async ({ page }) => {
    await page.goto('/records');
    for (const forbidden of ['Sign in', 'Log in', 'Sign out', 'Log out', 'Profile', 'My account']) {
      await expect(page.getByRole('button', { name: forbidden })).toHaveCount(0);
      await expect(page.getByRole('link', { name: forbidden })).toHaveCount(0);
    }
    // The workstation label is present but explicitly not authentication.
    await expect(page.getByText('Workstation (unauthenticated)')).toBeVisible();
  });
});

test.describe('golden case workspace (02 §9, 15 §10)', () => {
  test('shows the required inline states and blocks the final PDF', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/workspace`);

    // CASE-001: the authorization threshold mismatch, red, with both values.
    const authBlock = page.locator('[data-field-key="authorization.requiredAfterVisitNumber"]');
    await expect(authBlock).toBeVisible();
    await expect(authBlock).toHaveAttribute('data-outcome', 'MISMATCH');
    await expect(authBlock).toHaveAttribute('data-severity', 'FAILURE');
    await expect(authBlock).toContainText('Entered 5; representative confirmed 8.');
    await expect(authBlock.locator('input')).toHaveValue('5');
    await expect(authBlock).toContainText('Supported value:');
    // 09 §8: the evidence excerpt is inside the block, with a timestamp.
    await expect(authBlock).toContainText('authorization is required after the eighth visit');
    await expect(authBlock).toContainText('at 6:44');

    // CASE-002: coinsurance conflict, amber, both candidates, no unsafe apply.
    const coinsuranceBlock = page.locator('[data-field-key="financial.patientCoinsurancePercent"]');
    await expect(coinsuranceBlock).toHaveAttribute('data-outcome', 'CONFLICT_IN_SOURCE');
    await expect(coinsuranceBlock).toContainText('conflicting values: 20% and 30%');
    await expect(coinsuranceBlock).toContainText('twenty percent');
    await expect(coinsuranceBlock).toContainText('thirty percent');
    await expect(
      coinsuranceBlock.getByRole('button', { name: 'Apply supported value' }),
    ).toHaveCount(0);

    // CASE-005: secondary is never rendered as a match against "No".
    const secondaryBlock = page.locator('[data-field-key="coordination.secondaryStatus"]');
    await expect(secondaryBlock).toContainText('not visible on their side');
    await expect(secondaryBlock).toContainText('does not confirm that none exists');

    // CASE-004 and CASE-007: derived values disclose their formula.
    await expect(page.locator('[data-field-key="visits.usedCount"]')).toContainText(
      'Formula: 20 − 19',
    );
    await expect(page.locator('[data-field-key="financial.individualOopMet"]')).toContainText(
      '$6,500.00 − $5,473.76',
    );

    // 15 §22: no clean final PDF for a FAILED case, and the reason is visible.
    const finalButton = page.getByRole('button', { name: 'Generate final PDF' });
    await expect(finalButton).toBeDisabled();
    await expect(page.getByText(/clean final VOB cannot be generated/)).toBeVisible();
    // Only the permitted document types are offered.
    await expect(page.getByRole('button', { name: 'Internal QA report' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Failed draft' })).toBeEnabled();
  });

  test('leading zeros survive into the rendered form (08 §12, 15 §4)', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/workspace`);
    await expect(page.locator('[data-field-key="primary.groupId"] input')).toHaveValue('00633434');
  });

  test('editing a field marks the result stale and blocks finalization (09 §15)', async ({
    page,
  }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/workspace`);

    const planName = page.locator('[data-field-key="primary.planName"] input');
    await planName.fill('Edited by end-to-end test');
    await planName.blur();

    await expect(page.getByText('Changes not verified')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Generate final PDF' })).toBeDisabled();

    await page.getByRole('button', { name: 'Verify' }).click();
    await expect(page.getByText('Changes not verified')).toHaveCount(0, { timeout: 15_000 });
  });

  test('the imported original stays visible after an edit (ADR-006)', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/workspace`);

    // Deliberately edits a field no other test asserts on. Resolving
    // authorization.requiredAfterVisitNumber here would silently disarm the
    // CASE-001 assertions above, since revisions persist for the seeded case.
    const input = page.locator('[data-field-key="primary.planType"] select');
    await input.selectOption('HMO');

    const block = page.locator('[data-field-key="primary.planType"]');
    await expect(block).toContainText('Imported value:', { timeout: 15_000 });
    await expect(block).toContainText('kept unchanged in history');
  });

  test('the comparison tab explains how the result was reached (05 §9)', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/workspace`);

    await page
      .locator('[data-field-key="authorization.requiredAfterVisitNumber"]')
      .getByRole('button', { name: 'View evidence' })
      .click();
    await page.getByRole('tab', { name: 'Comparison' }).click();

    await expect(page.getByRole('rowheader', { name: 'Raw form value' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Normalized form value' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Rule' })).toBeVisible();
  });
});

test.describe('bypass governance (09 §10)', () => {
  test('requires a reason from the controlled list and never offers Ignore', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/workspace`);

    await page
      .locator('[data-field-key="coordination.secondaryStatus"]')
      .getByRole('button', { name: 'Bypass with reason' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Record bypass' })).toBeDisabled();

    const options = await dialog.locator('select#bypass-reason option').allInnerTexts();
    expect(options.join(' ').toLowerCase()).not.toContain('ignore');
    expect(options).toContain('Payer could not verify this');

    await dialog.locator('select#bypass-reason').selectOption('OTHER_WITH_REQUIRED_NOTE');
    // A reason requiring a note keeps the action disabled until one is given.
    await expect(dialog.getByRole('button', { name: 'Record bypass' })).toBeDisabled();
    await expect(dialog.getByText('This reason requires a note.')).toBeVisible();
  });
});

test.describe('review screen (05 §10)', () => {
  test('keeps real field controls and explains the overall status', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/review`);

    await expect(page.getByText(/Why this is/i)).toBeVisible();

    // Resolution happens inside the block, so real editable controls are on the
    // page rather than a detached issue table. Asserted generically because
    // earlier tests in this file resolve individual fields.
    const unresolvedBlocks = page.locator(
      '.field-block--danger, .field-block--review',
    );
    expect(await unresolvedBlocks.count()).toBeGreaterThan(0);
    await expect(unresolvedBlocks.first().locator('input, select, textarea').first()).toBeVisible();

    await expect(page.getByRole('button', { name: 'Go to first issue' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resolve and next' })).toBeVisible();
  });

  test('keyboard users can reach the first issue (15 §19)', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/review`);

    await page.getByRole('button', { name: 'Go to first issue' }).click();
    // Focus lands on the field input itself, not a detached card (03 §9).
    const focused = await page.evaluate(() => ({
      tag: document.activeElement?.tagName ?? '',
      id: document.activeElement?.id ?? '',
    }));
    expect(['INPUT', 'SELECT', 'TEXTAREA', 'DIV']).toContain(focused.tag);
    expect(focused.id).toMatch(/^field-/);
  });
});

test.describe('security (15 §20, 11 §18)', () => {
  test('no case, transcript or patient data is written to browser storage', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/workspace`);
    await expect(page.locator('[data-field-key="primary.groupId"]')).toBeVisible();

    const storage = await page.evaluate(() => ({
      local: JSON.stringify(window.localStorage),
      session: JSON.stringify(window.sessionStorage),
    }));

    for (const blob of [storage.local, storage.session]) {
      expect(blob).not.toContain('Rivera');
      expect(blob).not.toContain('106723434');
      expect(blob).not.toContain('00633434');
      expect(blob).not.toContain('Cigna');
      expect(blob).not.toContain('deductible');
    }
    expect(storage.local).toBe('{}');
  });

  test('transcript content renders as text, never as markup', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/workspace`);
    // No script element originating from source content exists in the document.
    const injected = await page.evaluate(
      () => document.querySelectorAll('main script').length,
    );
    expect(injected).toBe(0);
  });
});

test.describe('responsive behaviour (04 §13, 03 §13)', () => {
  test('the workspace collapses to a single column on a narrow viewport', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/verifications/${caseId}/workspace`);

    const columns = await page
      .locator('.workspace')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(1);

    // No horizontal overflow of the page body.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(overflow).toBe(true);
  });
});

test.describe('accessibility @a11y', () => {
  for (const route of STATIC_ROUTES) {
    test(`${route.path} has no serious or critical violations`, async ({ page }) => {
      await page.goto(route.path);
      await page.getByRole('heading', { level: 1 }).first().waitFor();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(
        blocking,
        blocking.map((v) => `${v.id}: ${v.help}`).join('\n'),
      ).toEqual([]);
    });
  }

  test('the workspace has no serious or critical violations @a11y', async ({ page }) => {
    const caseId = await goldenCaseId(page);
    await page.goto(`/verifications/${caseId}/workspace`);
    await page.locator('[data-field-key="primary.groupId"]').waitFor();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking, blocking.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
  });

  test('a skip link lets keyboard users bypass the navigation rail @a11y', async ({ page }) => {
    await page.goto('/records');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  });
});
