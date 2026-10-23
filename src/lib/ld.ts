import { SITE, absoluteUrl } from './routes';

export const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'PARADOX CAT',
  legalName: 'PARADOX CAT GmbH',
  url: SITE,
  logo: absoluteUrl('/brand/logo_paradoxcat_white.png'),
  sameAs: ['https://www.linkedin.com/company/paradoxcat/', 'https://www.instagram.com/paradoxcatgmbh/'],
};

export const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  url: SITE,
  name: 'PARADOX CAT',
  inLanguage: ['en-US', 'de-DE'],
  publisher: { '@id': `${SITE}/#organization` },
};
