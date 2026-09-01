import { defineEvent, defineResource } from 'nexusengine';
import { defineDomainServiceKit } from 'nexusengine/domain-service-kit';
import {
  applyStoryAction,
  createInitialStoryState,
  hydrateStoryState,
  storySavePayload
} from './story-model.js';

const VERSION = '0.1.0-greybox';
const StoryState = defineResource('atc.story.state');
const StoryChanged = defineEvent('atc.story.changed');
const StoryReset = defineEvent('atc.story.reset');
const StoryLoaded = defineEvent('atc.story.loaded');
const clone = (value) => value === undefined ? undefined : structuredClone(value);

function initialResource() {
  return {
    version: VERSION,
    story: createInitialStoryState(),
    processedOperationIds: [],
    effects: [],
    effectSequence: 0
  };
}

function bounded(values, limit = 512) {
  return values.slice(Math.max(0, values.length - limit));
}

export function createAcrossTheCanopyStoryKit(config = {}) {
  let engineRef = null;
  let apiRef = null;

  function productCoordinatorSystem(world) {
    if (!engineRef || !apiRef) return;
    const activations = engineRef.n.interaction.getDescriptors('activations');
    const processed = new Set(apiRef.getRuntimeState().processedOperationIds);
    const pending = Object.values(activations ?? {})
      .filter((action) => action?.operationId && !processed.has(action.operationId))
      .sort((left, right) => Number(left.sequence ?? 0) - Number(right.sequence ?? 0) || left.operationId.localeCompare(right.operationId));

    for (const action of pending) apiRef.applyAction(action);

    config.coordinator?.({
      engine: engineRef,
      story: apiRef,
      delta: Math.max(0, Number(world.__nexusClock?.delta ?? 0)),
      frame: Number(world.__nexusClock?.frame ?? 0),
      elapsed: Number(world.__nexusClock?.elapsed ?? 0)
    });
  }

  return defineDomainServiceKit({
    id: 'across-the-canopy-story-kit',
    domain: 'product',
    domainPath: 'n:product:across-the-canopy',
    apiName: 'acrossTheCanopy',
    stability: 'game-owned-greybox',
    version: VERSION,
    provides: ['product:across-the-canopy-story'],
    services: ['story-state', 'dialogue', 'clues', 'journal', 'puzzle', 'choice', 'checkpoint', 'coordinator'],
    resources: { StoryState },
    events: { StoryChanged, StoryReset, StoryLoaded },
    systems: [{ phase: 'simulate', name: 'acrossTheCanopyCoordinatorSystem', system: productCoordinatorSystem }],
    metadata: {
      purpose: 'Across the Canopy authored narrative and traversal coordination for The Upward Signal.',
      owns: ['story flags', 'dialogue progress', 'journal', 'puzzle rules', 'choice consequence', 'checkpoint policy', 'game-specific traversal requests'],
      doesNotOwn: ['raw device events', 'object identity', 'world placement', 'camera descriptors', 'UI descriptors', 'render resources'],
      deterministic: true,
      snapshot: true,
      reset: true,
      productOwned: true
    },
    initWorld({ world }) {
      world.setResource(StoryState, initialResource());
    },
    createApi({ world }) {
      const read = () => world.getResource(StoryState);
      const commit = (next, event = StoryChanged, payload = {}) => {
        world.setResource(StoryState, clone(next));
        world.emit(event, { snapshot: clone(next), ...clone(payload) });
        return clone(next);
      };
      const enqueueEffects = (resource, effects = []) => {
        let sequence = resource.effectSequence;
        const records = effects.map((effect) => ({ ...clone(effect), effectId: `atc:effect/${++sequence}` }));
        return { ...resource, effectSequence: sequence, effects: bounded([...resource.effects, ...records]) };
      };

      const api = {
        getState: () => clone(read().story),
        getRuntimeState: () => clone(read()),
        getSnapshot: () => clone(read().story),
        applyAction(action = {}) {
          const operationId = String(action.operationId ?? `local:${read().story.revision + 1}`);
          const resource = read();
          if (resource.processedOperationIds.includes(operationId)) {
            return { accepted: true, duplicate: true, state: clone(resource.story), effects: [] };
          }
          const result = applyStoryAction(resource.story, action);
          const next = enqueueEffects({
            ...resource,
            story: result.state,
            processedOperationIds: bounded([...resource.processedOperationIds, operationId])
          }, result.effects);
          commit(next, StoryChanged, { action: clone(action), accepted: result.accepted, reason: result.reason ?? null });
          return { ...clone(result), operationId };
        },
        applyInternal(action = {}) {
          const result = applyStoryAction(read().story, action);
          const next = enqueueEffects({ ...read(), story: result.state }, result.effects);
          commit(next, StoryChanged, { action: clone(action), internal: true, accepted: result.accepted, reason: result.reason ?? null });
          return clone(result);
        },
        listEffects() {
          return clone(read().effects);
        },
        acknowledgeEffects(effectIds = []) {
          const ids = new Set(effectIds.map(String));
          const resource = read();
          return commit({ ...resource, effects: resource.effects.filter((effect) => !ids.has(effect.effectId)) }, StoryChanged, { acknowledged: [...ids] });
        },
        createSavePayload(player) {
          return storySavePayload(read().story, player);
        },
        loadSavePayload(payload) {
          const resource = initialResource();
          resource.story = hydrateStoryState(payload);
          return commit(resource, StoryLoaded, { schema: payload.schema });
        },
        loadSnapshot(snapshot = {}) {
          const resource = initialResource();
          resource.story = { ...createInitialStoryState(), ...clone(snapshot), mode: 'movement', dialogue: null, traversal: null, navigation: null, choicePrompt: null };
          return commit(resource, StoryLoaded, { source: 'snapshot' });
        },
        reset() {
          return commit(initialResource(), StoryReset);
        }
      };
      apiRef = Object.freeze(api);
      return apiRef;
    },
    install({ engine }) {
      engineRef = engine;
    }
  });
}
