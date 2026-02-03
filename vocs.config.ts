import { defineConfig } from 'vocs'

export default defineConfig({
  title: 'Fira',
  description: 'Fixed-Rate Credit Protocol - Documentation',
  logoUrl: '/logo.svg',
  iconUrl: '/favicon.ico',
  topNav: [
    { text: 'Overview', link: '/overview' },
    { text: 'Dashboard', link: '/dashboard' },
    { text: 'Products', link: '/products/usual-zero-rate-uzr' },
    { text: 'Resources', link: '/resources/whitepaper' },
  ],
  sidebar: [
    {
      text: 'Introduction',
      items: [
        { text: 'Fixed-Rate Credit', link: '/' },
        { text: 'Overview', link: '/overview' },
        { text: 'FAQ', link: '/overview/faq' },
      ],
    },
    {
      text: 'Dashboard',
      items: [
        { text: 'Asset Dashboard', link: '/dashboard' },
        { text: 'Treasury Dashboard', link: '/treasury' },
        { text: 'Usual Analytics', link: '/usual' },
      ],
    },
    {
      text: 'Products',
      items: [
        { text: 'Usual Zero Rate (UZR)', link: '/products/usual-zero-rate-uzr' },
        { text: 'Product Roadmap', link: '/products/product-roadmap' },
      ],
    },
    {
      text: 'Resources & Ecosystem',
      items: [
        { text: 'Whitepaper', link: '/resources/whitepaper' },
        { text: 'UZR Whitepaper', link: '/resources/whitepaper/uzr' },
        { text: 'Contracts & Audits', link: '/resources/contracts-and-audits' },
      ],
    },
    {
      text: 'Risks & Security',
      items: [
        { text: 'Overview', link: '/resources/risks-and-security' },
        { text: 'Interest Rate Risk', link: '/resources/risks-and-security/interest-rate-risk' },
        { text: 'Liquidation Risk', link: '/resources/risks-and-security/liquidation-risk' },
        { text: 'Bad Debt Risk', link: '/resources/risks-and-security/bad-debt-risk' },
        { text: 'Collateral Risk', link: '/resources/risks-and-security/collateral-risk' },
        { text: 'Liquidity Risk', link: '/resources/risks-and-security/liquidity-risk' },
        { text: 'Smart Contract Risk', link: '/resources/risks-and-security/smart-contract-risk' },
      ],
    },
    {
      text: 'Legal',
      items: [
        { text: 'Terms of Use', link: '/legal/terms-of-use' },
        { text: 'Privacy Policy', link: '/legal/privacy-policy' },
      ],
    },
  ],
  socials: [
    {
      icon: 'github',
      link: 'https://github.com/fira-protocol',
    },
    {
      icon: 'x',
      link: 'https://x.com/faboratory',
    },
  ],
})
