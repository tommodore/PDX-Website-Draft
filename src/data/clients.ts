// Reference and partner brands. Drop an official SVG at public/brand/clients/<slug>.svg
// (white or single-color, transparent) to replace the text wordmark. Set show: false to hide a brand.
export interface Client {
  slug: string;
  name: string;
  show: boolean;
}

export const clients: Client[] = [
  { slug: 'bmw', name: 'BMW', show: true },
  { slug: 'mini', name: 'MINI', show: true },
  { slug: 'rolls-royce', name: 'Rolls-Royce', show: true },
  { slug: 'mercedes-benz', name: 'Mercedes-Benz', show: true },
  { slug: 'porsche', name: 'Porsche', show: true },
  { slug: 'audi', name: 'Audi', show: true },
];
