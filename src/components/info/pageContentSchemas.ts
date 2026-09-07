import { PageContentSchema } from './pageContentTypes';

export const PAGE_CONTENT_SCHEMAS: Record<string, PageContentSchema> = {
  about: {
    pageId: 'about',
    label: 'About D-8',
    navLabel: 'About D-8',
    icon: 'globe',
    metaFields: [
      { key: 'title', label: 'Page Title', type: 'textarea', rows: 2 },
      { key: 'subtitle', label: 'Subtitle / Banner Blurb', type: 'textarea', rows: 3 },
      { key: 'intro', label: 'Introduction', type: 'textarea', rows: 4 }
    ],
    sections: [
      {
        key: 'pillars',
        label: 'Strategic Pillars',
        singular: 'Pillar',
        fields: [
          { key: 'title', label: 'Pillar Title', type: 'text' },
          { key: 'detail', label: 'Description', type: 'textarea', rows: 3 }
        ]
      },
      {
        key: 'milestones',
        label: 'Journey Timeline',
        singular: 'Milestone',
        fields: [
          { key: 'year', label: 'Year', type: 'text' },
          { key: 'title', label: 'Milestone Title', type: 'text' },
          { key: 'detail', label: 'Description', type: 'textarea', rows: 3 }
        ]
      }
    ]
  },
  members: {
    pageId: 'members',
    label: 'Member States',
    navLabel: 'Member States',
    icon: 'users',
    metaFields: [
      { key: 'title', label: 'Page Title', type: 'textarea', rows: 2 },
      { key: 'subtitle', label: 'Subtitle / Banner Blurb', type: 'textarea', rows: 3 },
      { key: 'intro', label: 'Introduction', type: 'textarea', rows: 4 }
    ],
    sections: [
      {
        key: 'contributions',
        label: 'Country Spotlights',
        singular: 'Country',
        fields: [
          { key: 'countryCode', label: 'Country Code (e.g. CN-MYS)', type: 'text' },
          { key: 'title', label: 'Country Name', type: 'text' },
          { key: 'detail', label: 'Contribution', type: 'textarea', rows: 3 }
        ]
      }
    ]
  },
  news: {
    pageId: 'news',
    label: 'News & Updates',
    navLabel: 'News & Updates',
    icon: 'newspaper',
    metaFields: [
      { key: 'title', label: 'Page Title', type: 'textarea', rows: 2 },
      { key: 'subtitle', label: 'Subtitle / Banner Blurb', type: 'textarea', rows: 3 }
    ],
    sections: [
      {
        key: 'featured',
        label: 'Featured Announcement',
        singular: 'Featured',
        fields: [
          { key: 'tag', label: 'Tag', type: 'text' },
          { key: 'date', label: 'Date', type: 'text' },
          { key: 'title', label: 'Headline', type: 'text' },
          { key: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 3 }
        ]
      },
      {
        key: 'items',
        label: 'Latest Updates',
        singular: 'Update',
        fields: [
          { key: 'tag', label: 'Tag', type: 'text' },
          { key: 'date', label: 'Date', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 3 }
        ]
      }
    ]
  },
  contact: {
    pageId: 'contact',
    label: 'Contact',
    navLabel: 'Contact',
    icon: 'mail',
    metaFields: [
      { key: 'title', label: 'Page Title', type: 'textarea', rows: 2 },
      { key: 'subtitle', label: 'Subtitle / Banner Blurb', type: 'textarea', rows: 3 }
    ],
    sections: [
      {
        key: 'offices',
        label: 'Regional Offices',
        singular: 'Office',
        fields: [
          { key: 'region', label: 'Region', type: 'text' },
          { key: 'city', label: 'City', type: 'text' },
          { key: 'detail', label: 'Address / Detail', type: 'textarea', rows: 2 }
        ]
      }
    ]
  }
};
