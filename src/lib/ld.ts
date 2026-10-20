import { SITE, absoluteUrl } from './routes';

export const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'PARADOX CAT',
  legalName: 'PARADOX CAT GmbH',
  url: SITE,
  logo: absoluteUrl('/brand/logo_paradoxcat_white.png'),
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
