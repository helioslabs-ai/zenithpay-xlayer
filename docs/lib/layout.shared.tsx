import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { ZpDocsLogoMark } from '@/components/zp-docs-logo-mark';

function DocsBrandTitle() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <ZpDocsLogoMark />
      <span>ZenithPay</span>
    </span>
  );
}

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: 'zenith-hq',
  repo: 'zenithpay-buildx',
  branch: 'main',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <DocsBrandTitle />,
      url: '/docs',
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
