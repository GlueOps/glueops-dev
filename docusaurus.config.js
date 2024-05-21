// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

const getGtagID = () => {
  // Get the tracking ID from the environment variable
  const trackingID = process.env.GTAG_ID;

  // Use the tracking ID
  return trackingID || 'YOUR_DEFAULT_TRACKING_ID';
};

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "GlueOps",
  tagline: "Dataops and Devops platform",
  url: process.env.CONFIG_URL || "https://localhost/",
  baseUrl: "/docs",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "https://cdn.glueops.dev/logos/logo.png",
  organizationName: "GlueOps",
  projectName: "website",
  deploymentBranch: "master",
  trailingSlash: false,
  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: [],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve("./sidebars.js"),
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/GlueOps/glueops-dev/blob/main",
          sidebarCollapsed: false,
        },
        theme: {
          customCss: [require.resolve("./src/css/custom.css"), require.resolve("./src/css/helpers.css")],
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.5,
          ignorePatterns: ["/tags/**"],
          filename: "sitemap.xml",
        },
        gtag: {
          trackingID: getGtagID(),
          anonymizeIP: true,
        },
      }),
    ],
  ],

  clientModules: [
    require.resolve("./analytics/analytics.js"),
    require.resolve("./analytics/track-user.js"),
    require.resolve("./analytics/analytics-provider/analytics-provider.js"),
    require.resolve("./analytics/analytics-provider/google-analytics-provider.js"),
    require.resolve("./analytics/analytics-provider/logger-analytics-provider.js"),
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      isAnalyticsLoggerDisplayedInProd: process.env.DISPLAY_ANALYTICS_LOGGER === "TRUE",
      includeClientId:  process.env.INCLUDE_CLIENT_ID === "TRUE",
      colorMode: {
        defaultMode: "dark",
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      metadata: [
        { name: "keywords", content: "devops, dataops, gitops, workflow, glueops," },
        {
          name: "description",
          content:
            "GlueOps simplifies and optimizes your business’s DevOps and DataOps, allowing for efficient management and operation.",
        },
        { name: "og:image", content: "https://cdn.glueops.dev/doc-assets/v1/logos/logo.png" },
      ],
      navbar: {
        title: "GlueOps",
        logo: {
          alt: "GlueOps Logo",
          src: "https://cdn.glueops.dev/logos/logo.png",
          srcDark: "https://cdn.glueops.dev/logos/logo.png",
        },
        items: [
          {
            type: "doc",
            docId: "introduction",
            position: "left",
            label: "Docs",
            analytics: {
              event_name: "docs_event",
              event_category: "Docs",
              event_label: "Docs header event",
            },
          },
          // {
          //   href: "https://aws.amazon.com/marketplace/pp/prodview-mfwjl2qdvhaes?sr=0-1&ref_=beagle&applicationId=AWSMPContessa",
          //   "aria-label": "Purchase DataOps on Amazon Marketplace",
          //   position: "right",
          //   title: "Purchase DataOps on Amazon Marketplace",
          //   label: "Purchase DataOps on Amazon Marketplace",
          //   analytics: {
          //     event_name: "purchase_dataops_event",
          //     event_category: "Purchase",
          //     event_label: "Purchase DataOps header event",
          //   },
          // },
          // {
          //   href: "https://aws.amazon.com/marketplace/pp/prodview-soaz2d3nlms6k?sr=0-2&ref_=beagle&applicationId=AWSMPContessa",
          //   "aria-label": "Purchase DevOps on Amazon Marketplace",
          //   position: "right",
          //   title: "Purchase DevOps on Amazon Marketplace",
          //   label: "Purchase DevOps on Amazon Marketplace",
          //   analytics: {
          //     event_name: "purchase_devops_event",
          //     event_category: "Purchase",
          //     event_label: "Purchase DevOps header event",
          //   },
          // },
          {
            href: "https://github.com/GlueOps/glueops-dev",
            className: "header-github-link",
            "aria-label": "GitHub repository",
            position: "right",
            title: "GlueOps on Github",
            analytics: {
              event_name: "github_event",
              event_category: "GitHub",
              event_label: "GitHub header event",
            },
          },
        ],
        hideOnScroll: true,
      },
      footer: {
        links: [
          {
            title: "Address",
            items: [
              {
                html: `
                    <p>
                    GlueOps, LLC<br>
                    35 N Franklin Ave<br>
                    Ste 687 2062<br>
                    Pinedale, WY 82941
                    </p>
                  `,
              },
            ],
          },
          {
            title: "Resources",
            items: [
              {
                label: "Docs",
                to: "/docs/introduction",
                analytics: {
                  event_name: "docs_event",
                  event_category: "Docs",
                  event_label: "Docs footer event",
                },
              },
            ],
          },
          
        ],
        copyright: `©2023 GlueOps, LLC.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
