// Type declarations for ecosystem-organisms.js

export interface OrganismModel {
  render: (organism: any, container: HTMLElement) => HTMLElement;
}

export interface OrganismModels {
  [key: string]: OrganismModel;
  producer: OrganismModel;
  herbivore: OrganismModel;
  carnivore: OrganismModel;
  omnivore: OrganismModel;
  detritivore: OrganismModel;
  decomposer: OrganismModel;
  deer: OrganismModel;
  wolf: OrganismModel;
  mouse: OrganismModel;
  lizard: OrganismModel;
  rabbit: OrganismModel;
  raccoon: OrganismModel;
  corn: OrganismModel;
  unknown: OrganismModel;
}

export const organismModels: OrganismModels;
