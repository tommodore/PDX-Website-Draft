// Reference and technology brands. Logos live at public/brand/clients/<slug>.svg or .png
// (white, transparent; a text wordmark is the fallback). Set show: false to hide a brand.
// group: 'client' = customers and reference brands, 'tech' = engines and toolkits we build with.
export interface Client {
  slug: string;
  name: string;
  group: 'client' | 'tech';
  show: boolean;
}

export const clients: Client[] = [
  { slug: 'bmw', name: 'BMW', group: 'client', show: true },
  { slug: 'mini', name: 'MINI', group: 'client', show: true },
  { slug: 'rolls-royce', name: 'Rolls-Royce', group: 'client', show: true },
  { slug: 'mercedes-benz', name: 'Mercedes-Benz', group: 'client', show: true },
  { slug: 'porsche', name: 'Porsche', group: 'client', show: true },
  { slug: 'audi', name: 'Audi', group: 'client', show: true },
  { slug: 'byton', name: 'Byton', group: 'client', show: true },
  { slug: 'karma', name: 'Karma', group: 'client', show: true },
  { slug: 'infineon', name: 'Infineon', group: 'client', show: true },
  { slug: 'ccv', name: 'CCV', group: 'client', show: true },
  { slug: 'e-solutions', name: 'e.solutions', group: 'client', show: true },
  { slug: 'idneo', name: 'idneo', group: 'client', show: true },
  { slug: 'unity', name: 'Unity', group: 'tech', show: true },
  { slug: 'epic-games', name: 'Epic Games', group: 'tech', show: true },
  { slug: 'qt-group', name: 'Qt Group', group: 'tech', show: true },
  { slug: 'rightware', name: 'Rightware', group: 'tech', show: true },
];
