import {recipeGuide, releaseWorkView} from './verification-guide.mjs';
import {evidenceDocument} from './evidence.mjs';

export const salesKitPath = version => '/evidence/' + version + '/kamiwaza-sales-dev-kit-' + version;

// The complete evidence appendix is reused unchanged. No new status computation lives here.
export function salesKitDocument(entry, publication, releaseStamps, guidance, streams) {
  if (entry.work) return recipeGuide(releaseWorkView(entry.work));
  if (entry.corpus?.currentVerification) return recipeGuide(entry.corpus.currentVerification);
  const h = (level, text) => ({type: 'h', level, text});
  const p = text => ({type: 'p', text});
  const li = text => ({type: 'li', level: 0, text});
  const blocks = [h(1, `Kamiwaza and Kaizen Sales Dev Kit ${entry.version}`),
    p(`A neutral, evidence-grounded reference. ${entry.headline}.`),
    p(entry.basis), h(2, 'Value streams and implementation paths')];
  if (streams) {
    const ready = streams.streams.filter(stream => stream.recipe);
    blocks.push(p(`${streams.inventoryCount} source stream sections are indexed; ${ready.length} have a reviewed recipe. Historical candidate mappings are not current coverage or stream verification. The remaining ${streams.inventoryCount - ready.length} sections need step-level reconciliation.`));
    for (const stream of ready) {
      const recipe = stream.recipe;
      blocks.push(h(3, `${stream.title} (${stream.id})`), p(recipe.outcome),
        p(`Whole-stream status: ${stream.status}. Source scope: ${recipe.source_version}. ${recipe.tested_build ? `Recorded ${recipe.tested_build}; this fingerprint identifies the private build description, not release binding.` : `No whole-stream tested build; this recipe is not whole-stream or release verification for ${entry.version}.`}`),
        p(`Roles: ${recipe.roles.join(', ')}. Custom-app boundary: ${recipe.custom_app_boundary}`),
        p('Prerequisites'), ...recipe.prerequisites.map(li), p('Configuration'), ...recipe.configuration.map(li));
      for (const step of recipe.steps) {
        blocks.push(p(`${step.id}: ${step.action} Depends on: ${step.depends_on.length ? step.depends_on.join(', ') : 'none'}. ${streams.schema === 'public-value-stream-recipes.v3' ? 'Capability links: ' + streams.claimLinks.filter(link => link.streamId === stream.id && link.stepId === step.id).map(link => link.capabilityId + ' (' + link.role + ')').join(', ') + '. Links are recipe ingredients; effective credit comes only from the published capability verdict' : 'Capability IDs: ' + step.capability_ids.join(', ')}.`),
          p(`API path: ${step.api.status}. ${step.api.instructions.join(' ')} ${step.api.example || ''}`),
          p(`Kaizen UI path: ${step.kaizen_ui.status}. ${step.kaizen_ui.instructions.join(' ') || 'No clickstream recorded.'}`),
          p(`Expected result: ${step.expected_result}`));
        if (step.historical_observation) blocks.push(p(step.historical_observation));
      }
      blocks.push(p('Limits'), ...recipe.limits.map(li));
    }
    blocks.push(p('Recipe gaps: ' + streams.streams.filter(stream => !stream.recipe).map(stream => stream.id).join(', ') + '.'));
  } else blocks.push(p('No reviewed value-stream recipe projection applies to this publication. The capability reference remains available below.'));
  blocks.push(h(2, 'How to read this kit'),
    li('Use only the evidence status shown for this version. A pre-release assessment, component observation or source declaration does not establish release verification.'),
    li('Keep conditions, limits and unresolved failures with any capability answer. An untested recipe is a gap, not a demonstrated workflow.'),
    p('The complete capability and evidence reference follows. Draft usage suggestions and illustrative cases are excluded from this release-facing document.'));
  blocks.push(h(2, 'Complete capability and evidence reference'),
    ...evidenceDocument(entry, publication, releaseStamps).slice(1));
  return blocks;
}
