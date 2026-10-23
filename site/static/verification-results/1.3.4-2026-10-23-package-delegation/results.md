# Kamiwaza 1.3.4 verification report

Evidence date: 2026-10-23

## Scope

Create a reusable skill, approve its agent, and explicitly delegate a task to that agent. The complete six-checkpoint browser journey passed on Core 1.3.4. Capability-kit PR193 accepted two genuinely new scoped results on October 23; this report publishes those results for people and assistants.

The tested Kaizen configuration combined the reviewed package-guidance backend and worker fix d2564c90, Pi diagnostics c11cfaeb, and other Kaizen components b3b4fdc8. The registered test producer remained b3b4fdc8. Exact image digests and source mappings are in the canonical runtime observation.

## Results

69 of 87 capabilities now have accepted scoped release evidence, up from 67. Eighteen still await release verification. The 58 historical prerelease entries remain separately preserved; they are not added to 69. These two additions are fresh tests, not carried evidence or refreshed credit.

### Recipe: create a reusable skill and delegate a task

Who: a member allowed to use Kaizen builders, plus a separate administrator who can review package and agent proposals.

Ingredients: Kaizen with the package-creator and agent-builder, a working serving model, a unique package name, a small Markdown skill, a question that demonstrates that skill, and access to your own workroom.

- 1. Open the package-creator. Draft a native Pi guidance-only package with your unique name and Markdown skill. Validate the original draft and inspect the result.
- 2. Ask the agent-builder to use that exact package version. Keep the agent as a draft if its package still needs approval.
- 3. Have the administrator approve the package. Resume the agent draft against the approved package, submit it, and have the administrator approve it. This proof used authenticated administrative API calls; it did not test an approval-screen click path.
- 4. Open the approved agent. Ask the prepared question and check that its answer uses the skill.
- 5. In a general Kaizen chat, choose Add files, agents, connectors, or tools, then Sub-agents. Select the approved agent and explicitly request delegation to it. Check the named child-agent activity and answer.
- 6. Restore the prior sub-agent selection. Have the operator remove the disposable agent, package and drafts, and archive the exercise chats. Keep immutable approval audit history.

Expected result: the approved agent uses the skill, and the explicitly selected child agent is visibly attributed in the delegated run. All six checkpoints, original-author validation and owned cleanup passed.

### Ingredient glossary

- kaizen.agent-packages - Release verified for native guidance-only package drafting, original validation, administrator approval and skill-backed use.
- kaizen.agent-auto-routing - Release verified for explicit member-selected delegation, roster/grant boundaries and an attributed child-agent run. The capability name does not imply automatic specialist selection was tested.

## Evidence

Canonical accepted source: capability-kit merge 6a5e7249ed9a4340bd4c84bcb530e4a4a712650f.

Packet: https://github.com/kamiwaza-internal/capability-kit/tree/6a5e7249ed9a4340bd4c84bcb530e4a4a712650f/reports/2026-10-23-native-package-guidance-unique-fixture

Acceptance: https://github.com/kamiwaza-internal/capability-kit/pull/193

- kaizen.agent-auto-routing: stamp d0c46f80214ab3517fac3f254b507dd055c919d0b261882769df42ab61ea21b4
- kaizen.agent-packages: stamp b212cfe1d67950513888fadfcc8745d3162a74ee21134961a67ea0356d5fc190

The packet retains the pre-execution plan, matching before/after captures, six-checkpoint record, original validation receipt, cleanup evidence and exact runtime observation. Independent reviewers reproduced both stamps. The immutable candidate packet still describes publication as pending because it predates the merge; PR193 records subsequent acceptance. Earlier failed attempts and their reviewed resolutions remain visible.

## Limits and assumptions

No whole-release approval is claimed. This cumulative 69-count combines scoped proofs across recorded configurations. The broad member API suite was not exercised; the outer runner correctly retained exit 1 even though all six selected browser checkpoints passed.

Unverified package operations: dependency/vulnerability scanning, npm import, grant-ceiling enforcement and unregistered-package refusal. Unverified routing operations: rule-based automatic specialist selection, policy pins/exclusions and consult audit. Earlier assumptions about fake sessions and no model execution describe historical unit tests; this new replay used a real model and an attributed delegated child run.

## Remaining work

Eighteen active capability IDs still lack accepted release evidence. Continue registered, scoped verification against the canonical inventory, retaining failures and cleanup receipts. A passing task within an already accepted ID does not increase the unique count. This report and the separately reviewed current-source intake update the existing download pipeline; they do not change the site layout or grant additional credit.
